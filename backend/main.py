from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from chat import handle_chat_query
from transcription import TranscriptionService
from summarization import summarize_audit_transcription
from report_generator import AuditReportGenerator
from report_generator_en import AuditReportGenerator as AuditReportGeneratorEN
import os
import time

app = FastAPI()
transcription_service = TranscriptionService()
report_generator = AuditReportGenerator()

# Serve static files from the "recordings" directory
app.mount("/recordings", StaticFiles(directory="recordings"), name="recordings")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/start_recording")
async def start_recording(language: str = "fr"):
    # Set the transcription language
    transcription_service.transcription_language = language
    return await transcription_service.start_recording()

@app.post("/stop_recording")
async def stop_recording():
    return await transcription_service.stop_recording()

@app.post("/upload_audio")
async def upload_audio(file: UploadFile = File(...), language: str = "fr"):
    # Set the transcription language
    transcription_service.transcription_language = language
    # Use TranscriptionService to save and transcribe the uploaded file
    audio_path = await transcription_service.save_uploaded_file(file)
    transcription_data = await transcription_service.transcribe_audio_file(audio_path)
    return {
        "audio_path": audio_path,
        "transcription": transcription_data["transcription"],
        "filename": file.filename,
        "language": language
    }

@app.get("/transcription/{audio_path:path}")
async def get_transcription_by_path(audio_path: str):
    for item in transcription_service.history:
        if item["audio_path"] == audio_path:
            return {"transcription": item["transcription"]}
    raise HTTPException(status_code=404, detail="Transcription not found")

@app.get("/history")
async def get_history():
    history = await transcription_service.get_history()
    print("History data:", history)
    return history

@app.get("/real_time_transcription")
async def get_real_time_transcription():
    return await transcription_service.get_real_time_transcription()

@app.post("/set_transcription_language")
async def set_transcription_language(data: dict):
    language = data.get("language", "fr")
    if language not in ["en", "fr"]:
        raise HTTPException(status_code=400, detail="Language must be 'en' or 'fr'")
    transcription_service.transcription_language = language
    return {"message": f"Transcription language set to {language}"}

@app.post("/summarize")
async def summarize(language: str = "fr", data: dict = Body(...)):
    transcription = data.get("transcription", "")
    if not transcription:
        raise HTTPException(status_code=400, detail="Transcription is required")
    return await summarize_audit_transcription(transcription, language=language)

@app.post("/generate_report")
async def generate_report(data: dict = Body(...)):
    output_path = os.path.join("recordings", f"report_{time.strftime('%H%M%S')}.pdf")
    report_language = data.get("language", "fr")

    if report_language == "en":
        report_gen = AuditReportGeneratorEN()
    else:
        report_gen = AuditReportGenerator()

    await report_gen.create_report(output_path, data)
    return FileResponse(output_path, filename="audit_report.pdf")

@app.post("/chat")
async def chat_endpoint(data: dict):
    question = data.get("question", "")
    context = data.get("context", {})
    chat_history = data.get("chat_history", [])
    return await handle_chat_query(question, context, chat_history)

# Ensure the recordings directory exists
if not os.path.exists("recordings"):
    os.makedirs("recordings")