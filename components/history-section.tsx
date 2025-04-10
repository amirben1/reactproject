"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { showToast } from "@/lib/utils"
import { ApiService } from "@/lib/api-service"

interface HistoryItem {
  filename: string
  timestamp: string
  audio_path: string
  transcription: string
}

interface HistorySectionProps {
  updateStatus: (message: string, type?: string) => void
  t: (key: string) => string
  setActiveTab: (tab: "transcription-section" | "history" | "summary" | "assistant") => void
  isActive: boolean
}

export default function HistorySection({ updateStatus, t, setActiveTab, isActive }: HistorySectionProps) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (isActive) {
      fetchHistory()
    }
  }, [isActive])

  const fetchHistory = async () => {
    try {
      const data = await ApiService.getHistory()
      setHistory(data.history || [])
    } catch (error) {
      console.error("History update error:", error)
    }
  }

  const toggleTranscriptionExpand = (index: number) => {
    setExpandedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }))
  }

  const loadTranscriptionFromHistory = async (audioPath: string, transcription: string) => {
    if (!audioPath) {
      showToast("Audio path not available")
      console.error("No audio path provided")
      return
    }

    updateStatus("Loading transcription...", "loading")
    try {
      // Store the transcription and audio path in localStorage
      localStorage.setItem("loadedTranscription", transcription)
      localStorage.setItem("currentTranscription", transcription)
      localStorage.setItem("loadedAudioPath", audioPath)
      
      // Store the audio player state
      localStorage.setItem("audioPlayerState", JSON.stringify({
        recordedAudio: { visible: false, src: null },
        loadedAudio: { visible: true, src: audioPath.split("/").pop() },
        uploadedAudio: { visible: false, src: null }
      }))

      // Notify the user
      updateStatus("Transcription loaded successfully")
      showToast("Transcription loaded from history")

      // Switch to the transcription tab
      setActiveTab("transcription-section")
    } catch (error: any) {
      updateStatus(`Error: ${error.message}`, "error")
      showToast(`Error: ${error.message}`)
    }
  }

  return (
    <section id="history" className={`content-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <h2>
          <i className="fas fa-history"></i> <span>{t("history")}</span>
        </h2>
        <p>{t("previousRecordings")}</p>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>Previous Sessions</h3>
          <div className="card-actions">
            <button className="btn btn-icon" onClick={fetchHistory} title="Refresh history">
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
        <div className="card-body">
          <div id="historyList" className="history-list">
            {history.length === 0 ? (
              <div className="empty-state">
                <p>No history available</p>
              </div>
            ) : (
              history.map((item, index) => {
                const isExpanded = expandedItems[index] || false
                const truncatedText =
                  item.transcription.length > 500 ? item.transcription.substring(0, 500) + "..." : item.transcription

                return (
                  <div className="history-item" key={index} data-index={index}>
                    <div className="history-item-header">
                      <span className="history-item-filename">
                        <i className="fas fa-file-audio"></i> {item.filename || "Recording"}
                      </span>
                      <span className="history-item-timestamp">
                        <i className="fas fa-clock"></i> {item.timestamp || new Date().toLocaleString()}
                      </span>
                    </div>
                    <div className="history-item-path">{item.audio_path || "N/A"}</div>
                    <div
                      className={`history-item-transcription ${isExpanded ? "expanded" : ""}`}
                      style={
                        {
                          maxHeight: isExpanded ? "none" : "120px",
                          "--after-opacity": isExpanded ? "0" : "1",
                        } as React.CSSProperties
                      }
                    >
                      {isExpanded ? item.transcription : truncatedText}
                    </div>
                    <div className="history-item-actions">
                      <button
                        className={`expand-btn ${isExpanded ? "active" : ""}`}
                        onClick={() => toggleTranscriptionExpand(index)}
                      >
                        {isExpanded ? (
                          <>
                            <i className="fas fa-compress-alt"></i> Collapse
                          </>
                        ) : (
                          <>
                            <i className="fas fa-expand-alt"></i> View Details
                          </>
                        )}
                      </button>
                      <button
                        className="load-btn"
                        onClick={() => loadTranscriptionFromHistory(item.audio_path, item.transcription)}
                      >
                        <i className="fas fa-clipboard-check"></i> Load Transcription
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
