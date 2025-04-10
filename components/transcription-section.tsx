"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { showToast } from "@/lib/utils"
import { ApiService } from "@/lib/api-service"

interface TranscriptionSectionProps {
  updateStatus: (message: string, type?: string) => void
  t: (key: string) => string
  isActive: boolean
}

interface AudioPlayer {
  visible: boolean;
  src: string | null;
}

interface AudioPlayers {
  recordedAudio: AudioPlayer;
  loadedAudio: AudioPlayer;
  uploadedAudio: AudioPlayer;
}

export default function TranscriptionSection({ updateStatus, t, isActive }: TranscriptionSectionProps) {
  const [activeTab, setActiveTab] = useState("recording-tab")
  const [activeTranscriptionTab, setActiveTranscriptionTab] = useState("realtime-tab")
  const [isRecording, setIsRecording] = useState(false)
  const [transcription, setTranscription] = useState("")
  const [realTimeTranscription, setRealTimeTranscription] = useState("")
  const [transcriptionLanguage, setTranscriptionLanguage] = useState("fr")
  const [uploadLanguage, setUploadLanguage] = useState("fr")
  const [fileName, setFileName] = useState("No file selected")
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null)
  const [isTranscriptionExpanded, setIsTranscriptionExpanded] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const transcriptionRef = useRef<HTMLTextAreaElement>(null)
  const realTimeTranscriptionRef = useRef<HTMLDivElement>(null)
  const recordedAudioRef = useRef<HTMLAudioElement>(null)
  const loadedAudioRef = useRef<HTMLAudioElement>(null)
  const uploadedAudioRef = useRef<HTMLAudioElement>(null)

  const [audioPlayers, setAudioPlayers] = useState<AudioPlayers>({
    recordedAudio: { visible: false, src: null },
    loadedAudio: { visible: false, src: null },
    uploadedAudio: { visible: false, src: null },
  })

  let transcriptionInterval: NodeJS.Timeout | null = null
  let lastSegmentCount = 0

  useEffect(() => {
    // Check for loaded transcription and audio when component becomes active
    if (isActive) {
      const loadedTranscription = localStorage.getItem('loadedTranscription')
      const loadedAudioPath = localStorage.getItem('loadedAudioPath')
      const storedAudioPlayerState = localStorage.getItem('audioPlayerState')

      if (loadedTranscription) {
        setTranscription(loadedTranscription)
      }

      if (storedAudioPlayerState) {
        setAudioPlayers(JSON.parse(storedAudioPlayerState))
      }

      // Clear the stored data after loading
      localStorage.removeItem('loadedTranscription')
      localStorage.removeItem('loadedAudioPath')
      localStorage.removeItem('audioPlayerState')
    }

    return () => {
      if (transcriptionInterval) {
        clearInterval(transcriptionInterval)
      }
    }
  }, [isActive])

  const startRecording = async () => {
    updateStatus("startingRecording", "loading")
    try {
      const data = await ApiService.startRecording(transcriptionLanguage)
      updateStatus("recordingInProgress", "loading")
      setIsRecording(true)
      lastSegmentCount = 0
      setRealTimeTranscription("")

      // Hide all audio players when starting a new recording
      setAudioPlayers({
        recordedAudio: { visible: false, src: null },
        loadedAudio: { visible: false, src: null },
        uploadedAudio: { visible: false, src: null },
      })

      transcriptionInterval = setInterval(fetchRealTimeTranscription, 10000)
      fetchRealTimeTranscription()
    } catch (error: any) {
      updateStatus(`Error: ${error.message}`, "error")
    }
  }

  const stopRecording = async () => {
    if (!isRecording) {
      updateStatus("notCurrentlyRecording", "error")
      return
    }
    try {
      updateStatus("processingRecording", "loading")
      const data = await ApiService.stopRecording()
      setTranscription(data.transcription)

      // Store the transcription in localStorage for other components to access
      localStorage.setItem("currentTranscription", data.transcription)

      // Show only the recorded audio player and hide others
      setAudioPlayers({
        recordedAudio: { visible: true, src: data.audio_path || null },
        loadedAudio: { visible: false, src: null },
        uploadedAudio: { visible: false, src: null },
      })

      updateStatus("recordingStopped")

      // Clear interval
      if (transcriptionInterval) {
        clearInterval(transcriptionInterval)
        transcriptionInterval = null
      }

      // Update recording state after successful API call and cleanup
      setIsRecording(false)
    } catch (error: any) {
      // Keep recording state true if there's an error
      updateStatus(`Error: ${error.message}`, "error")
    }
  }

  const uploadAudio = async () => {
    if (!uploadedAudioFile) {
      updateStatus("pleaseSelectAudio", "error")
      return
    }
    updateStatus("uploadingAudio", "loading")
    try {
      const data = await ApiService.uploadAudio(uploadedAudioFile, uploadLanguage)
      setTranscription(data.transcription)

      // Store the transcription in localStorage for other components to access
      localStorage.setItem("currentTranscription", data.transcription)

      // Show only the uploaded audio player and hide others
      // Update the audio source to use the server-side path
      setAudioPlayers({
        recordedAudio: { visible: false, src: null },
        loadedAudio: { visible: false, src: null },
        uploadedAudio: { visible: true, src: data.audio_path || null },
      })
      
      // Revoke the temporary URL since we now have the server path
      if (audioPlayers.uploadedAudio.src && audioPlayers.uploadedAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayers.uploadedAudio.src)
      }

      updateStatus("transcriptionReady")
    } catch (error: any) {
      updateStatus(`Error: ${error.message}`, "error")
    }
  }

  const fetchRealTimeTranscription = async () => {
    if (!isRecording) return
    try {
      const data = await ApiService.getRealTimeTranscription()
      if (data.transcriptions && data.transcriptions.length > 0) {
        const transcriptions = data.transcriptions
        // Process all segments and update display
        const allText = transcriptions
          .map(segment => segment.transcription || '')
          .filter(text => text.trim() !== '')
          .join('\n')

        if (allText) {
          setRealTimeTranscription(allText)
          lastSegmentCount = transcriptions.length

          // Scroll to bottom after state update
          setTimeout(() => {
            if (realTimeTranscriptionRef.current) {
              realTimeTranscriptionRef.current.scrollTop = realTimeTranscriptionRef.current.scrollHeight
            }
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error fetching real-time transcription:", error)
      updateStatus("Error fetching real-time transcription", "error")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      setFileName(files[0].name)
      setUploadedAudioFile(files[0])

      // Show only the uploaded audio player with a temporary URL for preview
      const tempUrl = URL.createObjectURL(files[0])
      setAudioPlayers({
        recordedAudio: { visible: false, src: null },
        loadedAudio: { visible: false, src: null },
        uploadedAudio: { visible: true, src: tempUrl },
      })
      
      // Revoke previous object URL if it exists to prevent memory leaks
      if (audioPlayers.uploadedAudio.src && audioPlayers.uploadedAudio.src.startsWith('blob:')) {
        URL.revokeObjectURL(audioPlayers.uploadedAudio.src)
      }
    } else {
      setFileName("No file selected")
      setUploadedAudioFile(null)
    }
  }

  const toggleTranscriptionExpand = () => {
    setIsTranscriptionExpanded(!isTranscriptionExpanded)
  }

  const copyTranscription = () => {
    if (transcriptionRef.current) {
      const fullText = transcription

      // Create a temporary textarea to hold the full text for copying
      const tempTextarea = document.createElement("textarea")
      tempTextarea.value = fullText
      tempTextarea.style.position = "fixed"
      tempTextarea.style.opacity = "0"
      document.body.appendChild(tempTextarea)
      tempTextarea.select()

      try {
        document.execCommand("copy")
        document.body.removeChild(tempTextarea)
        updateStatus("transcriptionCopied", "success")
        showToast("Full transcription copied to clipboard")
      } catch (err) {
        document.body.removeChild(tempTextarea)
        updateStatus("failedToCopyTranscription", "error")
      }
    }
  }

  return (
    <section id="transcription-section" className={`content-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <h2>
          <i className="fas fa-file-alt"></i> <span>{t("transcription")}</span>
        </h2>
        <p>{t("viewTranscriptions")}</p>
      </div>

      <div className="transcription-layout">
        {/* Left panel: Controls and Audio Players */}
        <div className="transcription-sidebar">
          {/* Tabbed interface for controls */}
          <div className="control-tabs">
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === "recording-tab" ? "active" : ""}`}
                onClick={() => setActiveTab("recording-tab")}
              >
                <i className="fas fa-microphone"></i> <span>Recording</span>
              </button>
              <button
                className={`tab-button ${activeTab === "upload-tab" ? "active" : ""}`}
                onClick={() => setActiveTab("upload-tab")}
              >
                <i className="fas fa-upload"></i> <span>Upload</span>
              </button>
              <button
                className={`tab-button ${activeTab === "audio-tab" ? "active" : ""}`}
                onClick={() => setActiveTab("audio-tab")}
              >
                <i className="fas fa-headphones"></i> <span>Audio</span>
              </button>
            </div>

            {/* Recording Tab */}
            <div id="recording-tab" className={`tab-content ${activeTab === "recording-tab" ? "active" : ""}`}>
              <div className="control-group compact">
                <div className="transcription-language compact">
                  <h4>
                    <i className="fas fa-language"></i> <span>Language</span>
                  </h4>
                  <div className="language-options transcription-language-options">
                    <div
                      className={`language-option ${transcriptionLanguage === "fr" ? "active" : ""}`}
                      onClick={() => setTranscriptionLanguage("fr")}
                    >
                      <span>FR</span>
                    </div>
                    <div
                      className={`language-option ${transcriptionLanguage === "en" ? "active" : ""}`}
                      onClick={() => setTranscriptionLanguage("en")}
                    >
                      <span>EN</span>
                    </div>
                  </div>
                </div>
                <div className="button-group">
                  <button
                    className="btn btn-primary"
                    id="startRecordingBtn"
                    onClick={startRecording}
                    disabled={isRecording}
                  >
                    <i className="fas fa-microphone"></i> <span>Start</span>
                  </button>
                  <button
                    className="btn btn-warning"
                    id="stopRecordingBtn"
                    onClick={stopRecording}
                    disabled={!isRecording}
                  >
                    <i className="fas fa-stop-circle"></i> <span>Stop</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Upload Tab */}
            <div id="upload-tab" className={`tab-content ${activeTab === "upload-tab" ? "active" : ""}`}>
              <div className="control-group">
                <div className="transcription-language compact">
                  <h4>
                    <i className="fas fa-language"></i> <span>{t("transcriptionLanguage") || "Language"}</span>
                  </h4>
                  <div className="language-options transcription-language-options">
                    <div
                      className={`language-option ${uploadLanguage === "fr" ? "active" : ""}`}
                      onClick={() => setUploadLanguage("fr")}
                    >
                      <span>FR</span>
                    </div>
                    <div
                      className={`language-option ${uploadLanguage === "en" ? "active" : ""}`}
                      onClick={() => setUploadLanguage("en")}
                    >
                      <span>EN</span>
                    </div>
                  </div>
                </div>
                <div className="file-input-wrapper">
                  <label htmlFor="audioFile" className="file-label">
                    <i className="fas fa-cloud-upload-alt"></i> <span>{t("chooseFile") || "Choose File"}</span>
                  </label>
                  <input type="file" id="audioFile" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} />
                  <div className="file-name" id="fileName">
                    {fileName === "No file selected" ? t("noFileSelected") || "No file selected" : fileName}
                  </div>
                </div>
                <button className="btn btn-success" id="uploadBtn" onClick={uploadAudio}>
                  <i className="fas fa-upload"></i> <span>{t("upload") || "Upload"}</span>
                </button>
              </div>
            </div>

            {/* Audio Players Tab */}
            <div id="audio-tab" className={`tab-content ${activeTab === "audio-tab" ? "active" : ""}`}>
              <div className="audio-players-compact">
                <div
                  className={`audio-player ${audioPlayers.recordedAudio.visible ? "" : "hidden"}`}
                  id="recordedAudioPlayer"
                >
                  <h4>
                    <i className="fas fa-microphone-alt"></i> <span>{t("recordedAudio") || "Recorded Audio"}</span>
                  </h4>
                  <audio controls id="recordedAudio" ref={recordedAudioRef}>
                    {audioPlayers.recordedAudio.src && (
                      <source
                        id="recordedAudioSource"
                        src={audioPlayers.recordedAudio.src}
                        type="audio/wav"
                      />
                    )}
                    Your browser does not support the audio element.
                  </audio>
                </div>
                <div
                  className={`audio-player ${audioPlayers.loadedAudio.visible ? "" : "hidden"}`}
                  id="loadedAudioPlayer"
                >
                  <h4>
                    <i className="fas fa-file-audio"></i> <span>{t("loadedAudio") || "Loaded Audio"}</span>
                  </h4>
                  <audio controls id="loadedAudio" ref={loadedAudioRef}>
                    {audioPlayers.loadedAudio.src && (
                      <source id="loadedAudioSource" src={audioPlayers.loadedAudio.src} type="audio/wav" />
                    )}
                    Your browser does not support the audio element.
                  </audio>
                </div>
                <div
                  className={`audio-player ${audioPlayers.uploadedAudio.visible ? "" : "hidden"}`}
                  id="uploadedAudioPlayer"
                >
                  <h4>
                    <i className="fas fa-cloud-upload-alt"></i> <span>{t("uploadedAudio") || "Uploaded Audio"}</span>
                  </h4>
                  <audio controls id="uploadedAudio" ref={uploadedAudioRef}>
                    {audioPlayers.uploadedAudio.src && (
                      <source
                        id="uploadedAudioSource"
                        src={audioPlayers.uploadedAudio.src?.startsWith('blob:') ? audioPlayers.uploadedAudio.src : `/recordings/${audioPlayers.uploadedAudio.src}`}
                        type={uploadedAudioFile?.type || "audio/wav"}
                      />
                    )}
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right panel: Transcriptions */}
        <div className="transcription-content">
          {/* Tabbed interface for transcriptions */}
          <div className="transcription-tabs">
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTranscriptionTab === "realtime-tab" ? "active" : ""}`}
                onClick={() => setActiveTranscriptionTab("realtime-tab")}
              >
                <i className="fas fa-bolt"></i> <span>Real-time</span>
              </button>
              <button
                className={`tab-button ${activeTranscriptionTab === "full-tab" ? "active" : ""}`}
                onClick={() => setActiveTranscriptionTab("full-tab")}
              >
                <i className="fas fa-file-alt"></i> <span>Full</span>
              </button>
            </div>

            {/* Real-time Transcription Tab */}
            <div
              id="realtime-tab"
              className={`tab-content ${activeTranscriptionTab === "realtime-tab" ? "active" : ""}`}
            >
              <div className="card transcription-container">
                <div
                  id="realTimeTranscription"
                  className={`transcription-box ${!realTimeTranscription ? "empty-state" : ""}`}
                  ref={realTimeTranscriptionRef}
                >
                  {realTimeTranscription || "Real-time transcription will appear here..."}
                </div>
              </div>
            </div>

            {/* Full Transcription Tab */}
            <div id="full-tab" className={`tab-content ${activeTranscriptionTab === "full-tab" ? "active" : ""}`}>
              <div className="card transcription-container">
                <div className="transcription-wrapper">
                  <div className="textarea-container">
                    <textarea
                      id="transcription"
                      className={`transcription-box ${isTranscriptionExpanded ? "expanded" : ""}`}
                      placeholder="Full transcription will appear here..."
                      value={transcription}
                      readOnly
                      ref={transcriptionRef}
                      style={
                        {
                          maxHeight: isTranscriptionExpanded ? "none" : "120px",
                          "--after-opacity": isTranscriptionExpanded ? "0" : "1",
                        } as React.CSSProperties
                      }
                    ></textarea>
                    <button
                      className="btn btn-icon copy-btn transcription-copy-btn"
                      onClick={copyTranscription}
                      title="Copy to clipboard"
                    >
                      <i className="fas fa-copy"></i> <span className="copy-text">Copy</span>
                    </button>
                  </div>
                  <button
                    id="transcription-expand-btn"
                    className={`btn expand-btn ${isTranscriptionExpanded ? "active" : ""}`}
                    onClick={toggleTranscriptionExpand}
                  >
                    {isTranscriptionExpanded ? (
                      <>
                        <i className="fas fa-compress-alt"></i> <span>Collapse</span>
                      </>
                    ) : (
                      <>
                        <i className="fas fa-expand-alt"></i> <span>View Details</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
