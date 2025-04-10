import os
import time
import queue
import numpy as np
import sounddevice as sd
import wave
import tempfile
import asyncio
from groq import Groq
from fastapi import HTTPException, UploadFile
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        self.recording = False
        self.audio_queue = queue.Queue()
        self.full_audio = []
        self.sample_rate = 16000
        self.temp_dir = tempfile.mkdtemp()
        self.segment_duration = 10  # 10 seconds per segment
        self.segment_counter = 0
        self.current_segment_audio = []
        self.stream = None
        self.session_dir = None  # Initialized per session
        self.client = Groq()
        self.transcription_text = ""
        self.history = []  # List of dicts: {"filename": str, "audio_path": str, "transcription": str, "timestamp": str}
        self.real_time_transcriptions = []  # List of transcriptions for current recording session
        self.transcription_language = "fr"  # Default language is French

    def _ensure_session_dir(self):
        if not self.session_dir:
            self.session_dir = os.path.join("recordings", time.strftime("%Y%m%d_%H%M%S"))
            os.makedirs(self.session_dir, exist_ok=True)
        return self.session_dir

    async def save_uploaded_file(self, file: UploadFile):
        """Save an uploaded audio file to the session directory."""
        try:
            session_dir = self._ensure_session_dir()
            filename = file.filename if file.filename else f"uploaded_{time.strftime('%H%M%S')}.wav"
            audio_path = os.path.join(session_dir, filename)
            with open(audio_path, "wb") as f:
                content = await file.read()
                f.write(content)
            logger.debug(f"Saved uploaded file to: {audio_path}")
            return audio_path
        except Exception as e:
            logger.error(f"Error saving uploaded file: {e}")
            raise HTTPException(status_code=500, detail=f"Error saving uploaded file: {str(e)}")

    def audio_callback(self, indata, frames, time_info, status):
        if status:
            print(f"Audio error: {status}")
        audio_data = indata.copy()
        self.audio_queue.put(audio_data)
        self.full_audio.append(audio_data)
        self.current_segment_audio.append(audio_data)
        # Check if we've collected 10 seconds of audio
        segment_samples = self.sample_rate * self.segment_duration
        if len(self.current_segment_audio) * frames >= segment_samples:
            asyncio.run(self.process_segment())

    async def process_segment(self):
        """Process and transcribe a 10-second audio segment."""
        if not self.current_segment_audio:
            return
        segment_audio = np.concatenate(self.current_segment_audio, axis=0)
        self.current_segment_audio = []  # Reset for next segment
        self.segment_counter += 1
        temp_filename = os.path.join(self.temp_dir, f"segment_{self.segment_counter}.wav")
        
        # Save segment to temporary file
        with wave.open(temp_filename, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes((segment_audio * 32767).astype(np.int16).tobytes())
        
        # Transcribe segment
        transcription = await self.analyze_audio_file(temp_filename, self.transcription_language)
        self.real_time_transcriptions.append({
            "segment": self.segment_counter,
            "transcription": transcription,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        logger.debug(f"Transcribed segment {self.segment_counter}: {transcription[:50]}...")

        # Clean up temporary file
        os.remove(temp_filename)

    async def start_recording(self):
        """Start real-time audio recording."""
        logger.debug(f"Start recording called, current recording state: {self.recording}")
        if self.recording:
            logger.warning("Already recording, rejecting request")
            raise HTTPException(status_code=400, detail="Already recording")
        try:
            self.recording = True
            self.full_audio = []
            self.current_segment_audio = []
            self.segment_counter = 0
            self.real_time_transcriptions = []  # Reset real-time transcriptions
            self.session_dir = None  # Reset session_dir for a new recording session
            self._ensure_session_dir()  # Create a new session directory
            self.stream = sd.InputStream(
                channels=1,
                samplerate=self.sample_rate,
                callback=self.audio_callback
            )
            self.stream.start()
            logger.debug("Recording started successfully")
            return {"message": "Recording started"}
        except Exception as e:
            self.recording = False
            logger.error(f"Error starting recording: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error starting recording: {str(e)}")

    async def stop_recording(self):
        logger.debug("Stopping recording...")
        if not self.recording:
            logger.error("Not recording")
            raise HTTPException(status_code=400, detail="Not recording")
        try:
            self.stream.stop()
            self.stream.close()
            logger.debug("Stream stopped, saving audio...")
            # Process any remaining audio in the segment
            if self.current_segment_audio:
                await self.process_segment()
            audio_path = await self.save_audio(f"recording_{time.strftime('%H%M%S')}.wav")
            logger.debug(f"Audio saved at {audio_path}, transcribing full audio...")
            transcription = await self.analyze_audio_file(audio_path, self.transcription_language)
            logger.debug("Transcription completed")
            self.transcription_text = transcription
            # Store in history
            filename = os.path.basename(audio_path)
            self.history.append({
                "filename": filename,
                "audio_path": audio_path,
                "transcription": transcription,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            })
            return {"audio_path": audio_path, "transcription": transcription}
        except Exception as e:
            logger.error(f"Error during recording stop: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error during recording stop: {str(e)}")
        finally:
            self.recording = False
            logger.debug("Recording state reset")
            if hasattr(self, 'stream') and self.stream:
                try:
                    self.stream.stop()
                    self.stream.close()
                except Exception as e:
                    logger.error(f"Error closing stream: {str(e)}")

    async def save_audio(self, filename):
        """Save recorded audio to a WAV file."""
        if not self.full_audio:
            raise HTTPException(status_code=400, detail="No audio recorded")
        audio_path = os.path.join(self._ensure_session_dir(), filename)
        audio_np = np.concatenate(self.full_audio, axis=0)
        with wave.open(audio_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            wf.writeframes((audio_np * 32767).astype(np.int16).tobytes())
        self.full_audio = []  # Clear after saving
        logger.debug(f"Saved audio to: {audio_path}")
        return audio_path

    async def transcribe_audio_file(self, audio_path):
        """Transcribe an uploaded audio file and store in history."""
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail="Audio file not found")
        transcription = await self.analyze_audio_file(audio_path, self.transcription_language)
        self.transcription_text = transcription
        # Store in history
        filename = os.path.basename(audio_path)
        self.history.append({
            "filename": filename,
            "audio_path": audio_path,
            "transcription": transcription,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        })
        logger.debug(f"Transcribed and added to history: {audio_path}")
        return {"transcription": transcription}

    async def analyze_audio_file(self, audio_path, language="fr"):
        """Send audio file to Groq API for transcription.
        
        Args:
            audio_path: Path to the audio file
            language: Language code for transcription ("en" or "fr")
        """
        try:
            with open(audio_path, 'rb') as audio_file:
                transcription = self.client.audio.transcriptions.create(
                    file=audio_file,
                    model="whisper-large-v3",
                    response_format="verbose_json",
                    language=language
                )
            transcription_text = ""
            for segment in transcription.segments:
                start_str = time.strftime('%M:%S', time.gmtime(segment["start"])) + f'.{int((segment["start"] % 1) * 1000):03d}'
                end_str = time.strftime('%M:%S', time.gmtime(segment["end"])) + f'.{int((segment["end"] % 1) * 1000):03d}'
                transcription_text += f"[{start_str} → {end_str}] {segment['text']}\n"
            return transcription_text
        except Exception as e:
            logger.error(f"Transcription error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Transcription error: {str(e)}")

    async def get_history(self):
        """Return the history of uploaded files and transcriptions."""
        logger.debug("Returning history")
        return {"history": self.history}

    async def get_real_time_transcription(self):
        """Return the real-time transcriptions for the current recording session."""
        logger.debug("Returning real-time transcriptions")
        return {"transcriptions": self.real_time_transcriptions}

    async def get_latest_transcription(self):
        """Return the latest transcription."""
        if not self.transcription_text:
            raise HTTPException(status_code=404, detail="No transcription available")
        return {"transcription": self.transcription_text}