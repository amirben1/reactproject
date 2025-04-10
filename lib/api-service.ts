/**
 * API Service for FastAPI Audit Application
 * Handles all communication with the backend API
 */

// Base URL for API requests
const BASE_URL = "http://localhost:8000"

// Interface for chat request
interface ChatRequest {
  question: string
  context: {
    transcription?: string
    summary?: string
    non_conformities?: string
    processes?: string
  }
  chat_history: string[]
}

// Interface for summarize request
interface SummarizeRequest {
  transcription: string
}

// Interface for report generation request
interface ReportRequest {
  client_name: string
  client_address: string
  audit_site: string
  audit_period: string
  reference_standard: string
  audit_type: string
  auditor_name: string
  audit_manager: string
  audit_team_members: string
  management_system: string
  activity_description: string
  non_conformities_count: string
  reference_documents: string[]
  processes_list: string[]
  compliance_items: {
    id?: number
    process: string
    requirement: string
    comment: string
    rating: string
  }[]
  positive_points: string[]
  recommendations: string[]
  resume: string
  language: string
}

// API Service class
export class ApiService {
  /**
   * Start recording audio
   * @param language Language code (en or fr)
   */
  static async startRecording(language = "fr"): Promise<{ message: string }> {
    try {
      const response = await fetch(`${BASE_URL}/start_recording?language=${language}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to start recording")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Start recording error:", error)
      throw error
    }
  }

  /**
   * Stop recording audio
   */
  static async stopRecording(): Promise<{ audio_path: string; transcription: string }> {
    try {
      const response = await fetch(`${BASE_URL}/stop_recording`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to stop recording")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Stop recording error:", error)
      throw error
    }
  }

  /**
   * Upload audio file
   * @param file Audio file to upload
   * @param language Language code (en or fr)
   */
  static async uploadAudio(
    file: File,
    language = "fr",
  ): Promise<{ audio_path: string; transcription: string; filename: string }> {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch(`${BASE_URL}/upload_audio?language=${language}`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to upload audio")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Upload audio error:", error)
      throw error
    }
  }

  /**
   * Get transcription history
   */
  static async getHistory(): Promise<{ history: any[] }> {
    try {
      const response = await fetch(`${BASE_URL}/history`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to retrieve history")
      }

      return await response.json()
    } catch (error: any) {
      console.error("History retrieval error:", error)
      throw error
    }
  }

  /**
   * Get real-time transcription
   */
  static async getRealTimeTranscription(): Promise<{ transcriptions: any[] }> {
    try {
      const response = await fetch(`${BASE_URL}/real_time_transcription`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to get real-time transcription")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Real-time transcription error:", error)
      throw error
    }
  }

  /**
   * Summarize transcription
   * @param transcription Transcription text
   * @param language Language code (en or fr)
   */
  static async summarize(transcription: string, language = "fr"): Promise<{ summary: string; structured_data: any }> {
    try {
      const response = await fetch(`${BASE_URL}/summarize?language=${language}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcription }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to summarize")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Summarization error:", error)
      throw error
    }
  }

  /**
   * Generate audit report
   * @param data Report data
   */
  static async generateReport(data: ReportRequest): Promise<Blob> {
    try {
      const response = await fetch(`${BASE_URL}/generate_report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to generate report")
      }

      return await response.blob()
    } catch (error: any) {
      console.error("Report generation error:", error)
      throw error
    }
  }

  /**
   * Send chat message
   * @param question User question
   * @param context Context data
   * @param chatHistory Chat history
   */
  static async sendChatMessage(
    question: string,
    context: ChatRequest["context"] = {},
    chatHistory: string[] = [],
  ): Promise<{ response: string }> {
    try {
      const response = await fetch(`${BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          context,
          chat_history: chatHistory,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || "Failed to get chat response")
      }

      return await response.json()
    } catch (error: any) {
      console.error("Chat error:", error)
      throw error
    }
  }
}
