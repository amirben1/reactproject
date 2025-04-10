"use client"

type TabId = "transcription-section" | "history" | "summary" | "assistant"

interface SidebarProps {
  activeTab: TabId
  setActiveTab: (tab: TabId) => void
  status: string
  statusType: string
  currentLanguage: string
  setLanguage: (lang: "fr" | "en") => void
  isMobile: boolean
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  t: (key: string) => string
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  status,
  statusType,
  currentLanguage,
  setLanguage,
  isMobile,
  sidebarOpen,
  setSidebarOpen,
  t,
}: SidebarProps) {
  const handleTabClick = (tabId: TabId) => {
    setActiveTab(tabId)
    if (isMobile) {
      setSidebarOpen(false)
    }
  }

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="sidebar-header">
        <h1>
          <i className="fas fa-microphone-alt"></i> {t("appTitle")}
        </h1>
      </div>

      <div className={`status ${statusType}`} id="statusContainer">
        <div className="status-indicator"></div>
        <span id="status">{t(status) || status}</span>
      </div>

      <nav className="sidebar-nav">
        <a
          href="#"
          className={`nav-item ${activeTab === "transcription-section" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault()
            handleTabClick("transcription-section")
          }}
        >
          <i className="fas fa-file-alt"></i> <span>{t("transcription")}</span>
        </a>
        <a
          href="#"
          className={`nav-item ${activeTab === "history" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault()
            handleTabClick("history")
          }}
        >
          <i className="fas fa-history"></i> <span>{t("history")}</span>
        </a>
        <a
          href="#"
          className={`nav-item ${activeTab === "summary" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault()
            handleTabClick("summary")
          }}
        >
          <i className="fas fa-chart-bar"></i> <span>{t("summary")}</span>
        </a>
        <a
          href="#"
          className={`nav-item ${activeTab === "assistant" ? "active" : ""}`}
          onClick={(e) => {
            e.preventDefault()
            handleTabClick("assistant")
          }}
        >
          <i className="fas fa-robot"></i> <span>{t("assistant")}</span>
        </a>
      </nav>

      <div className="language-switcher">
        <h3>
          <i className="fas fa-globe"></i> <span>{t("language")}</span>
        </h3>
        <div className="language-options">
          <div
            className={`language-option ${currentLanguage === "en" ? "active" : ""}`}
            onClick={() => setLanguage("en")}
          >
            {t("english")}
          </div>
          <div
            className={`language-option ${currentLanguage === "fr" ? "active" : ""}`}
            onClick={() => setLanguage("fr")}
          >
            {t("french")}
          </div>
        </div>
      </div>
    </aside>
  )
}
