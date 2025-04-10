"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { showToast } from "@/lib/utils"
import { ApiService } from "@/lib/api-service"

interface ComplianceItem {
  id: number
  process: string
  requirement: string
  comment: string
  rating: string
}

interface SummarySectionProps {
  updateStatus: (message: string, type?: string) => void
  t: (key: string) => string
  isActive: boolean
}

export default function SummarySection({ updateStatus, t, isActive }: SummarySectionProps) {
  const [reportLanguage, setReportLanguage] = useState("fr")
  const [clientName, setClientName] = useState("")
  const [clientAddress, setClientAddress] = useState("")
  const [auditSite, setAuditSite] = useState("")
  const [auditPeriod, setAuditPeriod] = useState("")
  const [referenceStandard, setReferenceStandard] = useState("")
  const [auditType, setAuditType] = useState("")
  const [auditorName, setAuditorName] = useState("")
  const [auditManager, setAuditManager] = useState("")
  const [auditTeamMembers, setAuditTeamMembers] = useState("")
  const [managementSystem, setManagementSystem] = useState("")
  const [activityDescription, setActivityDescription] = useState("")
  const [nonConformitiesCount, setNonConformitiesCount] = useState("")
  const [referenceDocuments, setReferenceDocuments] = useState("")
  const [processesList, setProcessesList] = useState("")
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([])
  const [positivePoints, setPositivePoints] = useState("")
  const [recommendations, setRecommendations] = useState("")
  const [resume, setResume] = useState("")

  // Refs for auto-resizing textareas
  const referenceDocumentsRef = useRef<HTMLTextAreaElement>(null)
  const processesListRef = useRef<HTMLTextAreaElement>(null)
  const positivePointsRef = useRef<HTMLTextAreaElement>(null)
  const recommendationsRef = useRef<HTMLTextAreaElement>(null)
  const resumeRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Auto-resize textareas on initial render
    autoResizeTextareas()
  }, [])

  const autoResizeTextareas = () => {
    const textareas = [
      referenceDocumentsRef.current,
      processesListRef.current,
      positivePointsRef.current,
      recommendationsRef.current,
      resumeRef.current,
    ]

    textareas.forEach((textarea) => {
      if (textarea) {
        autoResizeTextarea(textarea)
      }
    })
  }

  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = "auto"
    // Set the height to match content (scrollHeight)
    textarea.style.height = textarea.scrollHeight + "px"
  }

  const handleTextareaChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setter: React.Dispatch<React.SetStateAction<string>>,
  ) => {
    setter(e.target.value)
    autoResizeTextarea(e.target)
  }

  // Update the summarize function to use the API service
  const summarize = async () => {
    // Get the transcription from localStorage or another source
    const currentTranscription = localStorage.getItem("currentTranscription") || ""

    if (!currentTranscription) {
      updateStatus("noTranscriptionToSummarize", "error")
      return
    }

    updateStatus("summarizing", "loading")

    try {
      const data = await ApiService.summarize(currentTranscription, reportLanguage)
      const structuredData = data.structured_data

      setClientName(structuredData.client_name || "")
      setClientAddress(structuredData.client_address || "")
      setAuditSite(structuredData.audit_site || structuredData.client_address || "")
      setAuditPeriod(structuredData.audit_period || "")
      setReferenceStandard(structuredData.reference_standard || "")
      setAuditType(structuredData.audit_type || "")
      setAuditorName(structuredData.auditor_name || "")
      setAuditManager(structuredData.audit_manager || "")
      setAuditTeamMembers(structuredData.audit_team_members || "")
      setManagementSystem(structuredData.management_system || "")
      setActivityDescription(structuredData.activity_description || "")
      setNonConformitiesCount(structuredData.non_conformities_count || "")

      // Handle arrays with proper fallbacks
      const referenceDocsArray = Array.isArray(structuredData.reference_documents)
        ? structuredData.reference_documents
        : []
      setReferenceDocuments(referenceDocsArray.join("\n"))

      const processesArray = Array.isArray(structuredData.processes_list) ? structuredData.processes_list : []
      setProcessesList(processesArray.join("\n"))

      // Format compliance items with proper error handling
      const complianceArray = Array.isArray(structuredData.compliance_items) ? structuredData.compliance_items : []
      const formattedComplianceItems = complianceArray.map((item: any, index: number) => ({
        id: Date.now() + index,
        process: item.process || "",
        requirement: item.requirement || "",
        comment: item.comment || "",
        rating: item.rating || "",
      }))

      setComplianceItems(formattedComplianceItems)

      const positivePointsArray = Array.isArray(structuredData.positive_points) ? structuredData.positive_points : []
      setPositivePoints(positivePointsArray.join("\n"))

      const recommendationsArray = Array.isArray(structuredData.recommendations) ? structuredData.recommendations : []
      setRecommendations(recommendationsArray.join("\n"))

      setResume(structuredData.resume || "")

      updateStatus("summaryReady")

      // Store summary in localStorage for the assistant to access
      localStorage.setItem("currentSummary", JSON.stringify(structuredData))
      localStorage.setItem("nonConformitiesCount", structuredData.non_conformities_count || "0")
      localStorage.setItem("processesList", processesArray.join(", "))

      // Auto-resize textareas after populating data
      setTimeout(autoResizeTextareas, 0)
    } catch (error: any) {
      updateStatus(`Error: ${error.message}`, "error")
    }
  }

  const generateReport = async () => {
    updateStatus("generatingReport", "loading")

    try {
      const reportData = {
        client_name: clientName,
        client_address: clientAddress,
        audit_site: auditSite,
        audit_period: auditPeriod,
        reference_standard: referenceStandard,
        audit_type: auditType,
        auditor_name: auditorName,
        audit_manager: auditManager,
        audit_team_members: auditTeamMembers,
        management_system: managementSystem,
        activity_description: activityDescription,
        non_conformities_count: nonConformitiesCount,
        reference_documents: referenceDocuments.split("\n").filter((line) => line.trim()),
        processes_list: processesList.split("\n").filter((line) => line.trim()),
        compliance_items: complianceItems,
        positive_points: positivePoints.split("\n").filter((line) => line.trim()),
        recommendations: recommendations.split("\n").filter((line) => line.trim()),
        resume: resume,
        language: reportLanguage,
      }

      const blob = await ApiService.generateReport(reportData)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `audit_report_${new Date().toISOString().split("T")[0]}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      updateStatus("reportGenerated")
      showToast("Report downloaded successfully")
    } catch (error: any) {
      updateStatus(`Error: ${error.message}`, "error")
    }
  }

  const addComplianceItem = () => {
    const newItem = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      process: "New Compliance Item",
      requirement: "",
      comment: "",
      rating: "",
    }

    setComplianceItems([...complianceItems, newItem])
  }

  const removeComplianceItem = (id: number) => {
    setComplianceItems(complianceItems.filter((item) => item.id !== id))
  }

  const updateItemField = (id: number, field: keyof ComplianceItem, value: string) => {
    setComplianceItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  return (
    <section id="summary" className={`content-section ${isActive ? "active" : ""}`}>
      <div className="section-header">
        <h2>
          <i className="fas fa-chart-bar"></i> <span>{t("summary")}</span>
        </h2>
        <p>{t("auditSummary")}</p>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <i className="fas fa-magic"></i> <span>{t("generateSummary")}</span>
          </h3>
        </div>
        <div className="card-body">
          <div className="language-selection">
            <label>
              <input
                type="radio"
                name="summaryReportLanguage"
                value="fr"
                checked={reportLanguage === "fr"}
                onChange={() => setReportLanguage("fr")}
              />{" "}
              <span>{t("french")}</span>
            </label>
            <label>
              <input
                type="radio"
                name="summaryReportLanguage"
                value="en"
                checked={reportLanguage === "en"}
                onChange={() => setReportLanguage("en")}
              />{" "}
              <span>{t("english")}</span>
            </label>
          </div>
          <button className="btn btn-primary action-btn" id="summarizeBtn" onClick={summarize}>
            <i className="fas fa-magic"></i> <span>{t("generateSummary")}</span>
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("auditInformation")}</h3>
        </div>
        <div className="card-body">
          <div className="summary-grid">
            <div className="form-group">
              <label htmlFor="clientName">{t("clientName")}</label>
              <input
                type="text"
                id="clientName"
                className="form-control"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="clientAddress">{t("clientAddress")}</label>
              <input
                type="text"
                id="clientAddress"
                className="form-control"
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditSite">{t("auditSite")}</label>
              <input
                type="text"
                id="auditSite"
                className="form-control"
                value={auditSite}
                onChange={(e) => setAuditSite(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditPeriod">{t("auditPeriod")}</label>
              <input
                type="text"
                id="auditPeriod"
                className="form-control"
                value={auditPeriod}
                onChange={(e) => setAuditPeriod(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="referenceStandard">{t("referenceStandard")}</label>
              <input
                type="text"
                id="referenceStandard"
                className="form-control"
                value={referenceStandard}
                onChange={(e) => setReferenceStandard(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditType">{t("auditType")}</label>
              <input
                type="text"
                id="auditType"
                className="form-control"
                value={auditType}
                onChange={(e) => setAuditType(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditorName">{t("auditorName")}</label>
              <input
                type="text"
                id="auditorName"
                className="form-control"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditManager">{t("auditManager")}</label>
              <input
                type="text"
                id="auditManager"
                className="form-control"
                value={auditManager}
                onChange={(e) => setAuditManager(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="auditTeamMembers">{t("auditTeamMembers")}</label>
              <input
                type="text"
                id="auditTeamMembers"
                className="form-control"
                value={auditTeamMembers}
                onChange={(e) => setAuditTeamMembers(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="managementSystem">{t("managementSystem")}</label>
              <input
                type="text"
                id="managementSystem"
                className="form-control"
                value={managementSystem}
                onChange={(e) => setManagementSystem(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="activityDescription">{t("activityDescription")}</label>
              <input
                type="text"
                id="activityDescription"
                className="form-control"
                value={activityDescription}
                onChange={(e) => setActivityDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label htmlFor="nonConformitiesCount">{t("nonConformitiesCount")}</label>
              <input
                type="text"
                id="nonConformitiesCount"
                className="form-control"
                value={nonConformitiesCount}
                onChange={(e) => setNonConformitiesCount(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("referenceDocuments")}</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <textarea
              id="referenceDocuments"
              className="form-control"
              placeholder={t("referencePlaceholder")}
              value={referenceDocuments}
              onChange={(e) => handleTextareaChange(e, setReferenceDocuments)}
              ref={referenceDocumentsRef}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("processesList")}</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <textarea
              id="processesList"
              className="form-control"
              placeholder={t("processesPlaceholder")}
              value={processesList}
              onChange={(e) => handleTextareaChange(e, setProcessesList)}
              ref={processesListRef}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card compliance-card">
        <div className="card-header">
          <h3>
            <i className="fas fa-clipboard-check"></i> <span>{t("complianceItems")}</span>
          </h3>
          <div className="card-actions">
            <button className="btn btn-icon btn-primary" onClick={addComplianceItem} title={t("addItem")}>
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
        <div className="card-body">
          <div id="complianceItems" className="compliance-items">
            {complianceItems.length === 0 ? (
              <div className="empty-state">
                <p>{t("noComplianceItems")}</p>
              </div>
            ) : (
              complianceItems.map((item) => (
                <div key={item.id} id={`item-${item.id}`} className="compliance-item">
                  <div className="compliance-item-header">
                    <span className="compliance-item-title">
                      <i className="fas fa-clipboard-check"></i>
                      {item.process || t("newComplianceItem")}
                    </span>
                    <button className="remove-compliance-btn" onClick={() => removeComplianceItem(item.id)}>
                      <i className="fas fa-times"></i>
                    </button>
                  </div>
                  <div className="compliance-fields">
                    <div className="compliance-field">
                      <label htmlFor={`process-${item.id}`}>{t("process")}</label>
                      <input
                        type="text"
                        id={`process-${item.id}`}
                        value={item.process}
                        onChange={(e) => updateItemField(item.id, "process", e.target.value)}
                      />
                    </div>
                    <div className="compliance-field">
                      <label htmlFor={`requirement-${item.id}`}>{t("requirement")}</label>
                      <input
                        type="text"
                        id={`requirement-${item.id}`}
                        value={item.requirement}
                        onChange={(e) => updateItemField(item.id, "requirement", e.target.value)}
                      />
                    </div>
                    <div className="compliance-field">
                      <label htmlFor={`comment-${item.id}`}>{t("comment")}</label>
                      <input
                        type="text"
                        id={`comment-${item.id}`}
                        value={item.comment}
                        onChange={(e) => updateItemField(item.id, "comment", e.target.value)}
                      />
                    </div>
                    <div className="compliance-field">
                      <label htmlFor={`rating-${item.id}`}>{t("rating")}</label>
                      <input
                        type="text"
                        id={`rating-${item.id}`}
                        value={item.rating}
                        onChange={(e) => updateItemField(item.id, "rating", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("positivePoints")}</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <textarea
              id="positivePoints"
              className="form-control"
              placeholder={t("positivePlaceholder")}
              value={positivePoints}
              onChange={(e) => handleTextareaChange(e, setPositivePoints)}
              ref={positivePointsRef}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("recommendations")}</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <textarea
              id="recommendations"
              className="form-control"
              placeholder={t("recommendationsPlaceholder")}
              value={recommendations}
              onChange={(e) => handleTextareaChange(e, setRecommendations)}
              ref={recommendationsRef}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{t("resume")}</h3>
        </div>
        <div className="card-body">
          <div className="form-group">
            <textarea
              id="resume"
              className="form-control"
              placeholder={t("resumePlaceholder")}
              value={resume}
              onChange={(e) => handleTextareaChange(e, setResume)}
              ref={resumeRef}
            ></textarea>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>
            <i className="fas fa-file-pdf"></i> <span>{t("reportGeneration")}</span>
          </h3>
        </div>
        <div className="card-body">
          <button className="btn btn-success action-btn" id="generateReportBtn" onClick={generateReport}>
            <i className="fas fa-file-pdf"></i> <span>{t("generateDownload")}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
