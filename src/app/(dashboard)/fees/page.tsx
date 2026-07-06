"use client"

import * as React from "react"
import { CreditCard, IndianRupee, Download, Send, Search, AlertCircle, FileText, Edit2, Trash2, Check } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { KPICard } from "@/components/dashboard/KPICard"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { useStore } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import {
  buildInstallmentSchedule,
  computeInstallmentRows,
  getInstallmentLabel,
  isFullyPaid,
  normalizeInstallmentSchedule,
  prepareScheduleForEdit,
  resolveNextDueDate,
  sumScheduleAmounts,
  updateScheduleAmountAtIndex,
  type InstallmentScheduleItem,
} from "@/lib/installments"

interface Installment {
  id: string
  studentName: string
  installmentName: string
  amount: number
  dueDate: string
  status: "paid" | "pending" | "overdue"
  feesPaid: number
  feesTotal: number
}

export default function FeesPage() {
  const { user, addNotification } = useStore()
  const { scholarshipTrackingEnabled } = useCenterPolicy()
  const [students, setStudents] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedMonth, setSelectedMonth] = React.useState<string>("all")
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  
  // Form state
  const [formData, setFormData] = React.useState({
    studentId: "",
    studentName: "",
    feesTotal: "",
    feesPaid: "",
    installmentsCount: "3",
    schedule: [] as InstallmentScheduleItem[],
    scholarshipAmount: "",
    scholarshipNotes: "",
  })

  const formFullyPaid = React.useMemo(() => {
    const total = Number(formData.feesTotal) || 0
    const paid = Number(formData.feesPaid) || 0
    return isFullyPaid(paid, total)
  }, [formData.feesTotal, formData.feesPaid])

  const formScheduleTotal = React.useMemo(
    () => sumScheduleAmounts(formData.schedule),
    [formData.schedule]
  )

  const formFeesTotalNum = Number(formData.feesTotal) || 0
  const formFeesPaidNum = Number(formData.feesPaid) || 0
  const formRemaining = Math.max(0, formFeesTotalNum - formFeesPaidNum)
  const formHasCollected = formFeesPaidNum > 0 && formFeesPaidNum < formFeesTotalNum && !formFullyPaid
  const scheduleMatchesTotal =
    formFullyPaid || Math.abs(formScheduleTotal - formFeesTotalNum) <= 1
  const scheduleDifference = formFeesTotalNum - formScheduleTotal

  const rebuildSchedule = (
    prev: typeof formData,
    overrides?: Partial<{ feesTotal: number; feesPaid: number; installmentsCount: number }>
  ) =>
    buildInstallmentSchedule({
      feesTotal: overrides?.feesTotal ?? (Number(prev.feesTotal) || 0),
      feesPaid: overrides?.feesPaid ?? (Number(prev.feesPaid) || 0),
      installmentsCount:
        overrides?.installmentsCount ??
        (Number(prev.installmentsCount) || prev.schedule.length || 3),
      nextDueDate: prev.schedule[0]?.dueDate,
      preserve: prev.schedule,
    })

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  const fetchStudents = async () => {
    try {
      setLoading(true)
      if (user?.role === "student") {
        const studentProfile = await api.getStudentProfile()
        setStudents(studentProfile ? [studentProfile] : [])
      } else {
        const data = await api.getStudents()
        setStudents(data || [])
      }
    } catch (err) {
      console.error("Failed to fetch students in fees ledger:", err)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    if (user) {
      fetchStudents()
    }
  }, [user])

  // Map student records to installments
  const installments = React.useMemo<Installment[]>(() => {
    return students.flatMap((student) => {
      const rows = computeInstallmentRows(student)
      const outstanding = Math.max(0, (student.feesTotal || 0) - (student.feesPaid || 0))

      if (outstanding <= 0) {
        return [{
          id: student.id || student._id,
          studentName: student.name,
          installmentName: "Fully Cleared",
          amount: 0,
          dueDate: "",
          status: "paid" as const,
          feesPaid: student.feesPaid,
          feesTotal: student.feesTotal,
        }]
      }

      const current = rows.find((row) => row.status === "overdue" || row.status === "partial" || row.status === "pending")
      if (!current) {
        return [{
          id: student.id || student._id,
          studentName: student.name,
          installmentName: "Installment Dues (Outstanding)",
          amount: outstanding,
          dueDate: resolveNextDueDate(student) || "",
          status: "pending" as const,
          feesPaid: student.feesPaid,
          feesTotal: student.feesTotal,
        }]
      }

      return [{
        id: student.id || student._id,
        studentName: student.name,
        installmentName: `${current.label} (${current.number}/${rows.length})`,
        amount: current.dueAmount,
        dueDate: current.dueDate,
        status: current.status === "overdue" ? "overdue" as const : current.status === "partial" ? "pending" as const : current.status,
        feesPaid: student.feesPaid,
        feesTotal: student.feesTotal,
      }]
    })
  }, [students])

  // Dynamically compute unique months from due dates
  const monthsList = React.useMemo(() => {
    const months = new Set<string>()
    installments.forEach(inst => {
      if (inst.dueDate) {
        try {
          const date = new Date(inst.dueDate)
          const monthName = date.toLocaleString("default", { month: "long" })
          const year = date.getFullYear()
          months.add(`${monthName} ${year}`)
        } catch (e) {
          // ignore invalid date parsing
        }
      }
    })
    return Array.from(months).sort((a, b) => {
      const dateA = new Date(a)
      const dateB = new Date(b)
      return dateA.getTime() - dateB.getTime()
    })
  }, [installments])

  // Dynamic stats calculation for KPI Cards
  const stats = React.useMemo(() => {
    const collected = students.reduce((sum, s) => sum + (s.feesPaid || 0), 0)
    const outstanding = students.reduce((sum, s) => sum + Math.max(0, (s.feesTotal || 0) - (s.feesPaid || 0)), 0)
    
    return {
      collected,
      outstanding,
    }
  }, [students])

  const studentProfile = React.useMemo(() => {
    if (user?.role === "student" && students.length > 0) {
      return students[0]
    }
    return null
  }, [students, user])

  // Dynamic chart data grouping by course
  const feeLogs = React.useMemo(() => {
    const groups: { [course: string]: { Paid: number; Dues: number } } = {}
    students.forEach(student => {
      const course = student.course || "Other Courses"
      if (!groups[course]) {
        groups[course] = { Paid: 0, Dues: 0 }
      }
      groups[course].Paid += student.feesPaid || 0
      groups[course].Dues += Math.max(0, (student.feesTotal || 0) - (student.feesPaid || 0))
    })
    return Object.entries(groups).map(([course, data]) => ({
      course,
      Paid: data.Paid,
      Dues: data.Dues
    }))
  }, [students])

  const filteredInstallments = installments.filter((item) => {
    const matchesSearch = item.studentName.toLowerCase().includes(searchQuery.toLowerCase())
    if (selectedMonth === "all") return matchesSearch
    
    try {
      const date = new Date(item.dueDate)
      const monthName = date.toLocaleString("default", { month: "long" })
      const year = date.getFullYear()
      const itemMonth = `${monthName} ${year}`
      return matchesSearch && itemMonth === selectedMonth
    } catch (e) {
      return matchesSearch
    }
  })

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedMonth])

  const totalPages = Math.ceil(filteredInstallments.length / itemsPerPage)

  const paginatedInstallments = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredInstallments.slice(start, start + itemsPerPage)
  }, [filteredInstallments, currentPage, itemsPerPage])

  const handleDownloadInvoice = (id: string, name: string) => {
    addNotification({
      title: "Invoice Downloaded",
      description: `Receipt PDF downloaded for student ${name}.`,
      type: "fees"
    })
    alert(`Downloaded invoice receipt: receipt-${id}.pdf successfully!`)
  }

  const handleSendReminder = (name: string) => {
    addNotification({
      title: "Dues Reminder Sent",
      description: `Payment warning SMS & Email dispatched to ${name}.`,
      type: "fees"
    })
    alert(`Reminder dispatched: Payment link sent to ${name}'s contact numbers.`)
  }

  const handleMarkAsPaid = async (studentId: string, studentName: string) => {
    const student = students.find(s => (s.id || s._id) === studentId)
    if (!student) return
    try {
      await api.updateStudentFees(studentId, {
        feesPaid: student.feesTotal,
        feesTotal: student.feesTotal,
        nextDueDate: null,
        installmentSchedule: normalizeInstallmentSchedule(student).map((item) => ({
          ...item,
          dueDate: item.dueDate,
        })),
        installmentsCount: student.installmentsCount || normalizeInstallmentSchedule(student).length,
      })
      addNotification({
        title: "Fee Payment Received",
        description: `Marked installment as paid for ${studentName}.`,
        type: "fees"
      })
      await fetchStudents()
    } catch (err: any) {
      console.error("Failed to update student fees:", err)
      alert(err.message || "Failed to mark installment as paid.")
    }
  }

  const handleDelete = (id: string, studentName: string) => {
    if (confirm(`Are you sure you want to delete this installment record for ${studentName}?`)) {
      setStudents(prev => prev.filter(s => (s.id || s._id) !== id))
      addNotification({
        title: "Installment Deleted",
        description: `Removed installment record for ${studentName}.`,
        type: "fees"
      })
    }
  }

  const handleEdit = (inst: Installment) => {
    const student = students.find((s) => (s.id || s._id) === inst.id)
    if (!student) return

    const feesTotal = student.feesTotal ?? inst.feesTotal ?? 0
    const feesPaid = student.feesPaid ?? inst.feesPaid ?? 0
    const schedule = prepareScheduleForEdit({
      feesTotal,
      feesPaid,
      installmentsCount: student.installmentsCount,
      enrollmentDate: student.enrollmentDate,
      nextDueDate: student.nextDueDate,
      installmentSchedule: student.installmentSchedule,
    })

    setFormData({
      studentId: inst.id,
      studentName: inst.studentName,
      feesTotal: String(feesTotal),
      feesPaid: String(feesPaid),
      installmentsCount: String(schedule.length || student.installmentsCount || 3),
      schedule,
      scholarshipAmount: String(student.scholarshipAmount ?? 0),
      scholarshipNotes: String(student.scholarshipNotes ?? ""),
    })
    setIsModalOpen(true)
  }

  const updateScheduleCount = (count: number) => {
    const safeCount = Math.max(1, Math.min(12, count))
    setFormData((prev) => ({
      ...prev,
      installmentsCount: String(safeCount),
      schedule: rebuildSchedule(prev, { installmentsCount: safeCount }),
    }))
  }

  const updateScheduleItem = (index: number, field: "amount" | "dueDate" | "label", value: string) => {
    setFormData((prev) => {
      const total = Number(prev.feesTotal) || 0
      const paid = Number(prev.feesPaid) || 0

      if (field === "amount") {
        return {
          ...prev,
          schedule: updateScheduleAmountAtIndex(
            prev.schedule,
            index,
            Number(value) || 0,
            total,
            paid
          ),
        }
      }

      return {
        ...prev,
        schedule: prev.schedule.map((item, idx) =>
          idx === index ? { ...item, [field]: value } : item
        ),
      }
    })
  }

  const handleEvenSplit = () => {
    setFormData((prev) => ({
      ...prev,
      schedule: rebuildSchedule(prev),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.feesTotal || formData.feesPaid === "") {
      alert("Please fill in total fees and fees paid.")
      return
    }

    const totalNum = parseFloat(formData.feesTotal)
    const paidNum = parseFloat(formData.feesPaid)
    if (isNaN(totalNum) || totalNum <= 0 || isNaN(paidNum) || paidNum < 0) {
      alert("Please enter valid positive numbers.")
      return
    }

    if (!formFullyPaid) {
      if (!formData.schedule.length) {
        alert("Add at least one installment.")
        return
      }
      if (formData.schedule.some((item) => !item.dueDate)) {
        alert("Each installment needs a due date.")
        return
      }
      if (!scheduleMatchesTotal) {
        alert(`Installment amounts must add up to total fees (${formatCurrency(totalNum)}). Current total: ${formatCurrency(formScheduleTotal)}.`)
        return
      }
    }

    const scheduleToSave = formFullyPaid
      ? formData.schedule
      : formData.schedule.map((item, index) => ({
          amount: Number(item.amount) || 0,
          dueDate: item.dueDate,
          label: item.label || getInstallmentLabel(index, formData.schedule.length),
        }))

    const nextDueDate = formFullyPaid
      ? null
      : resolveNextDueDate({
          feesPaid: paidNum,
          feesTotal: totalNum,
          installmentsCount: Number(formData.installmentsCount),
          installmentSchedule: scheduleToSave,
        }) || null

    try {
      await api.updateStudentFees(formData.studentId, {
        feesPaid: paidNum,
        feesTotal: totalNum,
        nextDueDate,
        installmentsCount: Number(formData.installmentsCount),
        installmentSchedule: scheduleToSave.map((item, index) => ({
          amount: Number(item.amount) || 0,
          dueDate: item.dueDate,
          label: item.label || getInstallmentLabel(index, scheduleToSave.length),
        })),
        ...(scholarshipTrackingEnabled
          ? {
              scholarshipAmount: Number(formData.scholarshipAmount) || 0,
              scholarshipNotes: formData.scholarshipNotes,
            }
          : {}),
      })
      addNotification({
        title: "Installment Updated",
        description: formFullyPaid
          ? `${formData.studentName} is fully cleared. Due date removed.`
          : `Updated installment details for ${formData.studentName}.`,
        type: "fees"
      })
      setIsModalOpen(false)
      await fetchStudents()
    } catch (err: any) {
      console.error("Failed to update student fees:", err)
      alert(err.message || "Failed to save fees changes.")
    }
  }

  const getStatusBadge = (status: Installment["status"]) => {
    switch (status) {
      case "paid":
        return <Badge variant="success">Paid</Badge>
      case "pending":
        return <Badge variant="warning">Pending</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
    }
  }

  if (loading && students.length === 0) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center text-xs text-muted-foreground">Loading ledger data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Fees & Finance Ledger</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Collect course installment fees, monitor student due dates, and track institute cashflow trends.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className={`grid gap-4 sm:grid-cols-2 ${user?.role === "student" ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        <KPICard
          title={user?.role === "student" ? "Total Fees Paid" : "Total Fees Collected"}
          value={formatCurrency(stats.collected)}
          subtext={user?.role === "student" ? "Completed payments" : undefined}
          icon={IndianRupee}
          delay={0.05}
        />
        <KPICard
          title="Outstanding Dues"
          value={formatCurrency(stats.outstanding)}
          subtext={user?.role === "student" 
            ? (isFullyPaid(studentProfile?.feesPaid, studentProfile?.feesTotal)
                ? "No pending dues"
                : (resolveNextDueDate(studentProfile || {}) ? `Next due: ${formatDate(resolveNextDueDate(studentProfile || {})!)}` : "No pending dues"))
            : `${installments.filter(i => i.status === "overdue").length} overdue accounts`
          }
          icon={AlertCircle}
          delay={0.1}
        />
        {user?.role === "student" && (
          <KPICard
            title="Total Course Fees"
            value={formatCurrency(studentProfile?.feesTotal || 0)}
            subtext="Including all taxes & resources"
            icon={FileText}
            delay={0.15}
          />
        )}
      </div>

      {/* Dues installment table ledger */}
      <Card className="bg-card">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-border/40 gap-3">
          <div>
            <CardTitle>Fee Installment Registry</CardTitle>
            <CardDescription>
              {user?.role === "student" ? "Your payment details, invoices, and installment records." : "Tracking student payments, invoices, and warnings."}
            </CardDescription>
          </div>
          {user?.role !== "student" && (
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-48">
                <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8.5 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1-ring"
                />
              </div>
              
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full sm:w-36 h-8.5 rounded-lg border border-border bg-card px-2 text-xs focus-visible:outline-hidden focus-visible:ring-1-ring cursor-pointer"
              >
                <option value="all">All Months</option>
                {monthsList.map(month => (
                  <option key={month} value={month}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-visible">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                  <th className="p-4">Student</th>
                  <th className="p-4">Installment details</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedInstallments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      No installment records matched the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedInstallments.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/30">
                      <td className="p-4 font-bold text-foreground">{item.studentName}</td>
                      <td className="p-4 text-muted-foreground">{item.installmentName}</td>
                      <td className="p-4 font-semibold text-foreground">{formatCurrency(item.amount)}</td>
                      <td className="p-4 text-muted-foreground">
                        {item.dueDate ? formatDate(item.dueDate) : "—"}
                      </td>
                      <td className="p-4">{getStatusBadge(item.status)}</td>
                      <td className="p-4 text-right flex justify-end gap-1.5">
                        {user?.role === "student" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadInvoice(item.id, item.studentName)}
                            icon={Download}
                            className="h-7 w-7 p-0 cursor-pointer"
                            title="Download invoice receipt"
                          />
                        ) : (
                          <>
                            {item.status !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkAsPaid(item.id, item.studentName)}
                                icon={Check}
                                className="h-7 w-7 p-0 text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer"
                                title="Mark as Paid"
                              />
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadInvoice(item.id, item.studentName)}
                              icon={Download}
                              className="h-7 w-7 p-0 cursor-pointer"
                              title="Download invoice receipt"
                            />
                            {item.status !== "paid" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSendReminder(item.studentName)}
                                icon={Send}
                                className="h-7 w-7 p-0 text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 cursor-pointer"
                                title="Dispatch dues reminder"
                              />
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              icon={Edit2}
                              className="h-7 w-7 p-0 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                              title="Edit installment details"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelete(item.id, item.studentName)}
                              icon={Trash2}
                              className="h-7 w-7 p-0 text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                              title="Delete installment record"
                            />
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
              <div className="text-[11px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * itemsPerPage, filteredInstallments.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredInstallments.length}</span> installments
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 text-[10px] px-2.5 cursor-pointer"
                >
                  Previous
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 w-7 text-[10px] p-0 cursor-pointer ${currentPage === pageNum ? "shadow-xs" : ""}`}
                  >
                    {pageNum}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 text-[10px] px-2.5 cursor-pointer"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Chart Row */}
      {user?.role !== "student" && (
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Program Revenue Distribution</CardTitle>
            <CardDescription>Visual breakdown of collected fees vs outstanding student dues by program.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feeLogs}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="course" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Paid" fill="#10b981" radius={[4, 4, 0, 0]} name="Fees Paid" />
                <Bar dataKey="Dues" fill="#ef4444" radius={[4, 4, 0, 0]} name="Outstanding Dues" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Edit Installment Dialog Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Installment Details"
        description="Update payment due dates, total course fees, and collected amounts."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Student Name</label>
            <input
              type="text"
              disabled
              value={formData.studentName}
              className="w-full h-9 px-3 rounded-lg border border-border bg-muted/30 text-xs text-muted-foreground focus:outline-hidden cursor-not-allowed"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Total Fees (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.feesTotal}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    feesTotal: value,
                    schedule: rebuildSchedule(prev, { feesTotal: Number(value) || 0 }),
                  }))
                }}
                placeholder="e.g. 22000"
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Fees Paid (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={formData.feesPaid}
                onChange={(e) => {
                  const value = e.target.value
                  setFormData((prev) => ({
                    ...prev,
                    feesPaid: value,
                    schedule: rebuildSchedule(prev, { feesPaid: Number(value) || 0 }),
                  }))
                }}
                placeholder="e.g. 2300"
                className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {scholarshipTrackingEnabled && (
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
              <p className="text-xs font-semibold text-foreground">Scholarship tracking</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Scholarship amount (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.scholarshipAmount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scholarshipAmount: e.target.value }))}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                  <input
                    type="text"
                    value={formData.scholarshipNotes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, scholarshipNotes: e.target.value }))}
                    placeholder="Merit scholarship, sibling discount, etc."
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {formFullyPaid ? (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              Fully cleared — no due date will be saved.
            </div>
          ) : (
            <>
              {formHasCollected && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2.5 text-xs text-foreground">
                  {formatCurrency(formFeesPaidNum)} collected
                  {" · "}
                  <span className="font-semibold">{formatCurrency(formRemaining)} remaining</span>
                  {" "}across {Math.max(0, formData.schedule.length - 1)} future installment
                  {Math.max(0, formData.schedule.length - 1) === 1 ? "" : "s"}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Number of Installments</label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={formData.installmentsCount}
                    onChange={(e) => updateScheduleCount(Number(e.target.value) || 1)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Schedule Total</label>
                  <input
                    type="text"
                    disabled
                    value={formatCurrency(formScheduleTotal)}
                    className={`w-full h-9 px-3 rounded-lg border text-xs cursor-not-allowed ${
                      scheduleMatchesTotal
                        ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                        : "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300"
                    }`}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
                <p className={scheduleMatchesTotal ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
                  {scheduleMatchesTotal
                    ? formHasCollected
                      ? `Installment 1 reflects collected fees. Remaining ${formatCurrency(formRemaining)} is split across future dues.`
                      : `Schedule matches course fees (${formatCurrency(formFeesTotalNum)}).`
                    : `Off by ${formatCurrency(Math.abs(scheduleDifference))} — adjust amounts or split evenly.`}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] cursor-pointer"
                  onClick={handleEvenSplit}
                >
                  Split evenly
                </Button>
              </div>

              <div className="space-y-2 border-t border-border/40 pt-3">
                <label className="text-xs font-semibold text-muted-foreground">Installment Schedule</label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formData.schedule.map((item, index) => {
                    const isCollectedRow = formHasCollected && index === 0
                    const isAutoRow =
                      index === formData.schedule.length - 1 && formData.schedule.length > 1
                    const isEditableAmount = !isCollectedRow && !isAutoRow

                    return (
                    <div
                      key={index}
                      className={`grid grid-cols-12 gap-2 items-end rounded-lg border p-2.5 ${
                        isCollectedRow
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border/70 bg-muted/10"
                      }`}
                    >
                      <div className="col-span-12 sm:col-span-4 space-y-1">
                        <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                          Installment {index + 1}
                          {isCollectedRow && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold uppercase">Collected</span>
                          )}
                        </label>
                        <input
                          type="text"
                          value={item.label || getInstallmentLabel(index, formData.schedule.length)}
                          onChange={(e) => updateScheduleItem(index, "label", e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-border bg-card text-[11px]"
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-4 space-y-1">
                        <label className="text-[10px] text-muted-foreground">
                          Amount (₹)
                          {isCollectedRow && (
                            <span className="text-emerald-600 dark:text-emerald-400"> · paid</span>
                          )}
                          {isAutoRow && (
                            <span className="text-muted-foreground/70"> · auto</span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={item.amount}
                          readOnly={!isEditableAmount}
                          onChange={(e) => updateScheduleItem(index, "amount", e.target.value)}
                          className={`w-full h-8 px-2 rounded-md border border-border text-[11px] ${
                            !isEditableAmount
                              ? "bg-muted/30 text-muted-foreground cursor-not-allowed"
                              : "bg-card"
                          }`}
                        />
                      </div>
                      <div className="col-span-6 sm:col-span-4 space-y-1">
                        <label className="text-[10px] text-muted-foreground">Due Date</label>
                        <input
                          type="date"
                          value={item.dueDate}
                          onChange={(e) => updateScheduleItem(index, "dueDate", e.target.value)}
                          className="w-full h-8 px-2 rounded-md border border-border bg-card text-[11px]"
                        />
                      </div>
                    </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {formHasCollected
                    ? `Installment 1 is locked to fees collected (${formatCurrency(formFeesPaidNum)}). Edit future installment amounts — the last row auto-balances the remaining ${formatCurrency(formRemaining)}.`
                    : "Edit amounts for installments 1 to n-1 — the last installment adjusts automatically so the total always equals course fees."}
                </p>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="h-9 text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-9 text-xs cursor-pointer"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
