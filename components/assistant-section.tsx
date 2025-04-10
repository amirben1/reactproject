"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ApiService } from "@/lib/api-service"

interface ChatMessage {
  type: "user" | "bot" | "loading" | "error"
  content: string
  id?: string
}

interface AssistantSectionProps {
  t: (key: string) => string
  isActive: boolean
}

export default function AssistantSection({ t, isActive }: AssistantSectionProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: "bot",
      content: "Hello! I'm your audit assistant. Ask me questions about your audit data and I'll help analyze it.",
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [chatHistory, setChatHistory] = useState<string[]>([])

  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Scroll to bottom when messages change
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }

    // Focus input on initial render
    if (inputRef.current && isActive) {
      inputRef.current.focus()
    }
  }, [messages, isActive])

  const sendMessage = async () => {
    const question = inputValue.trim()
    if (!question) return

    // Add user message
    setMessages((prev) => [...prev, { type: "user", content: question }])

    // Add loading message
    const loadingId = Date.now().toString()
    setMessages((prev) => [...prev, { type: "loading", content: "", id: loadingId }])

    // Clear input
    setInputValue("")

    try {
      // Get context from localStorage or other sources
      const context = {
        transcription: localStorage.getItem("currentTranscription") || "",
        summary: localStorage.getItem("currentSummary") || "",
        non_conformities: localStorage.getItem("nonConformitiesCount") || "0",
        processes: localStorage.getItem("processesList") || "",
      }

      const data = await ApiService.sendChatMessage(question, context, chatHistory)

      // Update chat history
      setChatHistory((prev) => [...prev, `User: ${question}`, `Assistant: ${data.response}`])

      // Replace loading message with bot response
      setMessages((prev) => prev.map((msg) => (msg.id === loadingId ? { type: "bot", content: data.response } : msg)))
    } catch (error: any) {
      // Replace loading message with error
      setMessages((prev) =>
        prev.map((msg) => (msg.id === loadingId ? { type: "error", content: `Error: ${error.message}` } : msg)),
      )
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      sendMessage()
    }
  }

  return (
    <section id="assistant" className={`content-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <h2>
          <i className="fas fa-robot"></i> <span>{t("aiAssistant")}</span>
        </h2>
        <p>{t("askQuestions")}</p>
      </div>

      <div className="card chat-card">
        <div className="card-header">
          <h3>Chat with Assistant</h3>
        </div>
        <div className="chat-container">
          <div className="chat-messages" ref={chatMessagesRef}>
            {messages.map((message, index) => (
              <div key={index} className={`chat-message ${message.type} ${index === 0 ? "welcome" : ""}`}>
                <div className="message-content">
                  {message.type === "bot" && <i className="fas fa-robot"></i>}
                  {message.type === "error" && <i className="fas fa-exclamation-triangle"></i>}
                  {message.type === "loading" ? (
                    <div className="loading-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="chat-input">
            <input
              type="text"
              id="userInput"
              className="form-control"
              placeholder="Type your question here..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              ref={inputRef}
            />
            <button className="btn btn-primary" onClick={sendMessage} title="Send message">
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
