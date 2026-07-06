"use client"

import * as React from "react"
import {
  Wallet, DollarSign, Award, Percent, Calendar, TrendingUp, Search, Plus,
  CheckCircle2, XCircle, Clock, Check, UserCheck, ShieldAlert, Sparkles,
  User, RefreshCw, Eye, EyeOff, FileText, ChevronRight, Download, UploadCloud,
  File, MapPin, Building, AlertTriangle, Shield, CheckSquare, Trash2, Edit3,
  CalendarDays, Settings, PieChart as PieIcon, ArrowUpRight, BarChart3,
  Briefcase, Video, ExternalLink
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, PieChart, Pie, Cell
} from "recharts"
import { PageFeatureGate } from "@/components/shared/FeatureGate"

// --- DATA STRUCTURE INTERFACES ---

interface Employee {
  id: string
  name: string
  photo: string
  role: "Trainer" | "BDE" | "Operations" | "Counsellor"
  department: string
  branch: string
  reportingManager: string
  joiningDate: string
  attendancePct: number
  leaveBalance: {
    casual: number
    sick: number
    unpaid: number
  }
  bankDetails: {
    holder: string
    bank: string
    account: string
    ifsc: string
  }
  performanceScore: number // out of 5
  baseSalary: number
  allowance: number
  recentActivities: { id: string; text: string; date: string }[]
  batchCount?: number
  studentCount?: number
  convertedLeads?: number
  monthlyTarget?: number
  hoursThisWeek?: number
}

interface HRSummary {
  month: string
  totalStaff: number
  trainerCount: number
  bdeCount: number
  totalPayroll: number
  pendingPayroll: number
  draftPayroll: number
  approvedPayroll: number
  releasedPayroll: number
  openClaims: number
  scheduleConflicts: number
  avgAttendance: number
  totalBatches: number
  totalStudents: number
  branches: string[]
  departments: string[]
}

interface PayrollPeriod {
  id: string
  employeeId: string
  month: string
  baseSalary: number
  lateArrivalDeduction: number
  unpaidLeaveDeduction: number
  overtimeAdd: number
  commissionAdd: number
  incentiveAdd: number
  grossPayout: number
  netPayout: number
  status: "Draft" | "Pending Approval" | "Approved" | "Released"
  timeline: { title: string; date: string; description: string }[]
}

interface TrainerCommissionRule {
  employeeId: string
  perBatchPayout: number
  perStudentPayout: number
  attendanceBonusThreshold: number // percentage
  attendanceBonusAmount: number
  studentFeedbackBonusThreshold: number // out of 5
  studentFeedbackBonusAmount: number
  retentionIncentivePct: number
}

interface ReimbursementClaim {
  id: string
  employeeId: string
  employeeName: string
  title: string
  amount: number
  category: "Travel" | "Internet" | "Hardware" | "Others"
  status: "Draft" | "Pending Approval" | "Approved" | "Rejected" | "Released"
  billUrl?: string
  date: string
}

interface ShiftSchedule {
  id: string
  trainerId: string
  trainerName: string
  batchName: string
  roomName: string
  startTime: string
  endTime: string
  dayOfWeek: string
  substituteTrainerId?: string
  conflictWarning?: string
}

interface DocumentItem {
  id: string
  name: string
  category: "Contract" | "ID Proof" | "Tax Document" | "Certificate"
  uploadDate: string
  size: string
  url?: string
}

// --- MOCK SEED DATA REMOVED — loaded dynamically from /api/hr/overview ---

export default function AdvancedHRPage() {
  const { addNotification, user } = useStore()

  // --- COMPONENT STATES ---
  const [viewMode, setViewMode] = React.useState<"admin" | "self">("admin")
  const [loading, setLoading] = React.useState(true)
  const [employees, setEmployees] = React.useState<Employee[]>([])
  const [payrollList, setPayrollList] = React.useState<PayrollPeriod[]>([])
  const [commissionRules, setCommissionRules] = React.useState<TrainerCommissionRule[]>([])
  const [claims, setClaims] = React.useState<ReimbursementClaim[]>([])
  const [schedules, setSchedules] = React.useState<ShiftSchedule[]>([])
  const [vaultDocs, setVaultDocs] = React.useState<DocumentItem[]>([])
  const [departmentDistribution, setDepartmentDistribution] = React.useState<Array<{ name: string; value: number; color: string }>>([])
  const [leaveUtilization, setLeaveUtilization] = React.useState<Array<{ name: string; Used: number; Remaining: number }>>([])
  const [alerts, setAlerts] = React.useState<Array<{ type: string; title: string; message: string }>>([])
  const [aiInsights, setAiInsights] = React.useState<Array<{ title: string; message: string; severity?: string }>>([])
  const [summary, setSummary] = React.useState<HRSummary | null>(null)

  const [rosterSearch, setRosterSearch] = React.useState("")
  const [deptFilter, setDeptFilter] = React.useState("all")
  const [roleFilter, setRoleFilter] = React.useState("all")
  const [branchFilter, setBranchFilter] = React.useState("all")

  // Selection for Employee Drawer
  const [selectedEmp, setSelectedEmp] = React.useState<Employee | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  // Dialog forms
  const [isClaimOpen, setIsClaimOpen] = React.useState(false)
  const [isSubOpen, setIsSubOpen] = React.useState(false)
  const [isUploadOpen, setIsUploadOpen] = React.useState(false)

  // Form states (Reimbursements, schedules)
  const [claimTitle, setClaimTitle] = React.useState("")
  const [claimAmount, setClaimAmount] = React.useState("")
  const [claimCat, setClaimCat] = React.useState<"Travel" | "Internet" | "Hardware" | "Others">("Travel")

  const [schedTargetId, setSchedTargetId] = React.useState("")
  const [substituteId, setSubstituteId] = React.useState("")

  const [newDocName, setNewDocName] = React.useState("")
  const [newDocFile, setNewDocFile] = React.useState<File | null>(null)
  const [isUploadingDoc, setIsUploadingDoc] = React.useState(false)
  const [newDocCat, setNewDocCat] = React.useState<"Contract" | "ID Proof" | "Tax Document" | "Certificate">("Contract")

  // Leaves & calendar settings
  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })

  const selfEmployee = React.useMemo(() => {
    if (!user) return null
    return employees.find(
      (e) => e.id === user.id || e.name.toLowerCase() === user.name?.toLowerCase() || e.name.toLowerCase().includes(user.name?.split(" ")[0]?.toLowerCase() || "")
    ) || employees[0] || null
  }, [employees, user])

  const loadHRData = React.useCallback(async () => {
    try {
      setLoading(true)
      const { api } = await import("@/lib/api")
      const { buildHROverviewFromStaffApis } = await import("@/lib/hrClient")
      const data = await api.getHROverview(selectedMonth)
      setEmployees(data.employees || [])
      setPayrollList(data.payroll || [])
      setCommissionRules(data.commissionRules || [])
      setClaims(data.claims || [])
      setSchedules(data.schedules || [])
      setVaultDocs(data.vaultDocs || [])
      setDepartmentDistribution(data.departmentDistribution || [])
      setLeaveUtilization(data.leaveUtilization || [])
      setAlerts(data.alerts || [])
      setAiInsights(data.aiInsights || [])
      setSummary(data.summary || null)
    } catch (err) {
      console.error("Failed to load HR overview:", err)
      try {
        const { api } = await import("@/lib/api")
        const { buildHROverviewFromStaffApis } = await import("@/lib/hrClient")
        const [trainers, bdes, batches] = await Promise.all([
          api.getTrainers(),
          api.getBdes(),
          api.getBatches(),
        ])
        const overview = buildHROverviewFromStaffApis(trainers || [], bdes || [], batches || [], selectedMonth)
        setEmployees(overview.employees as Employee[])
        setPayrollList(overview.payroll)
        setCommissionRules(overview.commissionRules)
        setClaims(overview.claims as unknown as ReimbursementClaim[])
        setSchedules(overview.schedules as ShiftSchedule[])
        setVaultDocs(overview.vaultDocs as unknown as DocumentItem[])
        setDepartmentDistribution(overview.departmentDistribution)
        setLeaveUtilization(overview.leaveUtilization)
        setAlerts(overview.alerts)
        setAiInsights(overview.aiInsights)
        setSummary(overview.summary)
      } catch (fallbackErr) {
        console.error("HR fallback load failed:", fallbackErr)
        setEmployees([])
      }
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  React.useEffect(() => {
    loadHRData()
  }, [loadHRData])

  const filteredEmployees = React.useMemo(() => {
    const q = rosterSearch.trim().toLowerCase()
    return employees.filter((emp) => {
      if (deptFilter !== "all" && emp.department !== deptFilter) return false
      if (roleFilter !== "all" && emp.role !== roleFilter) return false
      if (branchFilter !== "all" && emp.branch !== branchFilter) return false
      if (!q) return true
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q) ||
        emp.branch.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q)
      )
    })
  }, [employees, rosterSearch, deptFilter, roleFilter, branchFilter])

  const filteredLeaveUtilization = React.useMemo(() => {
    const names = new Set(filteredEmployees.map((e) => e.name.split(" ")[0]))
    return leaveUtilization.filter((row) => names.has(row.name))
  }, [leaveUtilization, filteredEmployees])

  const filteredDeptDistribution = React.useMemo(() => {
    const totals = new Map<string, number>()
    filteredEmployees.forEach((emp) => {
      totals.set(emp.department, (totals.get(emp.department) || 0) + emp.baseSalary)
    })
    const palette: Record<string, string> = {
      "Education & Tech": "#3b82f6",
      "Sales & CRM": "#f59e0b",
      "UI/UX & Design": "#8b5cf6",
      "Operations & Admin": "#10b981",
    }
    return Array.from(totals.entries()).map(([name, value]) => ({
      name,
      value,
      color: palette[name] || "#64748b",
    }))
  }, [filteredEmployees])

  const monthLabel = React.useMemo(() => {
    const [y, m] = selectedMonth.split("-").map(Number)
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
  }, [selectedMonth])

  const pendingClaimsCount = claims.filter((c) => c.status === "Pending Approval" || c.status === "Draft").length
  const conflictCount = schedules.filter((s) => s.conflictWarning).length

  const displaySummary = React.useMemo<HRSummary>(() => {
    if (summary) return summary
    const draftPayroll = payrollList.filter((p) => p.status === "Draft").length
    const pendingPayroll = payrollList.filter((p) => p.status === "Pending Approval").length
    return {
      month: selectedMonth,
      totalStaff: employees.length,
      trainerCount: employees.filter((e) => e.role === "Trainer").length,
      bdeCount: employees.filter((e) => e.role === "BDE").length,
      totalPayroll: payrollList.reduce((s, p) => s + p.netPayout, 0),
      pendingPayroll,
      draftPayroll,
      approvedPayroll: payrollList.filter((p) => p.status === "Approved").length,
      releasedPayroll: payrollList.filter((p) => p.status === "Released").length,
      openClaims: pendingClaimsCount,
      scheduleConflicts: conflictCount,
      avgAttendance: employees.length
        ? Math.round((employees.reduce((s, e) => s + e.attendancePct, 0) / employees.length) * 10) / 10
        : 0,
      totalBatches: employees.reduce((s, e) => s + (e.batchCount || 0), 0),
      totalStudents: employees.reduce((s, e) => s + (e.studentCount || 0), 0),
      branches: Array.from(new Set(employees.map((e) => e.branch))),
      departments: Array.from(new Set(employees.map((e) => e.department))),
    }
  }, [summary, employees, payrollList, selectedMonth, pendingClaimsCount, conflictCount])

  const displayAiInsights = React.useMemo(() => {
    if (aiInsights.length) return aiInsights
    if (!employees.length) return []
    return [
      {
        title: "Payroll composition snapshot",
        message: `${displaySummary.trainerCount} trainers · ${displaySummary.bdeCount} BDEs · ${displaySummary.totalBatches} batches · ${displaySummary.totalStudents} students in commission scope.`,
        severity: "info",
      },
      {
        title: "Cycle status",
        message: displaySummary.draftPayroll === displaySummary.totalStaff
          ? `All ${displaySummary.totalStaff} payroll rows are in Draft — submit from Salary & Timeline to start ${monthLabel}.`
          : `${displaySummary.releasedPayroll} released · ${displaySummary.pendingPayroll} pending approval for ${monthLabel}.`,
        severity: displaySummary.draftPayroll === displaySummary.totalStaff ? "warning" : "success",
      },
    ]
  }, [aiInsights, employees.length, displaySummary, monthLabel])

  // Commission Rules Dialog States
  const [isConfigureRuleOpen, setIsConfigureRuleOpen] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<TrainerCommissionRule | null>(null)
  const [rulePerBatch, setRulePerBatch] = React.useState("0")
  const [rulePerStudent, setRulePerStudent] = React.useState("0")
  const [ruleAttdThreshold, setRuleAttdThreshold] = React.useState("0")
  const [ruleAttdBonus, setRuleAttdBonus] = React.useState("0")
  const [ruleFeedbackThreshold, setRuleFeedbackThreshold] = React.useState("0.0")
  const [ruleFeedbackBonus, setRuleFeedbackBonus] = React.useState("0")
  const [ruleRetentionPct, setRuleRetentionPct] = React.useState("0")

  const handleOpenConfigureRule = (rule: TrainerCommissionRule) => {
    setEditingRule(rule)
    setRulePerBatch(String(rule.perBatchPayout))
    setRulePerStudent(String(rule.perStudentPayout))
    setRuleAttdThreshold(String(rule.attendanceBonusThreshold))
    setRuleAttdBonus(String(rule.attendanceBonusAmount))
    setRuleFeedbackThreshold(String(rule.studentFeedbackBonusThreshold))
    setRuleFeedbackBonus(String(rule.studentFeedbackBonusAmount))
    setRuleRetentionPct(String(rule.retentionIncentivePct))
    setIsConfigureRuleOpen(true)
  }

  const handleSaveConfigureRule = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingRule) return

    const updatedRule: TrainerCommissionRule = {
      ...editingRule,
      perBatchPayout: Number(rulePerBatch) || 0,
      perStudentPayout: Number(rulePerStudent) || 0,
      attendanceBonusThreshold: Number(ruleAttdThreshold) || 0,
      attendanceBonusAmount: Number(ruleAttdBonus) || 0,
      studentFeedbackBonusThreshold: Number(ruleFeedbackThreshold) || 0,
      studentFeedbackBonusAmount: Number(ruleFeedbackBonus) || 0,
      retentionIncentivePct: Number(ruleRetentionPct) || 0
    }

    setCommissionRules((prev) =>
      prev.map((r) => r.employeeId === editingRule.employeeId ? updatedRule : r)
    )

    import("@/lib/api").then(({ api }) =>
      api.upsertHRCommissionRule(updatedRule).then(() => loadHRData())
    )

    addNotification({
      title: "Commission Rules Updated",
      description: `Commission structure updated for trainer.`,
      type: "system"
    })

    setIsConfigureRuleOpen(false)
  }

  // --- AUTOMATED PAYROLL COMPUTATION ALERTS & LOGIC ---
  // Calculates live preview values
  const getPayrollPreview = (emp: Employee) => {
    // Unpaid leave auto deduction logic
    const unpaidDays = emp.leaveBalance.unpaid
    const dailyRate = Math.round(emp.baseSalary / 30)
    const unpaidDeduction = unpaidDays * dailyRate

    // Late arrival auto deduction
    const lateDays = emp.attendancePct < 90 ? 3 : emp.attendancePct < 95 ? 1 : 0
    const lateDeduction = lateDays * 500 // ₹500 flat per late arrival penalty

    // Overtime
    const overtime = emp.attendancePct > 95 ? 1500 : 0

    // Commission rules target
    const rule = commissionRules.find(r => r.employeeId === emp.id)
    const batchCount = (emp as Employee & { batchCount?: number }).batchCount || 0
    const studentCount = (emp as Employee & { studentCount?: number }).studentCount || 0
    const comm = rule ? (rule.perBatchPayout * batchCount) + (rule.perStudentPayout * studentCount) : 0

    // Incentive target
    const inc = emp.performanceScore > 4.5 ? 3000 : 0

    const net = emp.baseSalary + emp.allowance + overtime + comm + inc - unpaidDeduction - lateDeduction

    return {
      unpaidDays,
      unpaidDeduction,
      lateDays,
      lateDeduction,
      overtime,
      comm,
      inc,
      net
    }
  }

  // --- ACTIONS ---

  const handleUpdateClaimStatus = async (id: string, status: ReimbursementClaim["status"]) => {
    const claim = claims.find(c => c.id === id)
    try {
      const { api } = await import("@/lib/api")
      await api.updateHRClaimStatus(id, status)
      await loadHRData()
    } catch {
      setClaims(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    }
    addNotification({
      title: `Reimbursement ${status}`,
      description: `Claim "${claim?.title}" for ₹${claim?.amount} has been updated to ${status}.`,
      type: "fees"
    })
  }

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!claimTitle || !claimAmount || !selfEmployee) return

    try {
      const { api } = await import("@/lib/api")
      await api.createHRClaim({
        employeeId: selfEmployee.id,
        employeeName: selfEmployee.name,
        title: claimTitle,
        amount: parseFloat(claimAmount),
        category: claimCat,
        status: "Pending Approval",
        date: new Date().toISOString().split("T")[0],
      })
      await loadHRData()
    } catch (err) {
      console.error("Failed to create claim:", err)
    }
    setIsClaimOpen(false)
    addNotification({
      title: "Reimbursement Submitted",
      description: `Claim for ₹${claimAmount} created and queued for approval.`,
      type: "fees"
    })

    setClaimTitle("")
    setClaimAmount("")
  }

  const handleAssignSubstitute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schedTargetId || !substituteId) return

    const schedule = schedules.find(s => s.id === schedTargetId)
    const subEmp = employees.find(emp => emp.id === substituteId)
    if (!schedule || !subEmp) return

    try {
      const { api } = await import("@/lib/api")
      await api.assignHRSubstitute({
        batchId: schedule.id,
        trainerId: schedule.trainerId || substituteId,
        trainerName: schedule.trainerName,
        batchName: schedule.batchName,
        roomName: schedule.roomName,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        dayOfWeek: schedule.dayOfWeek,
        substituteTrainerId: substituteId,
        substituteTrainerName: subEmp.name,
        conflictWarning: schedule.conflictWarning,
      })
      await loadHRData()
    } catch (err) {
      console.error("Failed to assign substitute:", err)
    }

    setIsSubOpen(false)
    addNotification({
      title: "Substitute Trainer Mapped",
      description: `Substitute instructor assigned successfully.`,
      type: "system"
    })
  }

  const handleDocUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newDocName || !selfEmployee || !newDocFile) return

    setIsUploadingDoc(true)
    try {
      const { api } = await import("@/lib/api")
      const uploaded = await api.uploadFile(newDocFile, "hr")
      const displayName = newDocName.endsWith(".pdf") ? newDocName : `${newDocName}.pdf`
      const sizeKb = Math.max(1, Math.round((uploaded.size || newDocFile.size) / 1024))
      await api.createHRDocument({
        employeeId: selfEmployee.id,
        name: uploaded.fileName || displayName,
        category: newDocCat,
        uploadDate: new Date().toISOString().split("T")[0],
        size: `${sizeKb} KB`,
        url: uploaded.url,
      })
      await loadHRData()
    } catch (err) {
      console.error("Failed to upload document:", err)
      addNotification({
        title: "Upload Failed",
        description: err instanceof Error ? err.message : "Could not upload document to Cloudinary.",
        type: "system",
      })
      setIsUploadingDoc(false)
      return
    }
    setIsUploadOpen(false)
    addNotification({
      title: "Document Vault Uploaded",
      description: `File "${newDocName.endsWith(".pdf") ? newDocName : `${newDocName}.pdf`}" uploaded successfully.`,
      type: "system"
    })
    setNewDocName("")
    setNewDocFile(null)
    setIsUploadingDoc(false)
  }

  const handleApprovePayroll = async (periodId: string) => {
    if (periodId.startsWith("draft-")) return
    try {
      const { api } = await import("@/lib/api")
      await api.updateHRPayrollStatus(periodId, {
        status: "Approved",
        timelineEntry: { title: "Payroll Approved", date: new Date().toISOString().split("T")[0], description: "Authorized by HR Manager." },
      })
      await loadHRData()
    } catch (err) {
      console.error("Failed to approve payroll:", err)
    }
  }

  const handleReleasePayroll = async (periodId: string) => {
    if (periodId.startsWith("draft-")) return
    try {
      const { api } = await import("@/lib/api")
      await api.updateHRPayrollStatus(periodId, {
        status: "Released",
        timelineEntry: { title: "Salary Released", date: new Date().toISOString().split("T")[0], description: "Payout triggered successfully." },
      })
      await loadHRData()
    } catch (err) {
      console.error("Failed to release payroll:", err)
    }
    addNotification({
      title: "Payroll released",
      description: "Direct bank transfers dispatched.",
      type: "fees"
    })
  }

  // --- STATS DEPARTMENT PAYROLL PIE CHART --- (computed from API)

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  return (
    <PageFeatureGate feature="enableHrModule">
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            <span>Staff Payroll & HR Suite</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enterprise resource toolkit: automated calculations, leave workflows, trainer pay matrices, and AI HR analytics.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-8 w-[150px] text-xs font-semibold"
          />
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadHRData} className="h-8 text-xs">
            Refresh
          </Button>
          <span className="text-xs font-semibold text-muted-foreground">Portal View:</span>
          <div className="flex bg-secondary p-1 rounded-lg border border-border/40">
            <button
              onClick={() => setViewMode("admin")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "admin" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              🏢 HR Admin
            </button>
            <button
              onClick={() => setViewMode("self")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "self" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              👤 Self-Service
            </button>
          </div>
        </div>
      </div>

      {/* Live KPI strip */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {[
          { label: "Active Staff", value: String(displaySummary.totalStaff), sub: `${displaySummary.trainerCount} trainers · ${displaySummary.bdeCount} BDEs`, icon: UserCheck, tone: "text-primary" },
          { label: "Est. Payroll", value: formatCurrency(displaySummary.totalPayroll), sub: monthLabel, icon: DollarSign, tone: "text-emerald-400" },
          { label: "Avg Attendance", value: `${displaySummary.avgAttendance}%`, sub: "This month", icon: TrendingUp, tone: "text-blue-400" },
          { label: "Payroll Queue", value: String(displaySummary.draftPayroll + displaySummary.pendingPayroll), sub: `${displaySummary.draftPayroll} draft · ${displaySummary.pendingPayroll} pending`, icon: Clock, tone: "text-amber-400" },
          { label: "Open Claims", value: String(displaySummary.openClaims), sub: "Needs review", icon: FileText, tone: "text-violet-400" },
          { label: "Schedule Issues", value: String(displaySummary.scheduleConflicts), sub: `${displaySummary.totalBatches} batches mapped`, icon: CalendarDays, tone: "text-rose-400" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card border-border/50">
            <CardContent className="p-3.5 flex items-start gap-2.5">
              <div className={`rounded-lg bg-secondary/40 p-2 ${kpi.tone}`}>
                <kpi.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">{kpi.label}</p>
                <p className="text-sm font-extrabold text-foreground truncate">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground truncate">{kpi.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Smart Proactive HR Alerts Banner */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs leading-normal ${
              alert.type === "penalty"
                ? "border-red-500/20 bg-red-500/5"
                : alert.type === "substitute"
                ? "border-amber-500/20 bg-amber-500/5"
                : "border-blue-500/20 bg-blue-500/5"
            }`}
          >
            {alert.type === "insight" ? (
              <Sparkles className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
            ) : (
              <AlertTriangle className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${alert.type === "penalty" ? "text-red-500" : "text-amber-500"}`} />
            )}
            <div>
              <p className="font-semibold text-foreground">{alert.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>

      {viewMode === "admin" ? (
        /* --- ADMIN MODE PANEL --- */
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="bg-secondary/60 border border-border/80 w-full grid grid-cols-5 mb-5">
            <TabsTrigger value="dashboard" className="text-xs">HR Analytics</TabsTrigger>
            <TabsTrigger value="payroll" className="text-xs relative">
              Salary & Timeline
              {(displaySummary.draftPayroll + displaySummary.pendingPayroll) > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 px-1 text-[9px] font-bold text-amber-500">
                  {displaySummary.draftPayroll + displaySummary.pendingPayroll}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="commissions" className="text-xs">Trainer pay engine</TabsTrigger>
            <TabsTrigger value="schedules" className="text-xs relative">
              Schedules & Substitution
              {conflictCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500/20 px-1 text-[9px] font-bold text-rose-500">
                  {conflictCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="claims" className="text-xs relative">
              Claims & Vault
              {pendingClaimsCount > 0 && (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500/20 px-1 text-[9px] font-bold text-violet-500">
                  {pendingClaimsCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: HR Analytics Dashboard */}
          <TabsContent value="dashboard" className="space-y-6">
            {/* Filters toolbar */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-border/40 bg-secondary/15 p-3">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search staff, branch, role..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="h-8 text-xs w-[160px]">
                  <option value="all">All departments</option>
                  {(displaySummary.departments).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
                <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="h-8 text-xs w-[130px]">
                  <option value="all">All roles</option>
                  <option value="Trainer">Trainer</option>
                  <option value="BDE">BDE</option>
                </Select>
                <Select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="h-8 text-xs w-[150px]">
                  <option value="all">All branches</option>
                  {(displaySummary.branches).map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </Select>
                {(deptFilter !== "all" || roleFilter !== "all" || branchFilter !== "all" || rosterSearch) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => { setDeptFilter("all"); setRoleFilter("all"); setBranchFilter("all"); setRosterSearch("") }}
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Pie Chart: Payroll distribution */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Department Salary Distribution</CardTitle>
                  <CardDescription>Click a department to filter the roster · {monthLabel}</CardDescription>
                </CardHeader>
                <CardContent className="h-56 flex justify-center items-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={filteredDeptDistribution.length ? filteredDeptDistribution : [{ name: "No staff", value: 1, color: "#64748b" }]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        onClick={(_, idx) => {
                          const dep = filteredDeptDistribution[idx]
                          if (dep?.name && dep.name !== "No staff") {
                            setDeptFilter(deptFilter === dep.name ? "all" : dep.name)
                          }
                        }}
                        style={{ cursor: "pointer" }}
                      >
                        {(filteredDeptDistribution.length ? filteredDeptDistribution : [{ name: "No staff", value: 1, color: "#64748b" }]).map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} opacity={deptFilter === "all" || deptFilter === entry.name ? 1 : 0.35} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}
                        formatter={(value) => formatCurrency(Number(value ?? 0))}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="w-1/3 flex flex-col gap-2 text-[10px]">
                    {(filteredDeptDistribution.length ? filteredDeptDistribution : [{ name: "No staff", value: 0, color: "#64748b" }]).map((dep, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setDeptFilter(deptFilter === dep.name ? "all" : dep.name)}
                        className={`flex items-center gap-1.5 text-left cursor-pointer hover:text-foreground transition-colors ${deptFilter === dep.name ? "text-foreground font-bold" : "text-muted-foreground"}`}
                      >
                        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: dep.color }} />
                        <span className="truncate">{dep.name}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Bar Chart: Leave Utilization */}
              <Card className="lg:col-span-2 bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Leave Utilization Index</CardTitle>
                  <CardDescription>
                    {filteredEmployees.length !== employees.length
                      ? `Filtered view · ${filteredEmployees.length} of ${employees.length} staff`
                      : "Comparing approved leaves against active balances this month."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={filteredLeaveUtilization.length ? filteredLeaveUtilization : [{ name: "—", Used: 0, Remaining: 0 }]}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Used" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Remaining" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Employee Roster & Base Salary Matrix */}
            <Card className="bg-card">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                    <User className="h-4.5 w-4.5 text-primary" />
                    <span>Employee Roster & Payroll Matrix</span>
                  </CardTitle>
                  <CardDescription>
                    {filteredEmployees.length} staff shown · click a row for profile, payroll timeline, and vault docs.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-[10px] w-fit">{monthLabel}</Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-secondary/20 border-b border-border/40 text-muted-foreground uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-3">Staff Name</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Department</th>
                        <th className="p-3">Branch</th>
                        <th className="p-3">Workload</th>
                        <th className="p-3">Performance</th>
                        <th className="p-3">Attendance</th>
                        <th className="p-3 text-right">Base</th>
                        <th className="p-3 text-right">Est. Net</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 text-foreground/80">
                      {filteredEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center text-muted-foreground">
                            No staff match your filters. Clear filters or add trainers/BDEs from their management pages.
                          </td>
                        </tr>
                      ) : filteredEmployees.map((emp) => {
                        const preview = getPayrollPreview(emp)
                        const period = payrollList.find((p) => p.employeeId === emp.id)
                        return (
                          <tr
                            key={emp.id}
                            className="hover:bg-secondary/10 transition-colors cursor-pointer"
                            onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true) }}
                          >
                            <td className="p-3 flex items-center gap-2 font-semibold text-foreground">
                              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[9px]">
                                {emp.photo}
                              </div>
                              <div>
                                <span>{emp.name}</span>
                                <p className="text-[10px] text-muted-foreground font-normal font-mono">{emp.joiningDate}</p>
                              </div>
                            </td>
                            <td className="p-3">
                              <Badge variant={emp.role === "Trainer" ? "info" : emp.role === "BDE" ? "warning" : "success"}>
                                {emp.role}
                              </Badge>
                            </td>
                            <td className="p-3 text-muted-foreground">{emp.department}</td>
                            <td className="p-3 text-muted-foreground">{emp.branch}</td>
                            <td className="p-3 text-muted-foreground">
                              {emp.role === "Trainer" ? (
                                <span>{emp.batchCount ?? 0} batches · {emp.studentCount ?? 0} students</span>
                              ) : (
                                <span>{emp.convertedLeads ?? 0}/{emp.monthlyTarget ?? 30} leads</span>
                              )}
                            </td>
                            <td className="p-3">
                              <span className={`font-semibold ${emp.performanceScore >= 4.5 ? "text-emerald-400" : emp.performanceScore >= 3.5 ? "text-foreground" : "text-amber-400"}`}>
                                {emp.performanceScore}/5
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`font-semibold font-mono ${emp.attendancePct >= 95 ? "text-emerald-400" : emp.attendancePct >= 85 ? "text-foreground" : "text-rose-400"}`}>
                                {emp.attendancePct}%
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-foreground font-mono">{formatCurrency(emp.baseSalary)}</td>
                            <td className="p-3 text-right">
                              <span className="font-bold font-mono text-foreground">{formatCurrency(preview.net)}</span>
                              {period && (
                                <p className="text-[10px] text-muted-foreground">{period.status}</p>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* AI workforce insights detail */}
            <Card className="bg-card border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Sparkles className="h-4.5 w-4.5 text-primary" />
                  <span>AI-Powered Workforce Analytics</span>
                </CardTitle>
                <CardDescription>Live flags from attendance, batch load, conversion KPIs, and payroll cycle state · {monthLabel}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-xs">
                {displayAiInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border space-y-1.5 ${
                      insight.severity === "warning"
                        ? "bg-amber-500/5 border-amber-500/20"
                        : insight.severity === "success"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-secondary/25 border-border/30"
                    }`}
                  >
                    <h4 className="font-bold text-foreground flex items-center gap-1.5">
                      {insight.severity === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      {insight.severity === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                      {insight.severity === "info" && <Sparkles className="h-3.5 w-3.5 text-primary" />}
                      {insight.title}
                    </h4>
                    <p className="text-muted-foreground leading-relaxed">{insight.message}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Salary Ledger */}
          <TabsContent value="payroll" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold">Salary Ledger with Automated Deductions</CardTitle>
                <CardDescription>Click any employee row to open their **Complete Profile Drawer** to view timeline history and vault docs.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/20 border-b border-border/40 text-muted-foreground uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Employee Name</th>
                      <th className="p-3">Base Pay</th>
                      <th className="p-3">Unpaid Leaves</th>
                      <th className="p-3">Late Penalty</th>
                      <th className="p-3">Commissions / Incentives</th>
                      <th className="p-3">Net Calculated Payout</th>
                      <th className="p-3">Approval Stage</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-foreground/80">
                    {employees.map((emp) => {
                      // Fetch payroll period or generate auto preview
                      const period = payrollList.find(p => p.employeeId === emp.id)
                      const auto = getPayrollPreview(emp)
                      const currentStatus = period ? period.status : "Draft"

                      return (
                        <tr
                          key={emp.id}
                          className="hover:bg-secondary/15 transition-colors cursor-pointer"
                          onClick={() => { setSelectedEmp(emp); setIsDrawerOpen(true) }}
                        >
                          <td className="p-3 flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                              {emp.photo}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{emp.name}</p>
                              <span className="text-[10px] text-muted-foreground">{emp.role} &bull; {emp.branch}</span>
                            </div>
                          </td>
                          <td className="p-3 font-medium">{formatCurrency(emp.baseSalary)}</td>
                          <td className="p-3 text-rose-400 font-mono">
                            {auto.unpaidDays > 0 ? (
                              <span>-{auto.unpaidDays} Days (-{formatCurrency(auto.unpaidDeduction)})</span>
                            ) : <span className="text-muted-foreground/60">&mdash;</span>}
                          </td>
                          <td className="p-3 text-rose-400 font-mono">
                            {auto.lateDeduction > 0 ? (
                              <span>-{formatCurrency(auto.lateDeduction)}</span>
                            ) : <span className="text-muted-foreground/60">&mdash;</span>}
                          </td>
                          <td className="p-3 text-emerald-400 font-medium font-mono">
                            +{formatCurrency(auto.comm + auto.inc)}
                          </td>
                          <td className="p-3 font-bold text-foreground font-mono">
                            {formatCurrency(auto.net)}
                          </td>
                          <td className="p-3">
                            <Badge className={`
                              ${currentStatus === "Released" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : ""}
                              ${currentStatus === "Approved" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" : ""}
                              ${currentStatus === "Pending Approval" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" : ""}
                              ${currentStatus === "Draft" ? "bg-zinc-800 text-zinc-300 border-zinc-700" : ""}
                            `}>
                              {currentStatus}
                            </Badge>
                          </td>
                          <td className="p-3 text-right" onClick={(e) => e.stopPropagation()}>
                            {currentStatus === "Draft" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const { api } = await import("@/lib/api")
                                    await api.submitHRPayroll({
                                      employeeId: emp.id,
                                      employeeType: emp.role === "Trainer" ? "trainer" : "bde",
                                      month: selectedMonth,
                                      baseSalary: emp.baseSalary,
                                      lateArrivalDeduction: auto.lateDeduction,
                                      unpaidLeaveDeduction: auto.unpaidDeduction,
                                      overtimeAdd: auto.overtime,
                                      commissionAdd: auto.comm,
                                      incentiveAdd: auto.inc,
                                      grossPayout: emp.baseSalary + emp.allowance + auto.overtime + auto.comm + auto.inc,
                                      netPayout: auto.net,
                                    })
                                    await loadHRData()
                                  } catch (err) {
                                    console.error("Failed to submit payroll:", err)
                                  }
                                }}
                                className="h-7 text-[10px]"
                              >
                                Submit Approval
                              </Button>
                            )}
                            {currentStatus === "Pending Approval" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApprovePayroll(period!.id)}
                                className="h-7 text-[10px] border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                              >
                                Authorize Release
                              </Button>
                            )}
                            {currentStatus === "Approved" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleReleasePayroll(period!.id)}
                                className="h-7 text-[10px]"
                              >
                                Release payout
                              </Button>
                            )}
                            {currentStatus === "Released" && (
                              <span className="text-[10px] text-muted-foreground/60 italic flex items-center justify-end gap-1"><Check className="h-3.5 w-3.5 text-emerald-400" /> Dispatched</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 3: Trainer Payout Commission Engine */}
          <TabsContent value="commissions" className="space-y-4">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold">Coaching Institute Commission Engine Matrix</CardTitle>
                <CardDescription>Setup specialized variable payout scales: per-batch, per-student count, attendance benchmarks, and student satisfaction feedback indexes.</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/20 border-b border-border/40 text-muted-foreground uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Trainer Faculty</th>
                      <th className="p-3">Per-Batch Pay</th>
                      <th className="p-3">Per-Student Pay</th>
                      <th className="p-3">Attendance Bonus (Threshold)</th>
                      <th className="p-3">Feedback Bonus (Score)</th>
                      <th className="p-3">Retention Reward</th>
                      <th className="p-3 text-right">Engine Setup</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-foreground/80">
                    {commissionRules.map((rule) => {
                      const trainer = employees.find(e => e.id === rule.employeeId)
                      return (
                        <tr key={rule.employeeId} className="hover:bg-secondary/15 transition-colors">
                          <td className="p-3 font-semibold text-foreground">{trainer?.name}</td>
                          <td className="p-3 font-medium font-mono">{formatCurrency(rule.perBatchPayout)} / batch</td>
                          <td className="p-3 font-medium font-mono">{formatCurrency(rule.perStudentPayout)} / head</td>
                          <td className="p-3 font-mono">
                            <span className="text-emerald-400">+{formatCurrency(rule.attendanceBonusAmount)}</span> (if &gt; {rule.attendanceBonusThreshold}%)
                          </td>
                          <td className="p-3 font-mono">
                            <span className="text-emerald-400">+{formatCurrency(rule.studentFeedbackBonusAmount)}</span> (if &gt; {rule.studentFeedbackBonusThreshold})
                          </td>
                          <td className="p-3 font-bold text-foreground">+{rule.retentionIncentivePct}% Retention</td>
                          <td className="p-3 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenConfigureRule(rule)}
                              className="h-7 text-[10px]"
                            >
                              Configure Rules
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 4: Shift & Substitution schedule */}
          <TabsContent value="schedules" className="space-y-4">
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-sm font-extrabold">Active Academic Shift Planner & Conflicts</CardTitle>
                  <CardDescription>Maps trainers, class slots, and alerts substitute teachers for sudden leaves/room overlaps.</CardDescription>
                </div>
                <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsSubOpen(true)}>Map Substitute</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-secondary/20 border-b border-border/40 text-muted-foreground uppercase font-bold text-[10px]">
                    <tr>
                      <th className="p-3">Lecturer</th>
                      <th className="p-3">Enrolled Batch</th>
                      <th className="p-3">Room Target</th>
                      <th className="p-3">Day / Time Slot</th>
                      <th className="p-3">Status / Warning</th>
                      <th className="p-3 text-right">Options</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30 text-foreground/80">
                    {schedules.map((sched) => (
                      <tr key={sched.id} className="hover:bg-secondary/15 transition-colors">
                        <td className="p-3 font-semibold text-foreground">{sched.trainerName}</td>
                        <td className="p-3 text-muted-foreground font-medium">{sched.batchName}</td>
                        <td className="p-3 font-medium">{sched.roomName}</td>
                        <td className="p-3">{sched.dayOfWeek} &bull; {sched.startTime} to {sched.endTime}</td>
                        <td className="p-3">
                          {sched.conflictWarning ? (
                            <span className="flex items-center gap-1.5 text-rose-400 font-bold bg-rose-500/5 px-2 py-0.5 rounded-lg border border-rose-500/10">
                              <AlertTriangle className="h-3 w-3" /> Time conflict detected
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded-lg border border-emerald-500/10">
                              <CheckCircle2 className="h-3 w-3" /> Scheduled cleanly
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSchedTargetId(sched.id); setIsSubOpen(true) }}
                            className="h-7 text-[10px]"
                          >
                            Assign Substitute
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* Tab 5: Claims & Vault */}
          <TabsContent value="claims" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Claims Approval flow */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-sm font-extrabold">Travel & Expenses Reimbursements Queue</CardTitle>
                  <CardDescription>Workflow stages: Pending ➔ Approved ➔ Released.</CardDescription>
                </CardHeader>
                <div className="divide-y divide-border/30">
                  {claims.map((claim) => (
                    <div key={claim.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{claim.title}</p>
                        <span className="text-[10px] text-muted-foreground">{claim.employeeName} &bull; {claim.category} &bull; {claim.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground mr-2 font-mono">{formatCurrency(claim.amount)}</span>
                        <Badge className={`
                          ${claim.status === "Released" ? "bg-emerald-500/10 text-emerald-400" : ""}
                          ${claim.status === "Approved" ? "bg-blue-500/10 text-blue-400" : ""}
                          ${claim.status === "Pending Approval" ? "bg-amber-500/10 text-amber-400" : ""}
                        `}>
                          {claim.status}
                        </Badge>
                        {claim.status === "Pending Approval" && (
                          <div className="flex gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateClaimStatus(claim.id, "Approved")}
                              className="h-6 text-[9px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 px-2"
                            >
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateClaimStatus(claim.id, "Rejected")}
                              className="h-6 text-[9px] border-rose-500/30 text-rose-400 hover:bg-rose-500/10 px-2"
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {claim.status === "Approved" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateClaimStatus(claim.id, "Released")}
                            className="h-6 text-[9px] px-2"
                          >
                            Disburse Cash
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Document Vault */}
              <Card className="bg-card">
                <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-extrabold">Employee Document Vault</CardTitle>
                    <CardDescription>Archive employment agreements, contracts, and tax receipts securely.</CardDescription>
                  </div>
                  <Button variant="primary" size="sm" icon={UploadCloud} onClick={() => setIsUploadOpen(true)}>Upload</Button>
                </CardHeader>
                <div className="divide-y divide-border/30">
                  {vaultDocs.map((doc) => (
                    <div key={doc.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-secondary/10 transition-all">
                      <div className="flex items-center gap-2">
                        <File className="h-4 w-4 text-primary shrink-0" />
                        <div>
                          {doc.url ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-foreground truncate max-w-[200px] hover:text-primary"
                              title={doc.name}
                            >
                              {doc.name}
                            </a>
                          ) : (
                            <p className="font-semibold text-foreground truncate max-w-[200px]" title={doc.name}>{doc.name}</p>
                          )}
                          <span className="text-[10px] text-muted-foreground">{doc.category} &bull; {doc.size}</span>
                        </div>
                      </div>
                      <span className="text-muted-foreground">{doc.uploadDate}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* --- EMPLOYEE SELF-SERVICE VIEW --- */
        <div className="grid gap-6 md:grid-cols-3">
          {/* Left panel: Employee Profile Info */}
          <div className="space-y-4">
            {selfEmployee ? (
              <>
            <Card className="bg-card">
              <CardContent className="p-5 flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground text-2xl font-bold flex items-center justify-center">
                  {selfEmployee.photo}
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">{selfEmployee.name}</h3>
                  <span className="text-xs text-muted-foreground">{selfEmployee.role} &bull; {selfEmployee.department}</span>
                </div>
                <div className="w-full grid grid-cols-2 gap-2 pt-4 border-t border-border/40 text-left text-xs text-muted-foreground">
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Joined Date</span>
                    <span className="text-foreground">{selfEmployee.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold block">Manager</span>
                    <span className="text-foreground">{selfEmployee.reportingManager}</span>
                  </div>
                  <div className="col-span-2 pt-2">
                    <span className="text-[10px] uppercase font-bold block">Bank details verified</span>
                    <span className="text-foreground font-mono">{selfEmployee.bankDetails.bank} {selfEmployee.bankDetails.account}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold">My Leave Balances</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-secondary rounded-lg border border-border/40">
                  <p className="font-bold text-foreground">{selfEmployee.leaveBalance.casual} Days</p>
                  <p className="text-[9px] text-muted-foreground">Casual</p>
                </div>
                <div className="p-2 bg-secondary rounded-lg border border-border/40">
                  <p className="font-bold text-foreground">{selfEmployee.leaveBalance.sick} Days</p>
                  <p className="text-[9px] text-muted-foreground">Sick</p>
                </div>
                <div className="p-2 bg-secondary rounded-lg border border-border/40">
                  <p className="font-bold text-rose-400">{selfEmployee.leaveBalance.unpaid} Days</p>
                  <p className="text-[9px] text-muted-foreground">Unpaid</p>
                </div>
              </CardContent>
            </Card>
              </>
            ) : (
              <Card className="bg-card p-6 text-xs text-muted-foreground">No staff profile matched to your login. Switch to HR Admin view or add yourself as trainer/BDE.</Card>
            )}
          </div>

          {/* Right panel: Self Service actions */}
          <div className="md:col-span-2 space-y-6">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsClaimOpen(true)}>Apply Reimbursement</Button>
              <Button variant="outline" size="sm" icon={UploadCloud} onClick={() => setIsUploadOpen(true)}>Upload Proof Document</Button>
            </div>

            {/* Payslips Generator History */}
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/40">
                <CardTitle className="text-sm font-extrabold">My Historical Payslips</CardTitle>
                <CardDescription>Generate printable/downloadable PDF format payslips with full tax breakdown summaries.</CardDescription>
              </CardHeader>
              <div className="divide-y divide-border/30">
                {payrollList
                  .filter(p => selfEmployee && p.employeeId === selfEmployee.id)
                  .map((period) => (
                    <div key={period.id} className="p-4 flex items-center justify-between text-xs hover:bg-secondary/10 transition-all">
                      <div>
                        <p className="font-bold text-foreground">Payslip for Month: {period.month}</p>
                        <span className="text-[10px] text-muted-foreground">Net Payout Transferred: {formatCurrency(period.netPayout)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="success">Paid</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Download}
                          onClick={() => {
                            alert(`Downloading Payslip for ${period.month}\nBase Salary: ${formatCurrency(period.baseSalary)}\nIncentives: ${formatCurrency(period.incentiveAdd)}\nDeductions: -${formatCurrency(period.unpaidLeaveDeduction)}\nNet Payout: ${formatCurrency(period.netPayout)}`)
                          }}
                          className="h-7 text-[10px]"
                        >
                          Payslip
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>

            {/* My Active Expense Claims */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-extrabold">My Reimbursement Claims</CardTitle>
              </CardHeader>
              <div className="divide-y divide-border/30">
                {claims
                  .filter(c => selfEmployee && c.employeeId === selfEmployee.id)
                  .map((claim) => (
                    <div key={claim.id} className="p-3.5 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-semibold text-foreground">{claim.title}</p>
                        <span className="text-[10px] text-muted-foreground">{claim.category} &bull; {claim.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground font-mono">{formatCurrency(claim.amount)}</span>
                        <Badge>{claim.status}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* --- EMPLOYEE PROFILE DRAWER --- */}
      {isDrawerOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={() => setIsDrawerOpen(false)} />

          {/* Side Drawer Content */}
          <div className="relative w-full max-w-lg bg-card h-full flex flex-col justify-between shadow-2xl border-l border-border/80 z-10 animate-slide-in-right">
            {/* Header info */}
            <div className="p-5 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedEmp.photo}
                </div>
                <div>
                  <h2 className="font-bold text-base text-foreground">{selectedEmp.name}</h2>
                  <span className="text-xs text-muted-foreground">{selectedEmp.role} &bull; {selectedEmp.department}</span>
                </div>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer text-sm font-bold">Close Drawer</button>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs text-muted-foreground">
              {/* Summary index Cards */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-3 bg-secondary rounded-xl border border-border/30">
                  <p className="font-black text-foreground text-sm">{selectedEmp.attendancePct}%</p>
                  <p className="text-[9px] uppercase font-semibold">Attendance</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl border border-border/30">
                  <p className="font-black text-foreground text-sm">{selectedEmp.performanceScore} / 5</p>
                  <p className="text-[9px] uppercase font-semibold">KPI Score</p>
                </div>
                <div className="p-3 bg-secondary rounded-xl border border-border/30">
                  <p className="font-black text-foreground text-sm font-mono">{formatCurrency(selectedEmp.baseSalary)}</p>
                  <p className="text-[9px] uppercase font-semibold">Base pay</p>
                </div>
              </div>

              {/* Bank Details section */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Verified Bank Details</h4>
                <div className="p-3 bg-secondary/35 rounded-xl border border-border/30 grid grid-cols-2 gap-y-1.5">
                  <div>
                    <span className="text-[9px] block">Holder Name</span>
                    <strong className="text-foreground">{selectedEmp.bankDetails.holder}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] block">Bank Name</span>
                    <strong className="text-foreground">{selectedEmp.bankDetails.bank}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] block">Account Number</span>
                    <strong className="text-foreground font-mono">{selectedEmp.bankDetails.account}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] block">IFSC Code</span>
                    <strong className="text-foreground font-mono">{selectedEmp.bankDetails.ifsc}</strong>
                  </div>
                </div>
              </div>

              {/* Payroll Timeline Ledger */}
              <div className="space-y-3">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Payroll Release Timeline</h4>
                {payrollList.find(p => p.employeeId === selectedEmp.id) ? (
                  <div className="relative pl-4 border-l border-border/85 space-y-4">
                    {payrollList.find(p => p.employeeId === selectedEmp.id)?.timeline.map((step, idx) => (
                      <div key={idx} className="relative">
                        <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-primary border border-background shrink-0" />
                        <p className="font-bold text-foreground text-[11px]">{step.title} &bull; <span className="font-normal text-[10px] text-muted-foreground">{step.date}</span></p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 leading-normal">{step.description}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] italic text-muted-foreground/60 py-2">No payroll timelines logged for this staff member yet.</p>
                )}
              </div>

              {/* Documents Vault Checklist */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Documents Checklist Vault</h4>
                <div className="grid gap-2">
                  {vaultDocs.map((doc) => (
                    <div key={doc.id} className="p-2 bg-secondary rounded-lg border border-border/30 flex items-center justify-between">
                      <span className="font-medium text-foreground truncate max-w-[200px]">{doc.name}</span>
                      <Badge className="bg-zinc-800 text-zinc-300 text-[9px]">{doc.category}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent Activity Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-foreground uppercase tracking-wider text-[10px]">Recent HR Activities</h4>
                <div className="space-y-2">
                  {selectedEmp.recentActivities.map((act) => (
                    <p key={act.id} className="text-[10px] border-b border-border/20 pb-1.5 flex justify-between gap-2">
                      <span className="text-foreground/80 font-medium">{act.text}</span>
                      <span className="text-muted-foreground whitespace-nowrap">{act.date}</span>
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="p-5 border-t border-border/40 bg-secondary/10 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsDrawerOpen(false)}>Close Panel</Button>
            </div>
          </div>
        </div>
      )}

      {/* --- FORMS & MODALS --- */}

      {/* Submit Reimbursement Modal */}
      <Dialog
        isOpen={isClaimOpen}
        onClose={() => setIsClaimOpen(false)}
        title="Submit Reimbursement Claim"
        description="Fills expense receipts for approval workflows."
      >
        <form onSubmit={handleCreateClaim} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Expense Title</label>
            <Input
              placeholder="e.g. Travel tickets to downtown campus"
              value={claimTitle}
              onChange={(e) => setClaimTitle(e.target.value)}
              className="bg-card text-xs h-9"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Category</label>
              <Select
                value={claimCat}
                onChange={(e) => setClaimCat(e.target.value as any)}
                className="bg-card text-xs h-9"
              >
                <option value="Travel">Travel Claim</option>
                <option value="Internet">Internet Bills</option>
                <option value="Hardware">Hardware Purchases</option>
                <option value="Others">Others</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Amount (₹)</label>
              <Input
                type="number"
                placeholder="e.g. 150"
                value={claimAmount}
                onChange={(e) => setClaimAmount(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsClaimOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Submit Claim
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Substitute mapping modal */}
      <Dialog
        isOpen={isSubOpen}
        onClose={() => setIsSubOpen(false)}
        title="Map Substitute Trainer"
        description="Assign a substitute instructor for scheduled lectures."
      >
        <form onSubmit={handleAssignSubstitute} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Select lecture target</label>
            <Select
              value={schedTargetId}
              onChange={(e) => setSchedTargetId(e.target.value)}
              className="bg-card text-xs h-9.5"
            >
              <option value="">-- Select Lecture slot --</option>
              {schedules.map((s) => (
                <option key={s.id} value={s.id}>{s.batchName} ({s.trainerName})</option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Select substitute trainer</label>
            <Select
              value={substituteId}
              onChange={(e) => setSubstituteId(e.target.value)}
              className="bg-card text-xs h-9.5"
            >
              <option value="">-- Choose Instructor --</option>
              {employees.filter(e => e.role === "Trainer").map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </Select>
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsSubOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Assignment
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Upload Document Modal */}
      <Dialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Verification Document"
        description="Upload verification proofs, contracts, or tax receipts to the vault."
      >
        <form onSubmit={handleDocUpload} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Document Name</label>
            <Input
              placeholder="e.g. Identity_Proof_Passport"
              value={newDocName}
              onChange={(e) => setNewDocName(e.target.value)}
              className="bg-card text-xs h-9"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Document Category</label>
            <Select
              value={newDocCat}
              onChange={(e) => setNewDocCat(e.target.value as any)}
              className="bg-card text-xs h-9"
            >
              <option value="Contract">Employment Contract</option>
              <option value="ID Proof">Government ID Proof</option>
              <option value="Tax Document">Tax Receipt / W9 Form</option>
              <option value="Certificate">Professional Certificate</option>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">File (PDF, image, or document)</label>
            <Input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,image/*,application/pdf"
              onChange={(e) => setNewDocFile(e.target.files?.[0] || null)}
              className="bg-card text-xs h-9"
              required
            />
            {newDocFile ? (
              <p className="text-[10px] text-muted-foreground truncate">{newDocFile.name}</p>
            ) : null}
          </div>
          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isUploadingDoc || !newDocFile}>
              {isUploadingDoc ? "Uploading…" : "Upload File"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Configure Commission Rules Modal */}
      <Dialog
        isOpen={isConfigureRuleOpen}
        onClose={() => setIsConfigureRuleOpen(false)}
        title={`Configure Payout Matrix: ${employees.find(e => e.id === editingRule?.employeeId)?.name || ""}`}
        description="Establish baseline batch rates, per-student bonuses, and incentive triggers."
      >
        <form onSubmit={handleSaveConfigureRule} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Per-Batch Pay (₹)</label>
              <Input
                type="number"
                value={rulePerBatch}
                onChange={(e) => setRulePerBatch(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Per-Student Head Pay (₹)</label>
              <Input
                type="number"
                value={rulePerStudent}
                onChange={(e) => setRulePerStudent(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Attendance Bonus Threshold (%)</label>
              <Input
                type="number"
                value={ruleAttdThreshold}
                onChange={(e) => setRuleAttdThreshold(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Attendance Bonus Amount (₹)</label>
              <Input
                type="number"
                value={ruleAttdBonus}
                onChange={(e) => setRuleAttdBonus(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Feedback Score Threshold</label>
              <Input
                type="number"
                step="0.1"
                value={ruleFeedbackThreshold}
                onChange={(e) => setRuleFeedbackThreshold(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Feedback Bonus Amount (₹)</label>
              <Input
                type="number"
                value={ruleFeedbackBonus}
                onChange={(e) => setRuleFeedbackBonus(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Student Retention Incentive (%)</label>
            <Input
              type="number"
              value={ruleRetentionPct}
              onChange={(e) => setRuleRetentionPct(e.target.value)}
              className="bg-card text-xs h-9"
              required
            />
          </div>

          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsConfigureRuleOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Rules
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
    </PageFeatureGate>
  )
}
