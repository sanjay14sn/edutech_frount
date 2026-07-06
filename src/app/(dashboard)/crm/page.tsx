"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  GitPullRequest, List, KanbanSquare, Search, Plus, Filter, UserCheck, 
  Trash2, FileEdit, CheckCircle2, AlertCircle, Phone, Mail, DollarSign, Calendar, MessageSquarePlus, Clock, X, Upload, Download, FileSpreadsheet
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { useStore, Lead, LeadStage } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"
import { downloadLeadImportTemplate, parseLeadImportCsv, type LeadImportRow } from "@/lib/leadImport"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice, showCapacityLimitToast } from "@/components/shared/CapacityLimitNotice"
import { ApiError } from "@/lib/api"

const STAGES: { value: LeadStage; label: string; color: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline" }[] = [
  { value: "new", label: "New Lead", color: "default" },
  { value: "contacted", label: "Contacted", color: "info" },
  { value: "interested", label: "Interested", color: "warning" },
  { value: "demo_scheduled", label: "Demo Scheduled", color: "outline" },
  { value: "follow_up", label: "Follow-up", color: "secondary" },
  { value: "requested_as_student", label: "Requested as Student", color: "warning" },
  { value: "converted", label: "Converted", color: "success" },
  { value: "lost", label: "Lost", color: "destructive" }
]

function getStageMeta(stage: LeadStage) {
  return STAGES.find((s) => s.value === stage) || { label: stage.replace(/_/g, " "), color: "default" as const }
}

function leadRecordId(lead: { id?: string; _id?: string }) {
  return String(lead.id ?? lead._id ?? "")
}

export default function CRMPage() {
  const { 
    leads: storeLeads, 
    setLeads,
    addLead, 
    updateLead, 
    deleteLead, 
    addNotification, 
    addFollowUp,
    user,
    fetchCenterPolicy,
  } = useStore()
  
  const [bdes, setBdes] = React.useState<any[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [viewType, setViewType] = React.useState<"board" | "list">("list")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterCourse, setFilterCourse] = React.useState("all")

  // Modal States
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  
  // Form States for Add Lead
  const [newName, setNewName] = React.useState("")
  const [newEmail, setNewEmail] = React.useState("")
  const [newPhone, setNewPhone] = React.useState("")
  const [newCourse, setNewCourse] = React.useState("")
  const [newValue, setNewValue] = React.useState("1200")
  const [assignedBdeId, setAssignedBdeId] = React.useState("")
  
  // Note State for Lead Detail Panel
  const [noteText, setNoteText] = React.useState("")

  // Convert Dialog States
  const [isConvertOpen, setIsConvertOpen] = React.useState(false)
  const [leadToConvert, setLeadToConvert] = React.useState<Lead | null>(null)
  const [convertPrice, setConvertPrice] = React.useState("")
  const [convertCourse, setConvertCourse] = React.useState("")
  const [convertAmountPaid, setConvertAmountPaid] = React.useState("0")
  const [convertNextDueDate, setConvertNextDueDate] = React.useState("")
  const [convertInstallmentCount, setConvertInstallmentCount] = React.useState("3")
  const [convertIsSubmitting, setConvertIsSubmitting] = React.useState(false)
  const [conversionRequests, setConversionRequests] = React.useState<any[]>([])

  // Follow Up Dialog States
  const [isFollowUpOpen, setIsFollowUpOpen] = React.useState(false)
  const [leadToFollowUp, setLeadToFollowUp] = React.useState<Lead | null>(null)
  const [followUpNextDate, setFollowUpNextDate] = React.useState("")
  const [followUpNotes, setFollowUpNotes] = React.useState("")
  const [followUpIsSubmitting, setFollowUpIsSubmitting] = React.useState(false)

  // Import dialog states
  const [isImportOpen, setIsImportOpen] = React.useState(false)
  const [importRows, setImportRows] = React.useState<LeadImportRow[]>([])
  const [importFileName, setImportFileName] = React.useState("")
  const [importError, setImportError] = React.useState("")
  const [importIsSubmitting, setImportIsSubmitting] = React.useState(false)
  const [importResult, setImportResult] = React.useState<{
    imported: number
    skipped: number
    failed: number
    skippedRows?: Array<{ row: number; email?: string; reason: string }>
    failedRows?: Array<{ row: number; reason: string }>
  } | null>(null)
  const importFileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true)
        const requestsData = await api.getConversionRequests().catch(() => [])
        const [leadsData, bdesData, coursesData] = await Promise.all([
          api.getLeads(),
          api.getBdes().catch(() => []),
          api.getCourses().catch(() => []),
        ])
        setLeads(leadsData)
        setBdes(bdesData)
        setCourses(coursesData)
        setConversionRequests(requestsData)
        if (coursesData.length > 0) {
          setNewCourse(coursesData[0].name)
        }
      } catch (err) {
        console.error("Failed to load CRM data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [setLeads])

  React.useEffect(() => {
    const selectedCourseObj = courses.find(c => c.name === newCourse)
    if (selectedCourseObj) {
      setNewValue(String(selectedCourseObj.fees))
    }
  }, [newCourse, courses])

  // Filter leads by BDE assignment if user is BDE, otherwise show all
  const myLeads = React.useMemo(() => {
    if (user?.role === "bde") {
      return storeLeads.filter(
        (l) =>
          l.assignedBdeId === user.id ||
          (l.counsellor || "").trim().toLowerCase() === (user.name || "").trim().toLowerCase()
      )
    }
    return storeLeads
  }, [storeLeads, user])

  const isBde = user?.role === "bde"
  const isOwner = user?.role === "owner" || user?.role === "super_admin"
  const { allowLeadCsvImport, allowBdeDirectConvert, policy, atCapacity } = useCenterPolicy()
  const studentsAtCapacity = atCapacity("students")

  const pendingLeadIds = React.useMemo(
    () =>
      new Set(
        conversionRequests
          .filter((r) => r.status === "pending")
          .map((r) => String(r.leadId))
      ),
    [conversionRequests]
  )

  const myPendingRequests = React.useMemo(
    () => conversionRequests.filter((r) => r.status === "pending"),
    [conversionRequests]
  )

  const getPendingRequestForLead = React.useCallback(
    (leadId: string) =>
      conversionRequests.find(
        (r) => r.status === "pending" && String(r.leadId) === String(leadId)
      ),
    [conversionRequests]
  )

  const pipelineStages = React.useMemo(
    () => STAGES.filter((stage) => !(isBde && stage.value === "converted")),
    [isBde]
  )

  const getEffectiveStage = React.useCallback(
    (lead: Lead): LeadStage => {
      if (
        pendingLeadIds.has(String(lead.id)) &&
        lead.stage !== "converted"
      ) {
        return "requested_as_student"
      }
      return lead.stage
    },
    [pendingLeadIds]
  )

  const filteredLeads = myLeads.filter((lead) => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.phone.includes(searchQuery)
    const matchesCourse = filterCourse === "all" || lead.course === filterCourse
    return matchesSearch && matchesCourse
  })

  const getBdeNameForLead = (lead: Lead & { bdeName?: string | null }) => {
    if (lead.bdeName) return lead.bdeName
    if (lead.assignedBdeId) {
      const bde = bdes.find(
        (b) => String(b.id) === String(lead.assignedBdeId) || String(b._id) === String(lead.assignedBdeId)
      )
      if (bde?.name) return bde.name
    }
    if (lead.counsellor?.trim()) return lead.counsellor.trim()
    return "Unassigned"
  }

  // CRUD actions
  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newName || !newEmail || !newPhone) return

    try {
      const data = await api.createLead({
        name: newName,
        email: newEmail,
        phone: newPhone,
        course: newCourse,
        stage: "new",
        value: Number(newValue),
        notes: [],
        assignedBdeId: assignedBdeId || (user?.role === "bde" ? user.id : undefined),
        counsellor: user?.role === "bde" ? user.name : undefined,
      })

      // Normalize backend _id to id if needed
      const normalizedLead = { ...data, id: data._id || data.id }
      addLead(normalizedLead)
      setIsAddOpen(false)
      addNotification({
        title: "New Lead Created",
        description: `${newName} was added to the CRM pipeline.`,
        type: "admissions"
      })

      // Reset Form
      setNewName("")
      setNewEmail("")
      setNewPhone("")
      setNewCourse("Fullstack Web Dev")
      setNewValue("1200")
      setAssignedBdeId("")
    } catch (error: any) {
      console.error("Failed to create lead", error)
      alert(error.message || "Failed to create lead")
    }
  }

  const handleUpdateLeadStage = async (leadId: string, newStage: LeadStage) => {
    const lead = storeLeads.find(l => l.id === leadId)
    if (!lead) return
    
    if (newStage === "converted" || newStage === "requested_as_student") {
      if (
        pendingLeadIds.has(leadId) ||
        lead.stage === "requested_as_student"
      ) {
        alert("This lead is already requested as student and awaiting owner approval.")
        return
      }
      setLeadToConvert(lead)
      setConvertPrice(String(lead.value))
      setConvertCourse(lead.course)
      setConvertAmountPaid("0")
      setConvertInstallmentCount("3")
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      setConvertNextDueDate(thirtyDays.toISOString().split("T")[0])
      setIsConvertOpen(true)
      return
    }

    if (newStage === "follow_up") {
      setLeadToFollowUp(lead)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setFollowUpNextDate(tomorrow.toISOString().split("T")[0])
      setFollowUpNotes("")
      setIsFollowUpOpen(true)
      return
    }

    // Optimistic update
    const updated = { ...lead, stage: newStage }
    updateLead(updated)
    if (selectedLead?.id === leadId) setSelectedLead(updated)

    try {
      await api.updateLeadStage(leadId, newStage)
      addNotification({
        title: "Lead Pipeline Updated",
        description: `Lead status changed to ${newStage.replace("_", " ")}.`,
        type: "admissions"
      })
    } catch (error) {
      console.error("Failed to update stage", error)
      updateLead(lead) // revert
      if (selectedLead?.id === leadId) setSelectedLead(lead)
    }
  }

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadToConvert) return

    try {
      setConvertIsSubmitting(true)

      if (isBde) {
        const result = await api.createConversionRequest({
          leadId: leadToConvert.id,
          course: convertCourse,
          feesTotal: Number(convertPrice),
          feesPaid: Number(convertAmountPaid),
          nextDueDate: convertNextDueDate,
          installmentsCount: Number(convertInstallmentCount),
        }) as { direct?: boolean; student?: { name?: string } }

        const leadsData = await api.getLeads()
        setLeads(leadsData)

        if (result?.direct) {
          addNotification({
            title: "Lead Converted",
            description: `${leadToConvert.name} was enrolled directly as a student.`,
            type: "admissions",
          })
          alert(`${leadToConvert.name} has been converted to a student.`)
        } else {
          const requestsData = await api.getConversionRequests()
          setConversionRequests(requestsData)
          addNotification({
            title: "Conversion Request Sent",
            description: `${leadToConvert.name}'s enrollment request was sent to the owner for approval.`,
            type: "admissions",
          })
          alert(`Conversion request submitted to owner for ${leadToConvert.name}.`)
        }

        setIsConvertOpen(false)
        setLeadToConvert(null)
        return
      }

      await api.createStudent({
        name: leadToConvert.name,
        email: leadToConvert.email,
        phone: leadToConvert.phone,
        course: convertCourse,
        status: "active",
        attendanceRate: 0,
        feesPaid: Number(convertAmountPaid),
        feesTotal: Number(convertPrice),
        guardian: {
          name: "N/A",
          phone: "N/A"
        },
        enrollmentDate: new Date().toISOString().split("T")[0],
        nextDueDate: convertNextDueDate,
        installmentsCount: Number(convertInstallmentCount),
        tenantId: leadToConvert.tenantId || "ERP"
      })

      // 2. Update Lead record stage, course and value
      const updatedData = await api.updateLead(leadToConvert.id, {
        stage: "converted",
        course: convertCourse,
        value: Number(convertPrice)
      })

      // Update local store state
      const normalizedLead = { ...updatedData, id: updatedData._id || updatedData.id }
      updateLead(normalizedLead)
      if (selectedLead?.id === leadToConvert.id) {
        setSelectedLead(normalizedLead)
      }

      addNotification({
        title: "Lead Converted to Student",
        description: `${leadToConvert.name} has been enrolled in ${convertCourse} and moved to the students directory.`,
        type: "admissions"
      })

      setIsConvertOpen(false)
      setLeadToConvert(null)
    } catch (error: unknown) {
      console.error("Failed to convert lead:", error)
      if (error instanceof ApiError && error.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "students", policy, error.message)
        void fetchCenterPolicy()
      } else {
        alert(error instanceof Error ? error.message : "Failed to convert lead to student.")
      }
    } finally {
      setConvertIsSubmitting(false)
    }
  }

  const handleFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!leadToFollowUp) return

    try {
      setFollowUpIsSubmitting(true)

      let updatedNotes = leadToFollowUp.notes || []
      if (followUpNotes.trim()) {
        const newNote = {
          id: `n-${Date.now()}`,
          text: `Follow-up scheduled: ${followUpNotes.trim()}`,
          date: new Date().toISOString()
        }
        updatedNotes = [newNote, ...updatedNotes]
      } else {
        const newNote = {
          id: `n-${Date.now()}`,
          text: `Stage changed to Follow-up.`,
          date: new Date().toISOString()
        }
        updatedNotes = [newNote, ...updatedNotes]
      }

      const updatedData = await api.updateLead(leadToFollowUp.id, {
        stage: "follow_up",
        notes: updatedNotes,
        nextFollowUpDate: followUpNextDate
      })

      await api.createFollowUp({
        leadId: leadToFollowUp.id,
        notes: followUpNotes.trim() || "Follow-up scheduled.",
        nextFollowupDate: followUpNextDate,
        followupDate: new Date().toISOString().split("T")[0],
      })

      const normalizedLead = { ...updatedData, id: updatedData._id || updatedData.id }
      updateLead(normalizedLead)
      if (selectedLead?.id === leadToFollowUp.id) {
        setSelectedLead(normalizedLead)
      }

      addNotification({
        title: "Follow-up Scheduled",
        description: `Follow-up set for ${leadToFollowUp.name} on ${followUpNextDate}.`,
        type: "admissions"
      })

      setIsFollowUpOpen(false)
      setLeadToFollowUp(null)
    } catch (error: any) {
      console.error("Failed to schedule follow-up:", error)
      alert(error.message || "Failed to schedule follow-up.")
    } finally {
      setFollowUpIsSubmitting(false)
    }
  }

  const handleAddNote = async () => {
    if (!noteText.trim() || !selectedLead) return
    const newNote = {
      text: noteText,
      date: new Date().toISOString().split("T")[0]
    }
    const newNotes = [newNote, ...selectedLead.notes]
    
    try {
      const updatedData = await api.updateLead(selectedLead.id, { notes: newNotes })
      const normalizedLead = { ...updatedData, id: updatedData._id || updatedData.id }
      updateLead(normalizedLead)
      setSelectedLead(normalizedLead)
      setNoteText("")
    } catch (error) {
      console.error("Failed to add note", error)
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    try {
      const result = await api.approveConversionRequest(requestId)
      const [requestsData, leadsData] = await Promise.all([
        api.getConversionRequests(),
        api.getLeads(),
      ])
      setConversionRequests(requestsData)
      setLeads(leadsData)
      if (selectedLead) {
        const updated = leadsData.find(
          (l: { id?: string; _id?: string }) => leadRecordId(l) === String(selectedLead.id)
        )
        if (updated) {
          setSelectedLead({ ...updated, id: leadRecordId(updated) } as Lead)
        }
      }
      addNotification({
        title: "Conversion Approved",
        description: `${result.request.leadName} enrolled. Password: ${result.student.password}`,
        type: "admissions",
      })
      alert(`Approved! ${result.request.leadName} is now a student.\nPassword: ${result.student.password}`)
    } catch (err: any) {
      alert(err.message || "Failed to approve request")
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const note = window.prompt("Rejection reason (optional):") || undefined
    try {
      await api.rejectConversionRequest(requestId, note)
      const [requestsData, leadsData] = await Promise.all([
        api.getConversionRequests(),
        api.getLeads(),
      ])
      setConversionRequests(requestsData)
      setLeads(leadsData)
      if (selectedLead) {
        const updated = leadsData.find(
          (l: { id?: string; _id?: string }) => leadRecordId(l) === String(selectedLead.id)
        )
        if (updated) {
          setSelectedLead({ ...updated, id: leadRecordId(updated) } as Lead)
        }
      }
      addNotification({
        title: "Conversion Rejected",
        description: "The BDE conversion request was declined.",
        type: "admissions",
      })
    } catch (err: any) {
      alert(err.message || "Failed to reject request")
    }
  }

  const resetImportDialog = () => {
    setImportRows([])
    setImportFileName("")
    setImportError("")
    setImportResult(null)
    if (importFileInputRef.current) {
      importFileInputRef.current.value = ""
    }
  }

  const handleImportFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportError("")
    setImportResult(null)
    setImportFileName(file.name)

    try {
      const text = await file.text()
      const rows = parseLeadImportCsv(text)
      setImportRows(rows)
    } catch (err: any) {
      setImportRows([])
      setImportError(err.message || "Could not read CSV file")
    }
  }

  const handleImportSubmit = async () => {
    if (importRows.length === 0) {
      setImportError("Upload a CSV file with at least one lead row.")
      return
    }

    try {
      setImportIsSubmitting(true)
      setImportError("")
      const result = await api.importLeads(importRows)
      setImportResult(result)

      const leadsData = await api.getLeads()
      setLeads(leadsData)

      addNotification({
        title: "Lead Import Complete",
        description: `${result.imported} imported, ${result.skipped} skipped, ${result.failed} failed.`,
        type: "admissions",
      })
    } catch (err: any) {
      setImportError(err.message || "Failed to import leads")
    } finally {
      setImportIsSubmitting(false)
    }
  }

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm("Are you sure you want to delete this lead?")) return
    try {
      await api.deleteLead(leadId)
      deleteLead(leadId)
      if (selectedLead?.id === leadId) {
        setSelectedLead(null)
      }
      addNotification({
        title: "Lead Candidate Deleted",
        description: "The lead record was deleted successfully.",
        type: "admissions"
      })
    } catch (error) {
      console.error("Failed to delete lead", error)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-primary" />
            <span>Leads CRM Board</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBde
              ? "Move leads through the pipeline. Choosing Request Conversion sends enrollment details to the owner for approval."
              : "Manage your intake pipeline. Drag cards or switch stages to update student leads."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggles */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
            <button
              onClick={() => setViewType("board")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                viewType === "board" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <KanbanSquare className="h-3.5 w-3.5" />
              <span>Pipeline</span>
            </button>
            <button
              onClick={() => setViewType("list")}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                viewType === "list" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>

          {allowLeadCsvImport && (
            <Button variant="outline" size="sm" icon={Upload} onClick={() => { resetImportDialog(); setIsImportOpen(true) }}>
              Import Leads
            </Button>
          )}

          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsAddOpen(true)}>
            Add New Lead
          </Button>
        </div>
      </div>

      {isOwner && myPendingRequests.length > 0 && (
        <Card className="bg-card border-amber-500/30">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <span>Pending BDE Conversion Requests ({myPendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {myPendingRequests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-bold text-foreground">{req.leadName}</p>
                  <p className="text-muted-foreground">{req.course} • {formatCurrency(req.feesTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Requested by <strong>{req.bdeName}</strong> • Paid {formatCurrency(req.feesPaid)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button variant="primary" size="sm" icon={CheckCircle2} onClick={() => handleApproveRequest(req.id)}>
                    Approve
                  </Button>
                  <Button variant="outline" size="sm" icon={X} onClick={() => handleRejectRequest(req.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isBde && myPendingRequests.length > 0 && (
        <Card className="bg-card border-amber-500/20">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <span>Awaiting Owner Approval ({myPendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60 text-xs">
            {myPendingRequests.map((req) => (
              <div key={req.id} className="p-3.5 flex justify-between items-center">
                <div>
                  <p className="font-bold text-foreground">{req.leadName}</p>
                  <p className="text-[10px] text-muted-foreground">{req.course} • {formatCurrency(req.feesTotal)}</p>
                </div>
                <Badge variant="warning">Pending</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Filter and Search Controls */}
      <div className="grid gap-3 sm:grid-cols-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search name, phone, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="all">All Courses</option>
            {courses.map((c) => (
              <option key={c.id || c._id} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Main CRM Workspace (Kanban vs Table) */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <div className="relative">
          {viewType === "board" ? (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
              {pipelineStages.map((column) => {
                const stageLeads = filteredLeads.filter((l) => getEffectiveStage(l) === column.value)
                const stageValue = stageLeads.reduce((acc, curr) => acc + curr.value, 0)
                
                return (
                  <div key={column.value} className="flex-1 min-w-[260px] bg-muted/20 border border-border/60 rounded-xl p-3.5 flex flex-col max-h-[70vh]">
                    {/* Column Header */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-border/40 mb-3">
                      <div>
                        <h3 className="text-xs font-bold text-foreground">{column.label}</h3>
                        <span className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                          {formatCurrency(stageValue)} • {stageLeads.length} leads
                        </span>
                      </div>
                      <Badge variant={column.color} className="text-[9px] scale-90">
                        {stageLeads.length}
                      </Badge>
                    </div>

                    {/* Column Lead Cards */}
                    <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                      {stageLeads.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/80 rounded-lg text-[10px] text-muted-foreground">
                          No leads in stage
                        </div>
                      ) : (
                        stageLeads.map((lead) => (
                          <motion.div
                            layoutId={lead.id}
                            key={lead.id}
                            onClick={() => setSelectedLead(lead)}
                            className="bg-card hover:bg-card/85 p-3 rounded-lg border border-border/80 shadow-2xs hover:shadow-xs transition-all cursor-pointer space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-xs font-bold text-foreground truncate max-w-[80%]">
                                {lead.name}
                              </span>
                              <div className="flex flex-col items-end gap-1 shrink-0">
                                {pendingLeadIds.has(String(lead.id)) && (
                                  <Badge variant="warning" className="text-[8px] uppercase">Pending</Badge>
                                )}
                                <span className="text-[10px] font-semibold text-emerald-500">
                                  {formatCurrency(lead.value)}
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-[10px] text-muted-foreground truncate leading-normal">
                              {lead.course}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-border/30 text-[9px] text-muted-foreground">
                              <span className="truncate">BDE: {getBdeNameForLead(lead)}</span>
                              <span>{formatDate(lead.createdAt || lead.createdDate)}</span>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Leads List Table View */
            <Card className="bg-card">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                        <th className="p-4">Lead Name</th>
                        <th className="p-4">Contact</th>
                        <th className="p-4">Course Enquired</th>
                        <th className="p-4">Intake Value</th>
                        <th className="p-4">Stage</th>
                        <th className="p-4">BDE</th>
                        <th className="p-4">Registration</th>
                        {isOwner && <th className="p-4 text-right">Actions</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {filteredLeads.length === 0 ? (
                        <tr>
                          <td colSpan={isOwner ? 8 : 7} className="py-12 text-center text-muted-foreground">
                            No lead records found.
                          </td>
                        </tr>
                      ) : (
                        filteredLeads.map((lead) => {
                          const stage = getEffectiveStage(lead)
                          const stageMeta = getStageMeta(stage)
                          const pendingRequest = getPendingRequestForLead(lead.id)
                          return (
                          <tr 
                            key={lead.id} 
                            onClick={() => setSelectedLead(lead)}
                            className="hover:bg-muted/40 cursor-pointer transition-colors"
                          >
                            <td className="p-4 font-bold text-foreground">{lead.name}</td>
                            <td className="p-4 space-y-0.5 text-muted-foreground">
                              <p className="flex items-center gap-1"><Mail className="h-3 w-3" /> {lead.email}</p>
                              <p className="flex items-center gap-1"><Phone className="h-3 w-3" /> {lead.phone}</p>
                            </td>
                            <td className="p-4 text-foreground">{lead.course}</td>
                            <td className="p-4 font-semibold text-foreground">{formatCurrency(lead.value)}</td>
                            <td className="p-4">
                              <Badge variant={stageMeta.color}>
                                {stageMeta.label}
                              </Badge>
                            </td>
                            <td className="p-4 text-muted-foreground">{getBdeNameForLead(lead)}</td>
                            <td className="p-4 text-muted-foreground">{formatDate(lead.createdAt || lead.createdDate)}</td>
                            {isOwner && (
                              <td className="p-4 text-right" onClick={(e) => e.stopPropagation()}>
                                {pendingRequest ? (
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      variant="primary"
                                      size="sm"
                                      icon={CheckCircle2}
                                      className="h-7 text-[10px] px-2.5"
                                      onClick={() => handleApproveRequest(pendingRequest.id || pendingRequest._id)}
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      icon={X}
                                      className="h-7 text-[10px] px-2.5"
                                      onClick={() => handleRejectRequest(pendingRequest.id || pendingRequest._id)}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        )})
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Lead details Drawer Overlay */}
      <AnimatePresence>
        {selectedLead && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between animate-slide-in-bottom">
            <div>
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/80">
                <div>
                  <h2 className="text-base font-bold text-foreground">{selectedLead.name}</h2>
                  <span className="text-[10px] text-muted-foreground">Lead ID: {selectedLead.id}</span>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer text-xs font-semibold px-2 py-1 border border-border"
                >
                  Close
                </button>
              </div>

              {/* General details */}
              <div className="py-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Email</span>
                    <p className="font-medium flex items-center gap-1"><Mail className="h-3.5 w-3.5 text-muted-foreground" /> {selectedLead.email}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Phone</span>
                    <p className="font-medium flex items-center gap-1"><Phone className="h-3.5 w-3.5 text-muted-foreground" /> {selectedLead.phone}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Course Interest</span>
                    <p className="font-medium text-foreground">{selectedLead.course}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-4">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Pipeline Status</span>
                    <Select
                      value={getEffectiveStage(selectedLead)}
                      onChange={(e) => handleUpdateLeadStage(selectedLead.id, e.target.value as LeadStage)}
                      className="h-8.5 text-xs bg-card"
                    >
                      {pipelineStages.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase">Assigned BDE</span>
                    {isOwner ? (
                      <Select
                        value={
                          selectedLead.assignedBdeId ||
                          (selectedLead.counsellor
                            ? bdes.find(
                                (b) =>
                                  (b.name || "").trim().toLowerCase() ===
                                  (selectedLead.counsellor || "").trim().toLowerCase()
                              )?.id ||
                              bdes.find(
                                (b) =>
                                  (b.name || "").trim().toLowerCase() ===
                                  (selectedLead.counsellor || "").trim().toLowerCase()
                              )?._id ||
                              ""
                            : "")
                        }
                        onChange={async (e) => {
                          const newBdeId = e.target.value || undefined
                          const assignedBde = bdes.find(
                            (b) => String(b.id) === String(newBdeId) || String(b._id) === String(newBdeId)
                          )
                          try {
                            const updatedData = await api.updateLead(selectedLead.id, {
                              assignedBdeId: newBdeId || null,
                              counsellor: assignedBde?.name || null,
                            })
                            const normalizedLead = { ...updatedData, id: updatedData._id || updatedData.id }
                            updateLead(normalizedLead)
                            setSelectedLead(normalizedLead)
                            addNotification({
                              title: "Lead Assigned",
                              description: `Assigned BDE updated for ${selectedLead.name}.`,
                              type: "admissions"
                            })
                          } catch (error) {
                            console.error("Failed to assign BDE", error)
                          }
                        }}
                        className="h-8.5 text-xs bg-card"
                      >
                        <option value="">Unassigned</option>
                        {bdes.map((bde) => (
                          <option key={bde.id || bde._id} value={bde.id || bde._id}>{bde.name}</option>
                        ))}
                      </Select>
                    ) : (
                      <div className="h-8.5 text-xs bg-muted/40 border border-border/80 rounded-md px-3 flex items-center text-foreground font-medium">
                        {getBdeNameForLead(selectedLead)}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Note taking Timeline */}
              <div className="border-t border-border/60 pt-4 space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Timeline Activity Notes
                </span>

                {/* Input form */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add comment..."
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    className="h-8.5 text-xs bg-muted/10 border-border/80"
                  />
                  <Button size="sm" onClick={handleAddNote} icon={MessageSquarePlus} className="h-8.5 px-3">
                    Add
                  </Button>
                </div>

                {/* Feed logs */}
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {selectedLead.notes.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground italic">No historical activities yet.</p>
                  ) : (
                    selectedLead.notes.map((note, index) => (
                      <div key={index} className="p-2.5 rounded-lg bg-secondary/60 text-xs border border-border/30">
                        <p className="text-foreground leading-normal">{note.text}</p>
                        <span className="text-[9px] text-muted-foreground mt-1.5 block">
                          Logged: {formatDate(note.date)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {(() => {
              const pendingRequest = getPendingRequestForLead(selectedLead.id)
              if (!isOwner || !pendingRequest) return null
              const requestId = pendingRequest.id || pendingRequest._id
              return (
                <div className="border-t border-border/80 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">
                    Pending Conversion Request
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CheckCircle2}
                      className="flex-1 text-xs"
                      onClick={() => handleApproveRequest(requestId)}
                    >
                      Approve Enrollment
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={X}
                      className="flex-1 text-xs"
                      onClick={() => handleRejectRequest(requestId)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              )
            })()}

            {/* Danger Zone deletion */}
            <div className="border-t border-border/80 pt-4 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteLead(selectedLead.id)}
                icon={Trash2}
                className="w-full text-xs"
              >
                Delete Lead
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Convert Lead Dialog */}
      <Dialog
        isOpen={isConvertOpen}
        onClose={() => {
          setIsConvertOpen(false)
          setLeadToConvert(null)
        }}
        title={isBde ? (allowBdeDirectConvert ? "Convert Lead to Student" : "Request Conversion to Student") : "Convert Lead to Student"}
        description={
          leadToConvert
            ? isBde
              ? `Submit ${leadToConvert.name}'s enrollment details for owner approval`
              : `Configure enrollment details for ${leadToConvert.name}`
            : "Configure enrollment details"
        }
      >
        {leadToConvert && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            {studentsAtCapacity && policy && (!isBde || allowBdeDirectConvert) && (
              <CapacityLimitNotice resource="students" policy={policy} variant="inline" />
            )}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Course</label>
                <Select
                  value={convertCourse}
                  onChange={(e) => {
                    setConvertCourse(e.target.value)
                    const selectedCourseObj = courses.find(c => c.name === e.target.value)
                    if (selectedCourseObj) {
                      setConvertPrice(String(selectedCourseObj.fees))
                    }
                  }}
                  className="bg-card text-xs h-9.5"
                >
                  {courses.map((c) => (
                    <option key={c.id || c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Converted Price ($)</label>
                <Input
                  type="number"
                  value={convertPrice}
                  onChange={(e) => setConvertPrice(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Amount to be Paid Now ($)</label>
                <Input
                  type="number"
                  value={convertAmountPaid}
                  onChange={(e) => setConvertAmountPaid(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Next Due Date</label>
                <Input
                  type="date"
                  value={convertNextDueDate}
                  onChange={(e) => setConvertNextDueDate(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  required
                />
              </div>
              <div className="space-y-1 col-span-2">
                <label className="text-xs font-semibold text-muted-foreground">Number of Dues / Installments</label>
                <Select
                  value={convertInstallmentCount}
                  onChange={(e) => setConvertInstallmentCount(e.target.value)}
                  className="bg-card text-xs h-9.5"
                >
                  <option value="1">1 (Single Payment)</option>
                  <option value="2">2 Dues</option>
                  <option value="3">3 Dues</option>
                  <option value="4">4 Dues</option>
                  <option value="5">5 Dues</option>
                  <option value="6">6 Dues</option>
                  <option value="8">8 Dues</option>
                  <option value="10">10 Dues</option>
                  <option value="12">12 Dues</option>
                </Select>
              </div>
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsConvertOpen(false)
                  setLeadToConvert(null)
                }}
                disabled={convertIsSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  convertIsSubmitting ||
                  (studentsAtCapacity && (!isBde || allowBdeDirectConvert))
                }
              >
                {convertIsSubmitting
                  ? isBde ? "Submitting..." : "Converting..."
                  : isBde ? (allowBdeDirectConvert ? "Convert & Enroll" : "Submit to Owner") : "Convert & Move to Students"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Schedule Follow-up Dialog */}
      <Dialog
        isOpen={isFollowUpOpen}
        onClose={() => {
          setIsFollowUpOpen(false)
          setLeadToFollowUp(null)
        }}
        title="Schedule Follow-up"
        description={leadToFollowUp ? `Set next follow-up details for ${leadToFollowUp.name}` : "Configure follow-up details"}
      >
        {leadToFollowUp && (
          <form onSubmit={handleFollowUpSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Next Follow Up Date</label>
              <Input
                type="date"
                value={followUpNextDate}
                onChange={(e) => setFollowUpNextDate(e.target.value)}
                className="bg-card text-xs h-9.5"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Follow-up Notes (Optional)</label>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Add notes about candidate conversation..."
                className="w-full min-h-[80px] p-2.5 bg-card text-xs rounded-lg border border-border/80 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-hidden transition-all text-foreground"
              />
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsFollowUpOpen(false)
                  setLeadToFollowUp(null)
                }}
                disabled={followUpIsSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={followUpIsSubmitting}>
                {followUpIsSubmitting ? "Saving..." : "Save Follow-up & Move"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      {/* Import Leads Dialog */}
      <Dialog
        isOpen={isImportOpen}
        onClose={() => {
          setIsImportOpen(false)
          resetImportDialog()
        }}
        title="Import Leads from CSV"
        description="Bulk upload lead records using a spreadsheet file."
      >
        <div className="space-y-4 text-xs">
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3.5 space-y-2.5">
            <p className="font-bold text-foreground flex items-center gap-1.5">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              Import procedure
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground leading-relaxed">
              <li>Download the sample CSV template below.</li>
              <li>Add one row per lead. Required columns: <strong className="text-foreground">name, email, phone, course</strong>.</li>
              <li>Optional columns: <strong className="text-foreground">value, stage, bde, city, source</strong>.</li>
              <li>Stage values: new, contacted, interested, demo_scheduled, follow_up, requested_as_student, converted, lost.</li>
              <li>Save the file as <strong className="text-foreground">.csv</strong> (UTF-8) from Excel or Google Sheets.</li>
              <li>Upload the file, review the preview, then click <strong className="text-foreground">Import Leads</strong>.</li>
              <li>Rows with duplicate emails are skipped. Invalid rows are listed in the result summary.</li>
            </ol>
            <Button variant="outline" size="sm" icon={Download} onClick={downloadLeadImportTemplate}>
              Download CSV Template
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Upload CSV file</label>
            <input
              ref={importFileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleImportFileChange}
              className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-foreground hover:file:bg-muted/40"
            />
            {importFileName && (
              <p className="text-[10px] text-muted-foreground">Selected file: {importFileName}</p>
            )}
          </div>

          {importError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

          {importRows.length > 0 && !importResult && (
            <div className="rounded-lg border border-border/70 overflow-hidden">
              <div className="px-3 py-2 border-b border-border/60 bg-muted/20 font-semibold text-foreground">
                Preview ({importRows.length} rows)
              </div>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground uppercase text-[10px]">
                      <th className="p-2">Name</th>
                      <th className="p-2">Email</th>
                      <th className="p-2">Phone</th>
                      <th className="p-2">Course</th>
                      <th className="p-2">Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {importRows.slice(0, 8).map((row, index) => (
                      <tr key={`${row.email}-${index}`}>
                        <td className="p-2">{row.name || "—"}</td>
                        <td className="p-2">{row.email || "—"}</td>
                        <td className="p-2">{row.phone || "—"}</td>
                        <td className="p-2">{row.course || "—"}</td>
                        <td className="p-2">{row.stage || "new"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 8 && (
                <p className="px-3 py-2 text-[10px] text-muted-foreground border-t border-border/40">
                  Showing first 8 of {importRows.length} rows.
                </p>
              )}
            </div>
          )}

          {importResult && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
              <p className="font-bold text-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Import summary
              </p>
              <p className="text-muted-foreground">
                {importResult.imported} imported • {importResult.skipped} skipped • {importResult.failed} failed
              </p>
              {(importResult.skippedRows?.length || importResult.failedRows?.length) ? (
                <div className="max-h-28 overflow-auto text-[10px] text-muted-foreground space-y-1">
                  {importResult.skippedRows?.map((row) => (
                    <p key={`skip-${row.row}`}>Row {row.row}: skipped — {row.reason}{row.email ? ` (${row.email})` : ""}</p>
                  ))}
                  {importResult.failedRows?.map((row) => (
                    <p key={`fail-${row.row}`}>Row {row.row}: failed — {row.reason}</p>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsImportOpen(false)
                resetImportDialog()
              }}
              disabled={importIsSubmitting}
            >
              {importResult ? "Close" : "Cancel"}
            </Button>
            {!importResult && (
              <Button
                type="button"
                variant="primary"
                size="sm"
                icon={Upload}
                onClick={handleImportSubmit}
                disabled={importIsSubmitting || importRows.length === 0}
              >
                {importIsSubmitting ? "Importing..." : `Import ${importRows.length || ""} Leads`.trim()}
              </Button>
            )}
          </div>
        </div>
      </Dialog>

      {/* Add Lead Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Lead Candidate"
        description="Fill in lead records. Stages initialize to 'New Lead'."
      >
        <form onSubmit={handleAddLead} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <Input
              placeholder="Full name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="bg-card text-xs h-9.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="name@email.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Phone</label>
              <Input
                placeholder="+1 555-0100"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Intake Course</label>
              <Select
                value={newCourse}
                onChange={(e) => setNewCourse(e.target.value)}
                className="bg-card text-xs h-9.5"
              >
                {courses.map((c) => (
                  <option key={c.id || c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Forecast Value ($)</label>
              <Input
                type="number"
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Assign BDE (Optional)</label>
            <Select
              value={assignedBdeId}
              onChange={(e) => setAssignedBdeId(e.target.value)}
              className="bg-card text-xs h-9.5"
            >
              <option value="">Unassigned</option>
              {bdes.map((bde) => (
                <option key={bde.id || bde._id} value={bde.id || bde._id}>{bde.name}</option>
              ))}
            </Select>
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Lead Candidate
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
