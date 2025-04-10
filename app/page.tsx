"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import TranscriptionSection from "@/components/transcription-section"
import HistorySection from "@/components/history-section"
import SummarySection from "@/components/summary-section"
import AssistantSection from "@/components/assistant-section"
import { useTranslation } from "@/hooks/use-translation"
import { useMobile } from "@/hooks/use-mobile"
import { Toaster } from "@/components/ui/toaster"

type TabId = "transcription-section" | "history" | "summary" | "assistant"

interface StatusState {
  message: string
  type: string
}

interface Props {}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabId>("transcription-section")
  const [status, setStatus] = useState<StatusState>({ message: "ready", type: "info" })
  const { t, currentLanguage, setLanguage } = useTranslation()
  const { isMobile, sidebarOpen, setSidebarOpen } = useMobile()

  const updateStatus = (message: string, type = "info") => {
    setStatus({ message, type })
  }

  return (
      <div className="layout">
        {isMobile && (
          <button className="mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <i className="fas fa-bars"></i>
          </button>
        )}

        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          status={status.message}
          statusType={status.type}
          currentLanguage={currentLanguage}
          setLanguage={setLanguage}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          t={t}
        />

        {isMobile && (
          <div
            className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        <main className="main-content">
          <div className="content-wrapper">
            <TranscriptionSection updateStatus={updateStatus} t={t} isActive={activeTab === "transcription-section"} />

            <HistorySection
              updateStatus={updateStatus}
              t={t}
              setActiveTab={setActiveTab}
              isActive={activeTab === "history"}
            />

            <SummarySection updateStatus={updateStatus} t={t} isActive={activeTab === "summary"} />

            <AssistantSection t={t} isActive={activeTab === "assistant"} />
          </div>
        </main>

        <Toaster />
      </div>
  )
}
