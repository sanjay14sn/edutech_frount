"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  GraduationCap, Plus, Calendar, BadgeCheck, FileText, CheckCircle2, 
  ArrowRight, Search, Landmark, Target, Award, Sparkles, AlertCircle, Clock, X
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { useStore, Lead, User } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice, showCapacityLimitToast } from "@/components/shared/CapacityLimitNotice"

export default function AdmissionsPage() {
  const { 
    leads, 
    setLeads,
    updateLead, 
    addNotification, 
    user,
    fetchCenterPolicy,
  } = useStore()

  const isBde = user?.role === "bde"
  const isOwner = user?.role === "owner" || user?.role === "super_admin"
  const { policy, atCapacity, allowBdeDirectConvert } = useCenterPolicy()
  const studentsAtCapacity = atCapacity("students")
  const currentBdeId = user?.id || ""
  const currentBdeName = user?.name || "BDE"

  const [conversionRequests, setConversionRequests] = React.useState<any[]>([])
  const [loadingRequests, setLoadingRequests] = React.useState(true)

  const leadBelongsToBde = React.useCallback(
    (l: Lead) =>
      l.assignedBdeId === currentBdeId ||
      (l.counsellor || "").trim().toLowerCase() === currentBdeName.trim().toLowerCase(),
    [currentBdeId, currentBdeName]
  )

  const myLeads = isBde ? leads.filter(leadBelongsToBde) : leads
  const pendingLeadIds = new Set(
    conversionRequests.filter((r) => r.status === "pending").map((r) => String(r.leadId))
  )

  const myConvertedLeads = myLeads.filter((l) => l.stage === "converted")
  const warmLeads = myLeads.filter(
    (l) =>
      l.stage !== "converted" &&
      l.stage !== "lost" &&
      l.stage !== "requested_as_student" &&
      !pendingLeadIds.has(String(l.id))
  )
  const myPendingRequests = conversionRequests.filter((r) => r.status === "pending")
  const ownerPendingRequests = isOwner
    ? conversionRequests.filter((r) => r.status === "pending")
    : []

  // Modal State
  const [isConvertOpen, setIsConvertOpen] = React.useState(false)
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)

  // Form State for Conversion
  const [batchId, setBatchId] = React.useState("Apex-B12")
  const [totalFees, setTotalFees] = React.useState("1800")
  const [paidFees, setPaidFees] = React.useState("600")
  const [paymentPlan, setPaymentPlan] = React.useState<"full" | "part_1" | "part_2">("part_1")
  const [nextDueDate, setNextDueDate] = React.useState("")
  const [convertInstallmentCount, setConvertInstallmentCount] = React.useState("3")
  const [courses, setCourses] = React.useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = React.useState("")
  const [convertIsSubmitting, setConvertIsSubmitting] = React.useState(false)

  // Fetch courses and conversion requests on mount
  React.useEffect(() => {
    const fetchCourses = async () => {
      try {
        const coursesData = await api.getCourses().catch(() => [])
        setCourses(coursesData)
      } catch (err) {
        console.error("Failed to fetch courses in admissions page:", err)
      }
    }
    fetchCourses()
  }, [])

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setLoadingRequests(true)
        const [requestsData, leadsData] = await Promise.all([
          api.getConversionRequests().catch(() => []),
          isBde || isOwner ? api.getLeads().catch(() => []) : Promise.resolve([]),
        ])
        setConversionRequests(requestsData)
        if (leadsData.length > 0) setLeads(leadsData)
      } catch (err) {
        console.error("Failed to load admissions data:", err)
      } finally {
        setLoadingRequests(false)
      }
    }
    loadData()
  }, [isBde, isOwner, setLeads])

  React.useEffect(() => {
    if (selectedLead) {
      setTotalFees(selectedLead.value.toString())
      setPaidFees((selectedLead.value / 3).toString()) // default 1/3 initial amount
      setSelectedCourse(selectedLead.course)
      setConvertInstallmentCount("3")
      const thirtyDays = new Date()
      thirtyDays.setDate(thirtyDays.getDate() + 30)
      setNextDueDate(thirtyDays.toISOString().split("T")[0])
    }
  }, [selectedLead])

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead) return

    try {
      setConvertIsSubmitting(true)

      if (isBde) {
        await api.createConversionRequest({
          leadId: selectedLead.id,
          course: selectedCourse,
          batchId,
          feesTotal: Number(totalFees),
          feesPaid: Number(paidFees),
          nextDueDate,
          installmentsCount: Number(convertInstallmentCount),
          paymentPlan,
        })

        const requestsData = await api.getConversionRequests()
        setConversionRequests(requestsData)

        const leadsData = await api.getLeads()
        if (leadsData.length > 0) setLeads(leadsData)

        addNotification({
          title: "Conversion Request Sent",
          description: `${selectedLead.name}'s enrollment request was sent to the owner for approval.`,
          type: "admissions",
        })

        alert(`Conversion request submitted!\nOwner will review and approve ${selectedLead.name}'s enrollment.`)
        setIsConvertOpen(false)
        setSelectedLead(null)
        return
      }

      const newStudent = await api.createStudent({
        name: selectedLead.name,
        email: selectedLead.email,
        phone: selectedLead.phone,
        course: selectedCourse,
        status: "active",
        attendanceRate: 0,
        feesPaid: Number(paidFees),
        feesTotal: Number(totalFees),
        guardian: { name: "N/A", phone: "N/A" },
        enrollmentDate: new Date().toISOString().split("T")[0],
        nextDueDate,
        installmentsCount: Number(convertInstallmentCount),
        tenantId: selectedLead.tenantId || "ERP",
      })

      const updatedData = await api.updateLead(selectedLead.id, {
        stage: "converted",
        course: selectedCourse,
        value: Number(totalFees),
      })

      const normalizedLead = { ...updatedData, id: updatedData._id || updatedData.id }
      updateLead(normalizedLead)

      addNotification({
        title: "Admissions Conversion Successful",
        description: `${selectedLead.name} was enrolled into ${selectedCourse}. Password: ${newStudent.password}`,
        type: "admissions",
      })

      alert(`Lead converted to student successfully!\nEmail: ${selectedLead.email}\nPassword: ${newStudent.password}`)
      setIsConvertOpen(false)
      setSelectedLead(null)
    } catch (err: unknown) {
      console.error("Failed to convert lead in admissions page:", err)
      if (err instanceof ApiError && err.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "students", policy, err.message)
        void fetchCenterPolicy()
      } else {
        alert(err instanceof Error ? err.message : "Failed to process enrollment.")
      }
    } finally {
      setConvertIsSubmitting(false)
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
      addNotification({
        title: "Conversion Approved",
        description: `${result.request.leadName} enrolled. Password: ${result.student.password}`,
        type: "admissions",
      })
      alert(`Approved! ${result.request.leadName} is now a student.\nPassword: ${result.student.password}`)
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "students", policy, err.message)
        void fetchCenterPolicy()
      } else {
        alert(err instanceof Error ? err.message : "Failed to approve request")
      }
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    const note = window.prompt("Rejection reason (optional):") || undefined
    try {
      await api.rejectConversionRequest(requestId, note)
      const requestsData = await api.getConversionRequests()
      setConversionRequests(requestsData)
      addNotification({
        title: "Conversion Rejected",
        description: "The BDE conversion request was declined.",
        type: "admissions",
      })
    } catch (err: any) {
      alert(err.message || "Failed to reject request")
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span>Admissions & Enrollments</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isBde
              ? "Submit enrollment requests for owner approval. Approved conversions become active students."
              : "Review BDE conversion requests, approve enrollments, and track admissions revenue."}
          </p>
        </div>
        {(isBde || isOwner) && (
        <Button 
          variant="primary" 
          size="sm" 
          icon={Plus} 
          onClick={() => {
            if (warmLeads.length === 0) {
              alert(isBde ? "No active leads available for conversion request." : "No active leads available for conversion.")
              return
            }
            setSelectedLead(warmLeads[0])
            setIsConvertOpen(true)
          }}
        >
          {isBde ? "Request Conversion" : "Convert Lead"}
        </Button>
        )}
      </div>

      {/* Stats Summary row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Conversions this month</span>
              <h3 className="text-2xl font-extrabold text-foreground">{myConvertedLeads.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Revenue generated</span>
              <h3 className="text-2xl font-extrabold text-emerald-500">
                {formatCurrency(myConvertedLeads.reduce((acc, curr) => acc + curr.value, 0))}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 shrink-0">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">Pipeline Conversion Rate</span>
              <h3 className="text-2xl font-extrabold text-foreground">
                {myLeads.length > 0
                  ? Math.round((myConvertedLeads.length / myLeads.length) * 100)
                  : 0}%
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner: pending conversion requests */}
      {isOwner && ownerPendingRequests.length > 0 && (
        <Card className="bg-card border-amber-500/30">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="h-4.5 w-4.5 text-amber-500" />
              <span>Pending BDE Conversion Requests ({ownerPendingRequests.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60">
            {ownerPendingRequests.map((req) => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-foreground">{req.leadName}</p>
                  <p className="text-muted-foreground">{req.course} • {formatCurrency(req.feesTotal)}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Requested by <strong>{req.bdeName}</strong> • Paid {formatCurrency(req.feesPaid)} • Due {formatDate(req.nextDueDate)}
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

      {/* BDE: my pending requests */}
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

      {/* Main Sections */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left 2 Cols: My conversions list */}
        <Card className="bg-card md:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-primary" />
              <span>My Enrolled Students List</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto text-xs text-left">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border uppercase font-semibold text-muted-foreground">
                    <th className="p-4">Student Profile</th>
                    <th className="p-4">Enrolled Course</th>
                    <th className="p-4 text-center">Value</th>
                    <th className="p-4 text-center">Enrollment Date</th>
                    <th className="p-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {myConvertedLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                        No admissions registered for this month.
                      </td>
                    </tr>
                  ) : (
                    myConvertedLeads.map((l) => (
                      <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-4">
                          <div>
                            <p className="font-bold text-foreground">{l.name}</p>
                            <p className="text-[10px] text-muted-foreground">{l.email}</p>
                          </div>
                        </td>
                        <td className="p-4 font-medium text-foreground">{l.course}</td>
                        <td className="p-4 text-center font-semibold text-emerald-500">{formatCurrency(l.value)}</td>
                        <td className="p-4 text-center text-muted-foreground">{formatDate(l.createdDate)}</td>
                        <td className="p-4 text-right">
                          <Badge variant="success">Enrolled</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Right 1 Col: Quick conversions list */}
        <Card className="bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-amber-500" />
              <span>Convert Active Candidates</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/60 text-xs">
            {warmLeads.length === 0 ? (
              <p className="p-4 text-center text-muted-foreground italic">No active candidates to convert.</p>
            ) : (
              warmLeads.map((l) => (
                <div key={l.id} className="p-3.5 space-y-2 hover:bg-muted/30 transition-colors flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-foreground">{l.name}</p>
                      <p className="text-[10px] text-muted-foreground">{l.course}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] uppercase">{l.stage}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-border/30">
                    <span className="text-[10px] font-semibold text-emerald-500">{formatCurrency(l.value)}</span>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      className="h-7 text-[10px]"
                      onClick={() => { setSelectedLead(l); setIsConvertOpen(true) }}
                    >
                      {isBde ? "Request Enroll" : "Enroll Now"}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Convert Lead Dialog modal */}
      <Dialog
        isOpen={isConvertOpen}
        onClose={() => setIsConvertOpen(false)}
        title={selectedLead ? (isBde ? `Request Conversion: ${selectedLead.name}` : `Convert Warm Lead: ${selectedLead.name}`) : "Convert Warm Lead"}
        description={isBde ? "Submit enrollment details to the owner for approval." : "Fills initial database records. Default status is 'Active'."}
      >
        {selectedLead && (
          <form onSubmit={handleConvertSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Select Candidate</label>
                <Select
                  value={selectedLead.id}
                  onChange={(e) => {
                    const l = warmLeads.find(w => w.id === e.target.value)
                    if (l) setSelectedLead(l)
                  }}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                >
                  {warmLeads.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Enrolling Course</label>
                <Select
                  value={selectedCourse}
                  onChange={(e) => {
                    setSelectedCourse(e.target.value)
                    const selectedCourseObj = courses.find(c => c.name === e.target.value)
                    if (selectedCourseObj) {
                      setTotalFees(String(selectedCourseObj.fees))
                      if (paymentPlan === "full") {
                        setPaidFees(String(selectedCourseObj.fees))
                      } else if (paymentPlan === "part_1") {
                        setPaidFees(String(selectedCourseObj.fees / 2))
                      } else {
                        setPaidFees(String(selectedCourseObj.fees / 3))
                      }
                    }
                  }}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                >
                  {courses.map((c) => (
                    <option key={c.id || c._id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Assigned Batch</label>
                <Select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                >
                  <option value="Apex-B12">Apex-B12 (Mon, Wed, Fri)</option>
                  <option value="Apex-B14">Apex-B14 (Tue, Thu)</option>
                  <option value="Apex-B02">Apex-B02 (Mon, Wed)</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Total Fees Amount ($)</label>
                <Input
                  type="number"
                  value={totalFees}
                  onChange={(e) => setTotalFees(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Payment Plan Option</label>
                <Select
                  value={paymentPlan}
                  onChange={(e) => {
                    const plan = e.target.value as any
                    setPaymentPlan(plan)
                    if (plan === "full") {
                      setPaidFees(totalFees)
                    } else if (plan === "part_1") {
                      setPaidFees((Number(totalFees) / 2).toString())
                    } else {
                      setPaidFees((Number(totalFees) / 3).toString())
                    }
                  }}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                >
                  <option value="full">Full Fees Payment upfront</option>
                  <option value="part_1">Part 1 (50% upfront)</option>
                  <option value="part_2">Part 2 (Installments scheme)</option>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Initial Amount Paid ($)</label>
                <Input
                  type="number"
                  value={paidFees}
                  onChange={(e) => setPaidFees(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Next Due Date</label>
                <Input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Number of Dues / Installments</label>
                <Select
                  value={convertInstallmentCount}
                  onChange={(e) => setConvertInstallmentCount(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  disabled={convertIsSubmitting}
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

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsConvertOpen(false)} disabled={convertIsSubmitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={convertIsSubmitting}>
                {convertIsSubmitting
                  ? isBde ? "Submitting..." : "Enrolling..."
                  : isBde ? "Submit to Owner" : "Enroll Student"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
