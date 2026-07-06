"use client"

import * as React from "react"
import { BookOpen, CheckCircle2, IndianRupee, Calendar, Clock, Download, Video, AlertCircle, BadgeDollarSign, Award } from "lucide-react"
import { useRouter } from "next/navigation"
import { KPICard } from "./KPICard"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import {
  computeInstallmentRows,
  getCurrentDueInstallment,
  isFullyPaid,
  resolveNextDueDate,
} from "@/lib/installments"
import { studentNameInBatch } from "@/lib/lms"

const getSessionDateInfo = (dateStr?: string) => {
  if (!dateStr) return { day: "--", month: "Class" }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { day: "--", month: "Class" }
  return {
    day: String(d.getDate()),
    month: d.toLocaleString('default', { month: 'short' })
  }
}

const getSessionTimeStr = (dateStr?: string) => {
  if (!dateStr) return "N/A"
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const getScheduleDayInfo = (scheduleStr?: string) => {
  if (!scheduleStr) return { day: "--", label: "Class" }
  const match = scheduleStr.trim().match(/^[a-zA-Z]+/)
  const day = match ? match[0] : "Class"
  return {
    day: day.toUpperCase(),
    label: "Class"
  }
}

export function StudentDashboard() {
  const router = useRouter()
  const { user, addNotification } = useStore()
  const [downloading, setDownloading] = React.useState(false)
  const [student, setStudent] = React.useState<any>(null)
  const [batches, setBatches] = React.useState<any[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [attendanceLogs, setAttendanceLogs] = React.useState<any[]>([])

  React.useEffect(() => {
    const loadProfile = async () => {
      try {
        const [profileData, batchesData, coursesData, logsData] = await Promise.all([
          api.getStudentProfile().catch(() => null),
          api.getBatches().catch(() => []),
          api.getCourses().catch(() => []),
          api.getMyAttendance().catch(() => [])
        ])
        setStudent(
          profileData || {
            name: user?.name || "Student",
            email: user?.email,
            course: "",
          }
        )
        setBatches(batchesData || [])
        setCourses(coursesData || [])
        setAttendanceLogs(logsData || [])
      } catch (err) {
        console.error("Failed to load student profile, batches, courses, or logs:", err)
      } finally {
        setLoading(false)
      }
    }
    if (user) loadProfile()
  }, [user?.id, user?.name, user?.email])

  const handleDownloadReceipt = () => {
    setDownloading(true)
    setTimeout(() => {
      setDownloading(false)
      addNotification({
        title: "Receipt Downloaded",
        description: `Receipt for ${student?.name || user?.name || "Student"} downloaded to your device.`,
        type: "fees"
      })
      alert(`Simulated download: Receipt for student ${student?.name || user?.name || "Student"} downloaded successfully!`)
    }, 1000)
  }

  // Find allocated batch:
  const studentBatch = React.useMemo(() => {
    const studentName = student?.name || user?.name
    if (!studentName || !batches.length) return null
    return batches.find((batch: any) => studentNameInBatch(batch, studentName)) || null
  }, [student, user?.name, batches])

  const batchRemarks = React.useMemo(() => {
    const studentName = student?.name || user?.name
    if (!studentBatch || !studentName) return ""
    const remarksMap = (studentBatch as { studentRemarks?: Record<string, string> }).studentRemarks || {}
    const matchedKey = Object.keys(remarksMap).find(
      (key) => key.trim().toLowerCase() === studentName.trim().toLowerCase()
    )
    return matchedKey ? remarksMap[matchedKey].trim() : ""
  }, [studentBatch, student?.name, user?.name])

  const isBatchCompleted = studentBatch?.status === "completed"

  const studentCourse = React.useMemo(() => {
    if (!courses.length) return null
    const nameToMatch = student?.course || studentBatch?.courseName
    if (!nameToMatch) return null
    return courses.find((c: any) => c.name.toLowerCase() === nameToMatch.toLowerCase())
  }, [student, studentBatch, courses])

  const durationMonths = React.useMemo(() => {
    const durationStr = studentCourse?.duration || "3 Months"
    return parseInt(durationStr) || 3
  }, [studentCourse])

  const daysPerWeek = React.useMemo(() => {
    const scheduleStr = studentBatch?.schedule
    if (!scheduleStr) return 3
    const lower = scheduleStr.toLowerCase()
    if (lower.includes("weekend")) return 2
    const days = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
    let count = 0
    days.forEach(day => {
      if (lower.includes(day)) {
        count++
      }
    })
    return count > 0 ? count : 3
  }, [studentBatch])

  const allSessions = React.useMemo(() => {
    if (!studentBatch) return []
    let list: { topic: string; date: string }[] = []
    if (studentBatch.sessions && studentBatch.sessions.length > 0) {
      list = [...studentBatch.sessions]
    } else if (studentBatch.nextSessionTopic && studentBatch.nextSessionDate) {
      list = [{ topic: studentBatch.nextSessionTopic, date: studentBatch.nextSessionDate }]
    }
    return list
  }, [studentBatch])

  const totalClasses = React.useMemo(() => {
    if (allSessions.length > 0) {
      return allSessions.length
    }
    return durationMonths * 4 * daysPerWeek
  }, [allSessions, durationMonths, daysPerWeek])

  const presentDays = React.useMemo(() => {
    return attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length
  }, [attendanceLogs])

  const absentDays = React.useMemo(() => {
    return attendanceLogs.filter(l => l.status === 'absent').length
  }, [attendanceLogs])

  const completionRate = React.useMemo(() => {
    if (isBatchCompleted || student?.status === "completed") return 100
    if (!student?.enrollmentDate) return 64 // fallback to static 64%
    
    const enrollment = new Date(student.enrollmentDate)
    if (isNaN(enrollment.getTime())) return 64
    
    const now = new Date()
    const elapsedMs = now.getTime() - enrollment.getTime()
    if (elapsedMs < 0) return 0
    
    const durationMs = durationMonths * 30.4 * 24 * 60 * 60 * 1000
    return Math.min(95, Math.round((elapsedMs / durationMs) * 100))
  }, [student, durationMonths, isBatchCompleted])

  const totalModules = React.useMemo(() => {
    if (allSessions.length > 0) {
      return allSessions.length
    }
    return durationMonths * 7
  }, [allSessions, durationMonths])

  const completedModules = React.useMemo(() => {
    if (isBatchCompleted || student?.status === "completed") return totalModules
    return Math.round((completionRate / 100) * totalModules)
  }, [student, completionRate, totalModules, isBatchCompleted])

  const totalCourseAssignments = React.useMemo(() => {
    return durationMonths * 3
  }, [durationMonths])

  const totalSubmittedAssignments = React.useMemo(() => {
    if (isBatchCompleted || student?.status === "completed") return totalCourseAssignments
    return Math.min(totalCourseAssignments, Math.round((completionRate / 100) * totalCourseAssignments) + 1)
  }, [student, completionRate, totalCourseAssignments, isBatchCompleted])

  const gradedAssignmentsCount = React.useMemo(() => {
    if (isBatchCompleted || student?.status === "completed") return totalCourseAssignments
    return Math.max(1, totalSubmittedAssignments - 1)
  }, [student, totalSubmittedAssignments, totalCourseAssignments, isBatchCompleted])

  const upcomingSessions = React.useMemo(() => {
    if (!studentBatch) return []
    
    let list: { topic: string; date: string }[] = []
    if (studentBatch.sessions && studentBatch.sessions.length > 0) {
      list = [...studentBatch.sessions]
    } else if (studentBatch.nextSessionTopic && studentBatch.nextSessionDate) {
      list = [{ topic: studentBatch.nextSessionTopic, date: studentBatch.nextSessionDate }]
    }
    
    const now = new Date()
    return list
      .filter((session) => {
        if (!session || !session.date) return false
        const d = new Date(session.date)
        if (isNaN(d.getTime())) return false
        // Session ends after 90 minutes. Show if not ended yet.
        return d.getTime() + 90 * 60 * 1000 > now.getTime()
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  }, [studentBatch])

  const attendance = React.useMemo(() => {
    if (attendanceLogs.length === 0) return "0.0"
    const pres = attendanceLogs.filter(l => l.status === 'present' || l.status === 'late').length
    return ((pres / attendanceLogs.length) * 100).toFixed(1)
  }, [attendanceLogs])

  const isAllocated = !!studentBatch

  const handleJoinClass = () => {
    if (!isAllocated) return
    const meetLink = studentBatch?.meetLink || "https://meet.google.com/abc-defg-hij"
    window.open(meetLink, "_blank")
    addNotification({
      title: "Classroom Launched",
      description: `Redirecting to Google Meet classroom for ${studentBatch?.code || student?.course || "Apex Batch B-12"}.`,
      type: "system"
    })
  }

  const feesPaid = student?.feesPaid ?? 0
  const feesTotal = student?.feesTotal ?? 0
  const feesOutstanding = Math.max(0, feesTotal - feesPaid)
  const courseName = student?.course || "React Fullstack"

  const overdueFeeInfo = React.useMemo(() => {
    if (!student || isFullyPaid(student.feesPaid, student.feesTotal)) return null

    const rows = computeInstallmentRows(student)
    const current = getCurrentDueInstallment(rows)
    if (!current || current.status !== "overdue") return null

    return {
      label: `${current.label} (${current.number}/${rows.length})`,
      amount: current.dueAmount,
      dueDate: current.dueDate,
    }
  }, [student])

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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Welcome, {student?.name || user?.name || "Student"}
          </h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="outline" className="text-blue-500 border-blue-500/20 bg-blue-500/5 text-[10px] sm:text-xs max-w-full truncate">
              {courseName}
            </Badge>
            {isAllocated ? (
              <>
                <Badge variant="info" className="text-[10px] sm:text-xs">
                  Batch: {studentBatch.code}
                </Badge>
                {isBatchCompleted && (
                  <Badge variant="outline" className="text-[10px] sm:text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
                    Batch Completed
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="warning" className="flex items-center gap-1 text-[10px] sm:text-xs">
                <AlertCircle className="h-3 w-3 shrink-0" />
                <span>Pending Allocation</span>
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Track your course progress, attendance rate, fees status, and pending assignments.
          </p>
        </div>
        <div className="grid grid-cols-1 min-[480px]:grid-cols-2 sm:flex sm:flex-wrap gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownloadReceipt}
            isLoading={downloading}
            className="w-full sm:w-auto justify-center"
          >
            Fee Receipt
          </Button>
          <Button 
            variant={isAllocated && !isBatchCompleted && (studentBatch.mode !== "online" || studentBatch.meetLink) ? "primary" : "secondary"} 
            size="sm" 
            icon={Video} 
            onClick={isAllocated && !isBatchCompleted && (studentBatch.mode !== "online" || studentBatch.meetLink) ? handleJoinClass : undefined} 
            className={`w-full sm:w-auto justify-center ${(!isAllocated || isBatchCompleted || (studentBatch.mode === "online" && !studentBatch.meetLink)) ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            disabled={!isAllocated || isBatchCompleted || (studentBatch.mode === "online" && !studentBatch.meetLink)}
          >
            {!isAllocated ? "No Active Batch" : isBatchCompleted ? "Batch Completed" : (studentBatch.mode === "online" && !studentBatch.meetLink ? "Class Link Pending" : "Join Live Class")}
          </Button>
        </div>
      </div>

      {overdueFeeInfo && (
        <div className="rounded-xl border border-red-500/80 bg-card shadow-md overflow-hidden">
          <div className="flex items-start gap-3 bg-red-600 px-4 py-4 sm:px-5">
            <div className="p-2 rounded-lg bg-white/15 text-white shrink-0">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <h5 className="font-bold text-base text-white">Overdue Fee Payment</h5>
              <p className="text-sm text-red-50 leading-relaxed">
                Your installment payment is past the due date. Please clear the outstanding balance to avoid access restrictions.
              </p>
            </div>
          </div>

          <div className="p-3 sm:p-5 space-y-4 bg-white dark:bg-white">
            {/* Mobile card view */}
            <div className="sm:hidden rounded-lg border border-zinc-200 bg-zinc-50 p-3 space-y-2.5 text-black">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase text-zinc-500">Installment</span>
                <span className="inline-flex items-center rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  Overdue
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Amount</p>
                  <p className="font-bold">{formatCurrency(overdueFeeInfo.amount)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-zinc-500 uppercase">Due Date</p>
                  <p className="font-mono">{formatDate(overdueFeeInfo.dueDate)}</p>
                </div>
              </div>
              <p className="text-xs font-medium">{overdueFeeInfo.label}</p>
            </div>

            <div className="hidden sm:block overflow-x-auto rounded-lg border border-zinc-200 bg-white">
              <table className="w-full text-xs text-left text-black">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-100 uppercase text-[10px] text-black">
                    <th className="p-3 font-bold text-black">Student</th>
                    <th className="p-3 font-bold text-black">Installment</th>
                    <th className="p-3 font-bold text-black">Amount</th>
                    <th className="p-3 font-bold text-black">Due Date</th>
                    <th className="p-3 font-bold text-black">Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white">
                    <td className="p-3 font-semibold text-black">{student?.name || user?.name}</td>
                    <td className="p-3 font-medium text-black">{overdueFeeInfo.label}</td>
                    <td className="p-3 font-bold text-black">{formatCurrency(overdueFeeInfo.amount)}</td>
                    <td className="p-3 font-mono text-black">{formatDate(overdueFeeInfo.dueDate)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                        Overdue
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <Button
              variant="primary"
              size="sm"
              className="h-9 sm:h-8 w-full sm:w-auto text-xs bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 border-0"
              onClick={() => router.push("/fees")}
            >
              View Fee Details
            </Button>
          </div>
        </div>
      )}

      {isBatchCompleted && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5">
          <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-sm text-foreground">Your batch has been completed</h5>
            <p className="text-xs text-muted-foreground leading-normal">
              Congratulations! Batch <strong>{studentBatch?.code}</strong> for <strong>{courseName}</strong> is marked as completed.
              {studentBatch?.completedAt && (
                <> Completed on {formatDate(studentBatch.completedAt)}.</>
              )}
              {" "}You can still access LMS materials and download your certificate from the Certification section.
            </p>
            <Button variant="outline" size="sm" className="mt-2 h-8 text-xs" onClick={() => router.push("/certification")}>
              <Award className="h-3.5 w-3.5 mr-1.5" /> View Certification
            </Button>
          </div>
        </div>
      )}

      {/* Classroom Allocation Warning Banners */}
      {isAllocated && !isBatchCompleted && studentBatch.mode === "online" && !studentBatch.meetLink && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-sm">Classroom Link Pending</h5>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-normal">
              Your online classroom link has not been allocated by the administrator yet. You will be able to join the live session as soon as the Google Meet/Zoom link is assigned.
            </p>
          </div>
        </div>
      )}
      
      {isAllocated && !isBatchCompleted && studentBatch.mode === "offline" && !studentBatch.roomName && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h5 className="font-bold text-sm">Classroom Room Assignment Pending</h5>
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-normal">
              Your physical classroom room number has not been allocated by the administrator yet. Please verify your room assignment at the hub front desk before your first class.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Personal Attendance"
          value={`${attendance}%`}
          subtext={`${presentDays} present / ${absentDays} absent`}
          icon={Calendar}
          delay={0.05}
        />
        <KPICard
          title="Total Paid Fees"
          value={formatCurrency(feesPaid)}
          subtext={
            feesOutstanding <= 0
              ? "All dues cleared"
              : overdueFeeInfo
                ? `Overdue: ${formatCurrency(overdueFeeInfo.amount)} due ${formatDate(overdueFeeInfo.dueDate)}`
                : resolveNextDueDate(student || {})
                  ? `Next due: ${formatDate(resolveNextDueDate(student || {})!)} • ${formatCurrency(feesOutstanding)} outstanding`
                  : `Outstanding: ${formatCurrency(feesOutstanding)}`
          }
          icon={IndianRupee}
          delay={0.1}
        />
        <KPICard
          title="Course Completion"
          value={`${completionRate}%`}
          subtext={student?.status === "completed" ? "Completed all modules" : `${completedModules} / ${totalModules} modules finished`}
          icon={BookOpen}
          delay={0.15}
        />
      </div>

      {/* Weekly Schedule */}
      <Card className="bg-card">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">My Class Timetable</CardTitle>
          <CardDescription>
            {isBatchCompleted ? "Your batch has been completed — no further sessions scheduled." : "Upcoming sessions this week."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 px-4 sm:px-6 pb-4 sm:pb-6">
          {!isAllocated ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-4 my-2">
              <div className="p-3.5 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 animate-pulse">
                <Calendar className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-base text-foreground">Batch Allocation Pending</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  You are not currently allocated to any class batch for the course <strong>{courseName}</strong>. 
                  Please contact the academic administration or your counselor to assign you to a batch so you can join live classes and view schedules.
                </p>
              </div>
              <div className="inline-flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-md">
                Status: Unallocated
              </div>
            </div>
          ) : isBatchCompleted ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 my-2">
              <div className="p-3.5 bg-emerald-500/10 rounded-full text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-base text-foreground">Batch Completed</h4>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  All sessions for batch <strong>{studentBatch.code}</strong> are complete.
                  {studentBatch.completedAt && (
                    <> Completed on {formatDate(studentBatch.completedAt)}.</>
                  )}
                  {" "}Visit the Certification section to download your course certificate.
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/certification")}>
                <Award className="h-3.5 w-3.5 mr-1.5" /> Go to Certification
              </Button>
            </div>
          ) : (
            <>
              <div className="max-h-[320px] overflow-y-auto space-y-3 pr-1">
                {upcomingSessions.map((session, index) => {
                  const dateInfo = getSessionDateInfo(session.date)
                  const timeStr = getSessionTimeStr(session.date)
                  const isNext = index === 0
                  
                  // Calculate if ongoing (started but has not ended yet)
                  const sessionDate = new Date(session.date)
                  const now = new Date()
                  const isOngoing = now >= sessionDate && now.getTime() < sessionDate.getTime() + 90 * 60 * 1000
                  
                  return (
                    <div key={index} className={`flex flex-col sm:flex-row items-stretch sm:items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all ${
                      isOngoing
                        ? "border-emerald-500/30 bg-emerald-500/5 shadow-xs"
                        : isNext 
                        ? "border-primary/30 bg-primary/5 shadow-xs" 
                        : "border-border/60 bg-card/40 hover:bg-muted/10"
                    }`}>
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className={`flex flex-col items-center justify-center h-11 w-11 sm:h-12 sm:w-12 rounded-lg font-bold shrink-0 text-sm ${
                        isOngoing
                          ? "bg-emerald-500 text-white"
                          : isNext 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-secondary text-foreground/85 border border-border/80"
                      }`}>
                        <span>{dateInfo.day}</span>
                        <span className="text-[10px] uppercase font-semibold">{dateInfo.month}</span>
                      </div>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant={isOngoing ? "success" : isNext ? "success" : "outline"} className="text-[10px]">
                              {isOngoing ? "Live Now" : "Next Session"}
                            </Badge>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>{timeStr}</span>
                            </span>
                          </div>
                        </div>
                        <h4 className="font-bold text-sm text-foreground break-words">{session.topic}</h4>
                        <p className="text-xs text-muted-foreground break-words">
                          Instructor: {studentBatch.trainerName || "Marcus Vance"} • {studentBatch.code}
                        </p>
                      </div>
                      </div>
                          
                      {(isOngoing || isNext) && studentBatch.mode === "online" && (
                        studentBatch.meetLink ? (
                          <a
                            href={studentBatch.meetLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full sm:w-auto items-center justify-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 sm:py-1 rounded-md hover:bg-emerald-500/20 transition-all cursor-pointer shrink-0"
                          >
                            <Video className="h-3.5 w-3.5 animate-pulse" />
                            <span>Launch Meet</span>
                          </a>
                        ) : (
                          <Badge variant="warning" className="flex items-center justify-center gap-1 shrink-0 w-full sm:w-auto py-2 sm:py-0.5">
                            <AlertCircle className="h-3 w-3 animate-pulse" />
                            <span>Class Link Pending</span>
                          </Badge>
                        )
                      )}
                      {(isOngoing || isNext) && studentBatch.mode === "offline" && (
                        studentBatch.roomName ? (
                          <span className="inline-flex w-full sm:w-auto items-center justify-center text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 sm:py-1 rounded-md">
                            Room: {studentBatch.roomName}
                          </span>
                        ) : (
                          <Badge variant="warning" className="flex items-center justify-center gap-1 shrink-0 w-full sm:w-auto py-2 sm:py-0.5">
                            <AlertCircle className="h-3 w-3 animate-pulse" />
                            <span>Room Pending</span>
                          </Badge>
                        )
                      )}
                    </div>
                  )
                })}
                
                {upcomingSessions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 px-4 text-center rounded-xl border border-dashed border-border bg-muted/10 space-y-2">
                    <Calendar className="h-6 w-6 text-muted-foreground animate-pulse" />
                    <p className="text-xs font-semibold text-foreground">Next session will be scheduled soon</p>
                    <p className="text-[10px] text-muted-foreground max-w-xs leading-normal">
                      We will schedule the next class as soon as the trainer updates the timeline.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {batchRemarks && (
        <Card className="bg-card border-border/60">
          <CardContent className="p-4 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Trainer Remarks {studentBatch?.code ? `— ${studentBatch.code}` : ""}
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {batchRemarks}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
