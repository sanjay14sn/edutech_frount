"use client"

import * as React from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  CalendarCheck, QrCode, Users, Check, X, Clock, Award, Bell,
  Calendar, Activity, UserCheck, AlertCircle, ShieldAlert, GraduationCap, Briefcase, Search, History
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import {
  getSessionsForLedgerDate,
  resolveRollCallSession,
  formatSessionTimeRange,
  getSessionStatus,
  isRollCallOpen,
  findBestRollCallTarget,
  getBatchRollCallPriority,
  sortSessionsForRollCallDisplay,
  type BatchSession,
} from "@/lib/sessionUtils"
import { formatDuration, shiftStatusLabel, type ShiftStatus } from "@/lib/shiftTimer"
import { cn } from "@/lib/utils"

function AttendancePageLoader({ message = "Loading attendance..." }: { message?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-20">
      <svg className="h-10 w-10 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden>
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground animate-pulse">{message}</p>
    </div>
  )
}

interface AttendanceRecord {
  entityId: string
  name: string
  status: "present" | "absent" | "late"
  date?: string
  loginTime?: string
  logoutTime?: string
  shiftStatus?: ShiftStatus
  workedSeconds?: number
}

function mergeBdeAttendanceRecords(bdes: any[], existing: any[]): AttendanceRecord[] {
  const byEntity = new Map<string, any>()
  for (const record of existing) {
    const key = String(record.entityId ?? "")
    if (key) byEntity.set(key, record)
  }

  return bdes.map((b: any) => {
    const id = String(b.id)
    const att = byEntity.get(id)
    return {
      entityId: id,
      name: b.name,
      status: att?.status || "present",
      loginTime: att?.loginTime,
      logoutTime: att?.logoutTime,
      shiftStatus: att?.shiftStatus,
      workedSeconds: att?.workedSeconds,
    }
  })
}

const isClassScheduledOnDate = (batch: any, dateStr: string): boolean => {
  if (!batch) return false;
  if (batch.sessions && batch.sessions.length > 0) {
    return batch.sessions.some((session: any) => {
      if (!session || !session.date) return false;
      return session.date.substring(0, 10) === dateStr;
    });
  }
  if (!batch.nextSessionDate) return false;
  const nextSessionDateOnly = batch.nextSessionDate.substring(0, 10);
  return dateStr === nextSessionDateOnly;
}

const isClassDay = (dayNum: number, sessionsOrNextSessionDate: any, calendarMonth?: number): boolean => {
  if (Array.isArray(sessionsOrNextSessionDate)) {
    return sessionsOrNextSessionDate.some((session: any) => {
      if (!session || !session.date) return false;
      const dateOnly = session.date.substring(0, 10); // YYYY-MM-DD
      const parts = dateOnly.split('-');
      if (parts.length !== 3) return false;
      const month = Number(parts[1]);
      const day = Number(parts[2]);
      return calendarMonth === month && dayNum === day;
    });
  } else if (typeof sessionsOrNextSessionDate === 'string') {
    const dateOnly = sessionsOrNextSessionDate.substring(0, 10); // YYYY-MM-DD
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return false;
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    return calendarMonth === month && dayNum === day;
  }
  return false;
}

const getDayStatus = (
  dayNum: number,
  sessionsOrNextSessionDate: any,
  calendarMonth: number,
  emptyDays: number,
  attendanceLogs: any[],
  calendarYear: number
): "present" | "absent" | "late" | "weekend" | "no_class" | "pending" => {
  const dayOfWeek = (dayNum + emptyDays - 1) % 7
  const isWeekend = dayOfWeek === 5 || dayOfWeek === 6
  const hasClass = isClassDay(dayNum, sessionsOrNextSessionDate, calendarMonth)

  if (!hasClass) {
    return isWeekend ? "weekend" : "no_class"
  }

  const dateStr = `${calendarYear}-${String(calendarMonth).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`
  const logged = attendanceLogs.find((l: any) => {
    const logDate = l.date && l.date.length >= 10 ? l.date.substring(0, 10) : ""
    return logDate === dateStr
  })

  if (logged) {
    return logged.status
  }

  return "pending"
}

export default function AttendancePage() {
  const { user, addNotification } = useStore()
  const searchParams = useSearchParams()
  const role = user?.role
  const isBde = role === "bde"
  const isTrainer = role === "trainer"
  const userId = user?.id
  const userName = user?.name

  // Staff/Owner Terminal States
  const [category, setCategory] = React.useState<"student" | "trainer" | "bde">("student")
  const dateFromUrl = searchParams.get("date")
  const [date, setDate] = React.useState(() => dateFromUrl || new Date().toISOString().split("T")[0])
  const [records, setRecords] = React.useState<AttendanceRecord[]>([])
  const [loading, setLoading] = React.useState(() => role !== "student")
  const [loadingBatches, setLoadingBatches] = React.useState(() => role !== "student" && role !== "bde")
  const [pageReady, setPageReady] = React.useState(false)
  const loadRequestRef = React.useRef(0)
  const prevLoadKeyRef = React.useRef("")

  // Sub-tabs for roll call terminal
  const [activeTab, setActiveTab] = React.useState<"roll_call" | "qr_scanner">("roll_call")
  const [selectedBatch, setSelectedBatch] = React.useState("")
  const [batches, setBatches] = React.useState<any[]>([])
  
  // Student View States
  const [student, setStudent] = React.useState<any>(null)
  const [studentBatch, setStudentBatch] = React.useState<any>(null)
  const [loadingStudent, setLoadingStudent] = React.useState(role === "student")
  const [isClassDayForBatch, setIsClassDayForBatch] = React.useState(true)
  const [attendanceLogs, setAttendanceLogs] = React.useState<any[]>([])
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedSessionIndex, setSelectedSessionIndex] = React.useState(0)
  const [sessionManuallySelected, setSessionManuallySelected] = React.useState(false)
  const [sessionClock, setSessionClock] = React.useState(() => new Date())

  React.useEffect(() => {
    if (isBde) setCategory("bde")
    if (isTrainer) setCategory("student")
  }, [isBde, isTrainer])

  React.useEffect(() => {
    if (dateFromUrl) setDate(dateFromUrl)
  }, [dateFromUrl])

  React.useEffect(() => {
    setSessionManuallySelected(false)
  }, [date, selectedBatch])

  React.useEffect(() => {
    const timer = window.setInterval(() => setSessionClock(new Date()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const sessionsForLedgerDate = React.useMemo((): BatchSession[] => {
    if (category !== "student" || !selectedBatch) return []
    const currentBatch = batches.find(b => b.code === selectedBatch)
    if (!currentBatch) return []
    return getSessionsForLedgerDate(currentBatch, date)
  }, [category, selectedBatch, batches, date])

  const sortedSessionsForLedgerDate = React.useMemo(
    () => sortSessionsForRollCallDisplay(sessionsForLedgerDate, date, sessionClock),
    [sessionsForLedgerDate, date, sessionClock]
  )

  const sortedBatches = React.useMemo(
    () =>
      [...batches].sort(
        (a, b) => getBatchRollCallPriority(b, date, sessionClock) - getBatchRollCallPriority(a, date, sessionClock)
      ),
    [batches, date, sessionClock]
  )

  const liveRollCallTarget = React.useMemo(
    () => findBestRollCallTarget(batches, sessionClock),
    [batches, sessionClock]
  )

  const resolvedRollCall = React.useMemo(
    () => resolveRollCallSession(sortedSessionsForLedgerDate, date, sessionClock),
    [sortedSessionsForLedgerDate, date, sessionClock]
  )

  React.useEffect(() => {
    if (!sessionManuallySelected && resolvedRollCall.index >= 0) {
      setSelectedSessionIndex(resolvedRollCall.index)
    } else if (!sessionManuallySelected) {
      setSelectedSessionIndex(0)
    }
  }, [date, selectedBatch, resolvedRollCall.index, sessionManuallySelected])

  const activeRollCallSession = sortedSessionsForLedgerDate[selectedSessionIndex] ?? resolvedRollCall.session
  const activeSessionTopic = activeRollCallSession?.topic ?? null
  const activeSessionTimeRange = activeRollCallSession ? formatSessionTimeRange(activeRollCallSession) : null
  const rollCallSessionStatus = activeRollCallSession
    ? getSessionStatus(activeRollCallSession, date, sessionClock)
    : null

  const isRollCallAvailable = React.useMemo(() => {
    if (category !== "student") return true
    if (!isClassDayForBatch) return false
    return isRollCallOpen(sessionsForLedgerDate, date, sessionClock)
  }, [category, isClassDayForBatch, sessionsForLedgerDate, date, sessionClock])

  const filteredRecords = React.useMemo(() => {
    if (!searchTerm.trim()) return records
    return records.filter(r => r.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
  }, [records, searchTerm])

  const rollCallStats = React.useMemo(() => {
    const total = records.length
    const present = records.filter(r => r.status === "present").length
    const absent = records.filter(r => r.status === "absent").length
    const late = records.filter(r => r.status === "late").length
    return { total, present, absent, late }
  }, [records])

  const bdeShiftStats = React.useMemo(() => {
    const total = records.length
    const active = records.filter((r) => r.shiftStatus === "active").length
    const paused = records.filter((r) => r.shiftStatus === "paused").length
    const finished = records.filter((r) => r.shiftStatus === "finished").length
    const offline = records.filter((r) => !r.shiftStatus || r.shiftStatus === "offline").length
    return { total, active, paused, finished, offline }
  }, [records])

  const handleMarkAllStatus = (status: AttendanceRecord["status"]) => {
    setRecords(prev => prev.map(r => ({ ...r, status })))
  }

  React.useEffect(() => {
    if (role !== "student") return
    const loadStudentData = async () => {
      try {
        setLoadingStudent(true)
        const [profileData, batchesData, logsData] = await Promise.all([
          api.getStudentProfile(),
          api.getBatches(),
          api.getMyAttendance().catch(() => [])
        ])
        setStudent(profileData)
        setAttendanceLogs(logsData || [])
        if (profileData && batchesData) {
          const matchedBatch = batchesData.find((b: any) => b.studentNames?.includes(profileData.name))
          setStudentBatch(matchedBatch)
        }
      } catch (err) {
        console.error("Failed to load student attendance context:", err)
      } finally {
        setLoadingStudent(false)
        setPageReady(true)
      }
    }
    loadStudentData()
  }, [role])

  React.useEffect(() => {
    if (role === "student" || isBde) return
    const loadBatches = async () => {
      setLoadingBatches(true)
      try {
        const data = await api.getBatches()
        setBatches(data)
        if (data.length > 0) {
          const batchParam = searchParams.get("batch")
          const matched = batchParam
            ? data.find((batch: any) => String(batch.id) === batchParam)
            : null
          const liveTarget = findBestRollCallTarget(data, new Date())

          if (matched) {
            setSelectedBatch(matched.code)
          } else if (liveTarget) {
            setSelectedBatch(liveTarget.batch.code)
            if (!dateFromUrl) {
              setDate(liveTarget.ledgerDate)
            }
          } else {
            setSelectedBatch(data[0].code)
          }
        }
      } catch (err) {
        console.error("Failed to load batches:", err)
      } finally {
        setLoadingBatches(false)
      }
    }
    loadBatches()
  }, [role, searchParams, isBde])

  const mapAttendance = React.useCallback((r: any): AttendanceRecord => ({
    entityId: r.entityId,
    name: r.name,
    status: r.status,
    date: r.date,
    loginTime: r.loginTime,
    logoutTime: r.logoutTime,
    shiftStatus: r.shiftStatus,
    workedSeconds: r.workedSeconds,
  }), [])

  // Load attendance records based on Category and Date
  React.useEffect(() => {
    if (role === "student") return // Student view uses mocked ledger below

    const loadKey = `${category}-${date}-${selectedBatch}-${userId ?? ""}`
    const loadKeyChanged = prevLoadKeyRef.current !== loadKey
    if (loadKeyChanged) {
      prevLoadKeyRef.current = loadKey
      setLoading(true)
      if (isBde) setRecords([])
    }

    const requestId = ++loadRequestRef.current

    const loadRecords = async () => {
      try {
        if (category === "student") {
          const currentBatch = batches.find(b => b.code === selectedBatch)
          if (currentBatch) {
            const isScheduled = isClassScheduledOnDate(currentBatch, date)
            setIsClassDayForBatch(isScheduled)
            if (!isScheduled) {
              if (requestId === loadRequestRef.current) {
                setRecords([])
              }
              return
            }
          } else {
            setIsClassDayForBatch(true)
          }
        } else {
          setIsClassDayForBatch(true)
        }

        const existing: any[] = await api.getAttendance(date, category)

        if (requestId !== loadRequestRef.current) return

        if (category === "bde") {
          if (isBde && userId) {
            if (existing.length > 0) {
              setRecords(existing.map(mapAttendance))
            } else {
              setRecords([{
                entityId: String(userId),
                name: userName || "BDE",
                status: "present",
                shiftStatus: "offline",
              }])
            }
          } else {
            const bdes = await api.getBdes()
            if (requestId !== loadRequestRef.current) return
            setRecords(mergeBdeAttendanceRecords(bdes, existing))
          }
        } else if (existing.length > 0) {
          setRecords(existing.map(mapAttendance))
        } else {
          if (category === "student") {
            const students = isTrainer
              ? await api.getTrainerStudents()
              : await api.getStudents()
            if (requestId !== loadRequestRef.current) return
            const currentBatch = batches.find(b => b.code === selectedBatch)
            const filteredStudents = currentBatch 
              ? students.filter((s: any) => currentBatch.studentNames?.includes(s.name))
              : students

            setRecords(filteredStudents.map((s: any) => ({
              entityId: String(s._id || s.id),
              name: s.name,
              status: "present" as const
            })))
          } else if (category === "trainer") {
            const trainers = await api.getTrainers()
            if (requestId !== loadRequestRef.current) return
            setRecords(trainers.map((t: any) => ({
              entityId: String(t._id || t.id),
              name: t.name,
              status: "present" as const
            })))
          }
        }
      } catch (err) {
        console.error("Failed to load attendance records:", err)
      } finally {
        if (requestId === loadRequestRef.current) {
          setLoading(false)
          setPageReady(true)
        }
      }
    }

    loadRecords()
  }, [category, date, role, selectedBatch, batches, isBde, userId, userName, isTrainer, mapAttendance])

  React.useEffect(() => {
    if (role !== "bde" || !userId) return

    const shiftStatus = records[0]?.shiftStatus
    if (shiftStatus !== "active" && shiftStatus !== "paused") return

    const timer = window.setInterval(async () => {
      try {
        const existing = await api.getAttendance(date, "bde")
        if (existing.length === 0) return

        const nextRecord = mapAttendance(existing[0])
        setRecords((prev) => {
          const current = prev[0]
          if (
            current &&
            current.loginTime === nextRecord.loginTime &&
            current.logoutTime === nextRecord.logoutTime &&
            current.shiftStatus === nextRecord.shiftStatus &&
            current.workedSeconds === nextRecord.workedSeconds
          ) {
            return prev
          }
          return [nextRecord]
        })
      } catch {
        // ignore background refresh errors
      }
    }, 10_000)

    return () => window.clearInterval(timer)
  }, [role, date, userId, records[0]?.shiftStatus, mapAttendance])

  React.useEffect(() => {
    if (role === "student" || category !== "bde" || isBde) return

    const timer = window.setInterval(async () => {
      try {
        const [existing, bdes] = await Promise.all([
          api.getAttendance(date, "bde"),
          api.getBdes(),
        ])
        setRecords((prev) => {
          const next = mergeBdeAttendanceRecords(bdes, existing)
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next
        })
      } catch {
        // ignore background refresh errors
      }
    }, 10_000)

    return () => window.clearInterval(timer)
  }, [role, category, date, isBde])

  const handleUpdateStatus = (entityId: string, status: AttendanceRecord["status"]) => {
    setRecords((prev) =>
      prev.map((r) => (r.entityId === entityId ? { ...r, status } : r))
    )
  }

  const handleSubmitAttendance = async () => {
    try {
      await api.saveAttendance(date, category, records)
      addNotification({
        title: "Attendance Recorded",
        description: `Daily ledger submitted for ${category}s on ${date}.`,
        type: "attendance"
      })
      alert(`Success: Attendance report submitted for ${category}s!`)
    } catch (err: any) {
      console.error(err)
      alert(err.message || "Failed to submit attendance")
    }
  }


  const getStatusButton = (record: AttendanceRecord, status: AttendanceRecord["status"], label: string, colorClass: string) => {
    const isActive = record.status === status
    return (
      <button
        onClick={() => handleUpdateStatus(record.entityId, status)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
          isActive 
            ? colorClass 
            : "bg-background border-border/80 text-muted-foreground hover:bg-muted/80"
        }`}
      >
        {label}
      </button>
    )
  }

  // --- STUDENT VIEW SPECIFIC LOGIC ---
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

  const calendarConfig = React.useMemo(() => {
    let year = 2026
    let month = 5 // May
    
    if (studentBatch?.sessions && studentBatch.sessions.length > 0) {
      const firstSession = studentBatch.sessions[0];
      if (firstSession && firstSession.date) {
        const parts = firstSession.date.substring(0, 10).split('-').map(Number)
        if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          year = parts[0]
          month = parts[1]
        }
      }
    } else if (studentBatch?.nextSessionDate) {
      const parts = studentBatch.nextSessionDate.substring(0, 10).split('-').map(Number)
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        year = parts[0]
        month = parts[1]
      }
    }
    
    const totalDays = new Date(year, month, 0).getDate()
    const firstDay = new Date(year, month - 1, 1).getDay() // 0 = Sun, 1 = Mon, etc.
    const emptyDays = firstDay === 0 ? 6 : firstDay - 1
    const monthName = new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' })
    
    return {
      year,
      month,
      totalDays,
      emptyDays,
      monthName
    }
  }, [studentBatch])

  React.useEffect(() => {
    if (role !== "student") return
    const today = new Date()
    const todayDay = today.getDate()
    const todayMonth = today.getMonth() + 1
    const todayYear = today.getFullYear()

    if (calendarConfig.month === todayMonth && calendarConfig.year === todayYear) {
      setSelectedDay(todayDay)
    } else {
      const sessionsOrNext = studentBatch?.sessions && studentBatch.sessions.length > 0 ? studentBatch.sessions : studentBatch?.nextSessionDate
      let firstClass = 1
      for (let d = 1; d <= calendarConfig.totalDays; d++) {
        if (isClassDay(d, sessionsOrNext, calendarConfig.month)) {
          firstClass = d
          break
        }
      }
      setSelectedDay(firstClass)
    }
  }, [role, calendarConfig, studentBatch])

  const getSelectedDayDetails = () => {
    if (!selectedDay) return null
    const conf = calendarConfig
    const sessionsOrNext = studentBatch?.sessions && studentBatch.sessions.length > 0 ? studentBatch.sessions : studentBatch?.nextSessionDate
    const status = getDayStatus(selectedDay, sessionsOrNext, conf.month, conf.emptyDays, attendanceLogs, conf.year)
    const formattedDate = `${conf.year}-${String(conf.month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`
    
    if (status === "no_class") {
      return { date: formattedDate, status: "No Class", details: "No lectures or batch schedules are set for this weekday.", badgeColor: "bg-zinc-500/5 text-zinc-500 border-zinc-700/20" }
    }
    if (status === "weekend") {
      return { date: formattedDate, status: "Weekend", details: "No scheduled lectures or batch sessions.", badgeColor: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" }
    }
    if (status === "pending") {
      return { date: formattedDate, status: "Scheduled", details: "Session active. Attendance report will lock at end of lecture.", badgeColor: "bg-orange-500/10 text-orange-500 dark:text-orange-400 border-orange-500/20" }
    }

    const log = attendanceLogs.find((l: any) => l.date && l.date.substring(0, 10) === formattedDate)
    const loginStr = log?.loginTime ? `Checked in at ${log.loginTime}.` : "Keycard check-in authenticated."
    const logoutStr = log?.logoutTime ? ` Checked out at ${log.logoutTime}.` : ""

    if (status === "absent") {
      return { date: formattedDate, status: "Absent", details: "Unexcused absence logged. Please contact batch coordinator for excuse approval.", badgeColor: "bg-red-500/10 text-red-400 border-red-500/20" }
    }
    if (status === "late") {
      return { date: formattedDate, status: "Late Check-in", details: `${loginStr}${logoutStr} Class began at 09:00 AM (Max grace duration: 10 mins).`, badgeColor: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" }
    }
    return { date: formattedDate, status: "Present", details: `${loginStr}${logoutStr} Attendance marked successfully.`, badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" }
  }

  const dayDetails = getSelectedDayDetails()

  const studentStats = React.useMemo(() => {
    let present = 0
    let absent = 0
    let late = 0
    let totalClassDays = 0

    if (!studentBatch) return { present, absent, late, attendanceScore: "100.0" }

    const conf = calendarConfig
    const sessionsOrNext = studentBatch.sessions && studentBatch.sessions.length > 0 ? studentBatch.sessions : studentBatch.nextSessionDate
    for (let dayNum = 1; dayNum <= conf.totalDays; dayNum++) {
      if (isClassDay(dayNum, sessionsOrNext, conf.month)) {
        totalClassDays++
        const status = getDayStatus(dayNum, sessionsOrNext, conf.month, conf.emptyDays, attendanceLogs, conf.year)
        if (status === "present") present++
        else if (status === "absent") absent++
        else if (status === "late") late++
      }
    }

    const markedClassDays = present + absent + late
    const attendanceScore = markedClassDays > 0 
      ? ((present + late) / markedClassDays) * 100 
      : 100

    return {
      present,
      absent,
      late,
      attendanceScore: attendanceScore.toFixed(1)
    }
  }, [studentBatch, calendarConfig, attendanceLogs])

  // Render Student View
  if (role === "student") {
    if (loadingStudent || !pageReady) {
      return <AttendancePageLoader message="Loading attendance..." />
    }

    if (!studentBatch) {
      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <CalendarCheck className="h-5.5 w-5.5 text-primary" />
                <span>My Attendance Ledger</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Personal attendance records, RFID keycard check-ins, and calendar verification status.
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-4">
            <div className="p-3.5 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 animate-pulse">
              <Calendar className="h-6 w-6" />
            </div>
            <div className="space-y-2 max-w-md mx-auto">
              <h4 className="font-bold text-base text-foreground">Batch Allocation Pending</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You are not currently allocated to any class batch. Your personal attendance ledger and check-in logs will be available here once you are assigned to an active batch.
              </p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5.5 w-5.5 text-primary" />
              <span>My Attendance Ledger</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personal attendance records, RFID keycard check-ins, and calendar verification status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-semibold">Overall Score:</span>
            <Badge variant="success" className="text-xs py-1 px-3">{studentStats.attendanceScore}% Attendance</Badge>
          </div>
        </div>

        {/* Student Stats Grid */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Present Days</p>
                <h3 className="text-lg font-black text-foreground">{studentStats.present} Days</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Late Arrivals</p>
                <h3 className="text-lg font-black text-foreground">{studentStats.late} Day{studentStats.late === 1 ? "" : "s"}</h3>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <X className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase font-bold">Absences</p>
                <h3 className="text-lg font-black text-foreground">{studentStats.absent} Day{studentStats.absent === 1 ? "" : "s"}</h3>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Calendar and Details Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="bg-card md:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-border/40">
              <div>
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Monthly Ledger: {calendarConfig.monthName} {calendarConfig.year}</span>
                </CardTitle>
                <CardDescription>Click dates to view detailed check-in logs.</CardDescription>
              </div>
              <Badge variant="outline">Today: 15/06/2026</Badge>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase text-muted-foreground mb-2">
                {weekdays.map((w) => (
                  <div key={w} className="py-1">{w}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1.5 text-center">
                {Array.from({ length: calendarConfig.emptyDays }).map((_, idx) => (
                  <div key={`empty-${idx}`} className="aspect-square" />
                ))}

                {Array.from({ length: calendarConfig.totalDays }).map((_, idx) => {
                  const dayNum = idx + 1
                  const sessionsOrNext = studentBatch?.sessions && studentBatch.sessions.length > 0 ? studentBatch.sessions : studentBatch?.nextSessionDate
                  const status = getDayStatus(dayNum, sessionsOrNext, calendarConfig.month, calendarConfig.emptyDays, attendanceLogs, calendarConfig.year)
                  const isSelected = selectedDay === dayNum

                  let statusColor = "bg-secondary/15 hover:bg-secondary/40 border-transparent text-foreground/70"
                  if (status === "present") statusColor = "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400"
                  if (status === "absent") statusColor = "bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-400"
                  if (status === "late") statusColor = "bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/25 text-yellow-400"
                  if (status === "weekend") statusColor = "bg-zinc-800/10 dark:bg-zinc-900/20 hover:bg-zinc-800/20 border-transparent text-muted-foreground/45"
                  if (status === "no_class") statusColor = "bg-zinc-900/5 dark:bg-zinc-950/10 hover:bg-zinc-900/10 border-transparent text-muted-foreground/30 opacity-40 cursor-not-allowed"
                  if (status === "pending") statusColor = "bg-orange-500/10 hover:bg-orange-500/20 border-dashed border-orange-500/30 text-orange-500 dark:text-orange-400"

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-between p-1.5 text-[10px] font-bold border transition-all cursor-pointer ${statusColor} ${
                        isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 scale-102" : ""
                      }`}
                    >
                      <span className="self-start">{dayNum}</span>
                      {status !== "weekend" && status !== "no_class" && (
                        <span className={`h-1.5 w-1.5 rounded-full ${
                          status === "present" ? "bg-emerald-400" :
                          status === "absent" ? "bg-red-400" :
                          status === "late" ? "bg-yellow-400" : "bg-orange-400"
                        }`} />
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-card">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Check-in Verification</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                {dayDetails ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Select Date:</span>
                      <strong className="font-mono text-foreground">{dayDetails.date}</strong>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-muted-foreground">Daily Status:</span>
                      <Badge className={`border ${dayDetails.badgeColor}`}>
                        {dayDetails.status}
                      </Badge>
                    </div>

                    <div className="bg-secondary/20 p-3 rounded-xl border border-border/30 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Session Notes</span>
                      <p className="text-foreground/90 leading-relaxed text-[11px]">
                        {dayDetails.details}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted-foreground italic text-center py-4">Click a calendar day to audit records.</p>
                )}
              </CardContent>
            </Card>


          </div>
        </div>
      </div>
    )
  }

  if (!role) {
    return <AttendancePageLoader />
  }

  if (role === "bde" && user) {
    if (!pageReady) {
      return <AttendancePageLoader message="Loading shift log..." />
    }

    const myRecord = records[0]
    const hasShiftData = Boolean(
      myRecord?.loginTime ||
      myRecord?.shiftStatus === "active" ||
      myRecord?.shiftStatus === "paused" ||
      myRecord?.shiftStatus === "finished"
    )
    const showBdeLoading = loading && !hasShiftData

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-primary" />
              <span>My BDE Shift Log</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your personal shift punch history — login, pause, and logout times sync from the dashboard.
            </p>
          </div>
          <Link
            href="/attendance/logs"
            className={cn(
              "inline-flex items-center justify-center rounded-lg font-semibold transition-all w-fit",
              "border border-border bg-background text-foreground hover:bg-muted/80",
              "h-8 px-3 text-xs gap-1.5"
            )}
          >
            <History className="h-3.5 w-3.5" />
            All Logs
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-card p-4 rounded-xl border border-border w-fit">
          <span className="text-xs font-semibold text-muted-foreground">Select Ledger Date:</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="bg-card text-xs border border-border h-8.5 rounded-lg px-2 text-foreground focus-visible:outline-hidden"
          />
        </div>

        <Card className="bg-card hover:shadow-xs">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-extrabold">BDE Shift Log</CardTitle>
            <CardDescription className="text-xs">
              Shift times are recorded automatically when you punch in, pause, or logout from your dashboard.
            </CardDescription>
            {!showBdeLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3">
              <div className="bg-secondary/20 p-2 rounded-lg border border-border/30 text-center">
                <span className="text-[9px] uppercase font-bold text-muted-foreground block">Status</span>
                <strong className="text-sm font-black text-foreground">
                  {shiftStatusLabel(myRecord?.shiftStatus || "offline")}
                </strong>
              </div>
              <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20 text-center">
                <span className="text-[9px] uppercase font-bold text-emerald-500 block">Login</span>
                <strong className="text-sm font-black text-emerald-500 font-mono">{myRecord?.loginTime || "—"}</strong>
              </div>
              <div className="bg-sky-500/5 p-2 rounded-lg border border-sky-500/20 text-center">
                <span className="text-[9px] uppercase font-bold text-sky-500 block">Logout</span>
                <strong className="text-sm font-black text-sky-500 font-mono">{myRecord?.logoutTime || "—"}</strong>
              </div>
              <div className="bg-primary/5 p-2 rounded-lg border border-primary/20 text-center col-span-2 sm:col-span-1">
                <span className="text-[9px] uppercase font-bold text-primary block">Worked</span>
                <strong className="text-sm font-black text-primary font-mono">
                  {myRecord?.workedSeconds ? formatDuration(myRecord.workedSeconds) : "0m 00s"}
                </strong>
              </div>
              <div className="bg-zinc-500/5 p-2 rounded-lg border border-zinc-500/20 text-center">
                <span className="text-[9px] uppercase font-bold text-zinc-500 block">Date</span>
                <strong className="text-sm font-black text-zinc-500">{date}</strong>
              </div>
            </div>
            )}
          </CardHeader>
          <CardContent className="p-4">
            {showBdeLoading ? (
              <div className="flex justify-center items-center py-12">
                <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </div>
            ) : !hasShiftData ? (
              <div className="text-center py-12 text-xs text-muted-foreground">
                No shift punch recorded for this date. Punch in from your dashboard to start tracking.
              </div>
            ) : (
              <div
                className={`flex items-center gap-3 p-4 rounded-xl border ${
                  myRecord.shiftStatus === "active"
                    ? "bg-emerald-500/5 border-emerald-500/20"
                    : myRecord.shiftStatus === "paused"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : myRecord.shiftStatus === "finished"
                        ? "bg-sky-500/5 border-sky-500/20"
                        : "bg-card border-border/60"
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase shrink-0">
                  {(myRecord.name || user.name || "B")
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground text-sm">{myRecord.name || user.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge variant="outline" className="text-[9px] uppercase shrink-0">
                  {shiftStatusLabel(myRecord.shiftStatus || "offline")}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // --- TRAINER / OWNER VIEW ---
  if (!pageReady || loadingBatches) {
    return <AttendancePageLoader message="Loading attendance terminal..." />
  }

  return (
    <div className="space-y-6">
      {/* Top Category Selector Tabs */}
      <div className="flex bg-card p-1 border border-border rounded-xl w-fit">
        <button
          onClick={() => setCategory("student")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            category === "student" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          <span>{isTrainer ? "My Batch Attendance" : "Student Attendance"}</span>
        </button>
        {!isTrainer && (
        <>
        <button
          onClick={() => setCategory("trainer")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            category === "trainer" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Trainer Attendance</span>
        </button>
        <button
          onClick={() => setCategory("bde")}
          className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all ${
            category === "bde" ? "bg-primary text-primary-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>BDE Staff Attendance</span>
        </button>
        </>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-t border-border/40 pt-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            <span>{`${category} Operations Terminal`}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {category === "bde"
              ? "Audit BDE shift punch logs — login, pause, and logout times sync automatically from the dashboard."
              : `Log daily check-ins, audit terminal logs, or configure hardware readers for ${category}s.`}
          </p>
        </div>
        
        {/* Sub-Toggles */}
        <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
          <button
            onClick={() => setActiveTab("roll_call")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
              activeTab === "roll_call" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>{category === "bde" ? "Shift Log" : "Roll Call"}</span>
          </button>
          <button
            onClick={() => setActiveTab("qr_scanner")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold cursor-pointer ${
              activeTab === "qr_scanner" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            <span>QR check-in</span>
          </button>

        </div>
      </div>

      {activeTab === "roll_call" && (
        <div className="space-y-4 animate-scale-in">
          {/* Selector & Date picker bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-muted-foreground">Select Ledger Date:</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-card text-xs border border-border h-8.5 rounded-lg px-2 text-foreground focus-visible:outline-hidden"
              />
            </div>
            
            {category === "student" && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-muted-foreground">Mark Batch:</span>
                <Select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-56 h-8 text-xs bg-card"
                >
                  {sortedBatches.map((b) => {
                    const priority = getBatchRollCallPriority(b, date, sessionClock)
                    const livePrefix =
                      priority >= 300 ? "● LIVE — " : priority >= 200 ? "● Upcoming — " : ""
                    return (
                      <option key={b.id || b._id} value={b.code}>
                        {livePrefix}{b.code} ({b.courseName})
                      </option>
                    )
                  })}
                  {batches.length === 0 && (
                    <option value="">No Active Batches</option>
                  )}
                </Select>
              </div>
            )}
          </div>

          {category === "student" &&
            liveRollCallTarget &&
            (selectedBatch !== liveRollCallTarget.batch.code || date !== liveRollCallTarget.ledgerDate) && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <Activity className="h-4 w-4" />
                  Live session available
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Batch <strong className="text-foreground">{liveRollCallTarget.batch.code}</strong> has a{" "}
                  {liveRollCallTarget.status === "in_progress" ? "live" : "upcoming"} class today.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                className="shrink-0"
                onClick={() => {
                  setSelectedBatch(liveRollCallTarget.batch.code)
                  setDate(liveRollCallTarget.ledgerDate)
                  setSessionManuallySelected(false)
                }}
              >
                Open Live Session
              </Button>
            </div>
          )}

          {!isClassDayForBatch ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 space-y-4">
              <div className="p-3.5 bg-amber-500/10 rounded-full text-amber-600 dark:text-amber-400 animate-pulse">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div className="space-y-2 max-w-md">
                <h4 className="font-bold text-base text-foreground">No Class Scheduled on This Day</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  Batch <strong>{selectedBatch}</strong> is not scheduled for training sessions on <strong>{new Date(date).toLocaleDateString('en-US', { dateStyle: 'long', timeZone: 'UTC' })}</strong>.
                </p>
                <p className="text-[11px] text-muted-foreground">
                  The weekly schedule configured for this batch is: <span className="font-bold text-foreground font-mono">{batches.find(b => b.code === selectedBatch)?.schedule || "N/A"}</span>.
                </p>
              </div>
            </div>
          ) : !isRollCallAvailable ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center rounded-xl border border-dashed border-zinc-500/30 bg-zinc-500/5 space-y-4">
              <div className="p-3.5 bg-zinc-500/10 rounded-full text-zinc-500 dark:text-zinc-400">
                <Clock className="h-6 w-6" />
              </div>
              <div className="space-y-2 max-w-md">
                <h4 className="font-bold text-base text-foreground">No Classes Available Right Now</h4>
                <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                  All scheduled sessions for <strong>{selectedBatch}</strong> on{" "}
                  <strong>{new Date(date + "T12:00:00").toLocaleDateString("en-IN", { dateStyle: "long" })}</strong>{" "}
                  have ended. Roll call opens again before the next class starts.
                </p>
                {activeRollCallSession && activeSessionTimeRange && (
                  <p className="text-[11px] text-muted-foreground">
                    Last session: <span className="font-semibold text-foreground">{activeSessionTopic}</span>
                    {" "}({activeSessionTimeRange.split(", ").slice(1).join(", ")})
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Roll call grid */}
              <Card className="bg-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base font-extrabold capitalize">
                        {category === "bde" ? "BDE Shift Log" : `${category} Roll Call Sheet`}
                      </CardTitle>
                      <CardDescription>
                        {category === "bde"
                          ? "Shift times are recorded automatically when BDEs punch in, pause, or logout from their dashboard."
                          : "Verify and modify status before submitting. Default is Present."}
                        {activeSessionTopic && (
                          <span className="block mt-1 space-y-1">
                            <span className="text-xs text-primary font-semibold">
                              Session: {activeSessionTopic}
                            </span>
                            {activeSessionTimeRange && (
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                {activeSessionTimeRange}
                              </span>
                            )}
                            {rollCallSessionStatus === "in_progress" && (
                              <Badge variant="success" className="text-[9px] h-5">In Progress</Badge>
                            )}
                            {rollCallSessionStatus === "upcoming" && (
                              <Badge variant="info" className="text-[9px] h-5">Upcoming</Badge>
                            )}
                            {rollCallSessionStatus === "completed" && (
                              <Badge variant="outline" className="text-[9px] h-5">Session Ended</Badge>
                            )}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {sortedSessionsForLedgerDate.length > 1 && (
                        <Select
                          value={String(selectedSessionIndex)}
                          onChange={(e) => {
                            setSessionManuallySelected(true)
                            setSelectedSessionIndex(Number(e.target.value))
                          }}
                          className="w-56 h-8 text-xs bg-card"
                        >
                          {sortedSessionsForLedgerDate.map((session, index) => {
                            const sessionStatus = getSessionStatus(session, date, sessionClock)
                            const statusPrefix =
                              sessionStatus === "in_progress"
                                ? "● LIVE — "
                                : sessionStatus === "upcoming"
                                  ? "● Upcoming — "
                                  : ""
                            return (
                              <option key={index} value={String(index)}>
                                {statusPrefix}{session.topic || `Session ${index + 1}`} — {formatSessionTimeRange(session).split(", ").slice(1).join(", ") || "TBD"}
                              </option>
                            )
                          })}
                        </Select>
                      )}
                      <Badge variant="outline">Ledger Date: {date}</Badge>
                    </div>
                  </div>

                  {/* Headcount Dashboard Widgets */}
                  {category === "bde" ? (
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3">
                      <div className="bg-secondary/20 p-2 rounded-lg border border-border/30 text-center">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total</span>
                        <strong className="text-sm font-black text-foreground">{bdeShiftStats.total}</strong>
                      </div>
                      <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20 text-center">
                        <span className="text-[9px] uppercase font-bold text-emerald-500 block">Active</span>
                        <strong className="text-sm font-black text-emerald-500">{bdeShiftStats.active}</strong>
                      </div>
                      <div className="bg-amber-500/5 p-2 rounded-lg border border-amber-500/20 text-center">
                        <span className="text-[9px] uppercase font-bold text-amber-500 block">On Break</span>
                        <strong className="text-sm font-black text-amber-500">{bdeShiftStats.paused}</strong>
                      </div>
                      <div className="bg-sky-500/5 p-2 rounded-lg border border-sky-500/20 text-center">
                        <span className="text-[9px] uppercase font-bold text-sky-500 block">Finished</span>
                        <strong className="text-sm font-black text-sky-500">{bdeShiftStats.finished}</strong>
                      </div>
                      <div className="bg-zinc-500/5 p-2 rounded-lg border border-zinc-500/20 text-center">
                        <span className="text-[9px] uppercase font-bold text-zinc-500 block">Offline</span>
                        <strong className="text-sm font-black text-zinc-500">{bdeShiftStats.offline}</strong>
                      </div>
                    </div>
                  ) : (
                  <div className="grid grid-cols-4 gap-2 pt-3">
                    <div className="bg-secondary/20 p-2 rounded-lg border border-border/30 text-center">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground block">Total</span>
                      <strong className="text-sm font-black text-foreground">{rollCallStats.total}</strong>
                    </div>
                    <div className="bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20 text-center">
                      <span className="text-[9px] uppercase font-bold text-emerald-500 block">Present</span>
                      <strong className="text-sm font-black text-emerald-500">{rollCallStats.present}</strong>
                    </div>
                    <div className="bg-red-500/5 p-2 rounded-lg border border-red-500/20 text-center">
                      <span className="text-[9px] uppercase font-bold text-red-500 block">Absent</span>
                      <strong className="text-sm font-black text-red-500">{rollCallStats.absent}</strong>
                    </div>
                    <div className="bg-amber-500/5 p-2 rounded-lg border border-amber-500/20 text-center">
                      <span className="text-[9px] uppercase font-bold text-amber-500 block">Late</span>
                      <strong className="text-sm font-black text-amber-500">{rollCallStats.late}</strong>
                    </div>
                  </div>
                  )}
                </CardHeader>

                {/* Search and Bulk Actions Toolbar */}
                <div className="p-4 border-b border-border/40 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/5">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={`Search ${category} by name...`}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-card text-xs border border-border h-8.5 rounded-lg pl-8 pr-3 text-foreground focus-visible:outline-hidden"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {category !== "bde" && (
                      <>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase mr-1">Bulk Mark:</span>
                    <button
                      onClick={() => handleMarkAllStatus("present")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Check className="h-3 w-3" />
                      <span>All Present</span>
                    </button>
                    <button
                      onClick={() => handleMarkAllStatus("absent")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-red-500/25 bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                      <span>All Absent</span>
                    </button>
                    <button
                      onClick={() => handleMarkAllStatus("late")}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                    >
                      <Clock className="h-3 w-3" />
                      <span>All Late</span>
                    </button>
                      </>
                    )}
                  </div>
                </div>

                <CardContent className="p-0">
                  {loading ? (
                    <div className="flex justify-center items-center py-12">
                      <svg className="h-8 w-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24" aria-hidden>
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-xs text-muted-foreground">
                      {searchTerm ? "No matching records found." : `No ${category} records found in database.`}
                    </div>
                  ) : (
                    <div className="grid gap-3 p-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                      {filteredRecords.map((record) => {
                        const initials = record.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

                        let cardBg = "bg-card hover:bg-muted/10 border-border/60"
                        if (category === "bde") {
                          if (record.shiftStatus === "active") cardBg = "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                          else if (record.shiftStatus === "paused") cardBg = "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                          else if (record.shiftStatus === "finished") cardBg = "bg-sky-500/5 hover:bg-sky-500/10 border-sky-500/20"
                        } else {
                          if (record.status === "present") cardBg = "bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20"
                          if (record.status === "absent") cardBg = "bg-red-500/5 hover:bg-red-500/10 border-red-500/20"
                          if (record.status === "late") cardBg = "bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20"
                        }

                        return (
                          <div 
                            key={record.entityId} 
                            className={`flex flex-col justify-between p-4 rounded-xl border transition-all space-y-4 shadow-2xs ${cardBg}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs uppercase ${
                                category === "bde"
                                  ? record.shiftStatus === "active" ? "bg-emerald-500/10 text-emerald-500"
                                  : record.shiftStatus === "paused" ? "bg-amber-500/10 text-amber-500"
                                  : record.shiftStatus === "finished" ? "bg-sky-500/10 text-sky-500"
                                  : "bg-secondary text-muted-foreground"
                                  : record.status === "present" ? "bg-emerald-500/10 text-emerald-500"
                                  : record.status === "absent" ? "bg-red-500/10 text-red-500"
                                  : record.status === "late" ? "bg-amber-500/10 text-amber-500"
                                  : "bg-secondary text-muted-foreground"
                              }`}>
                                {initials}
                              </div>
                              <div className="text-xs min-w-0">
                                <p className="font-bold text-foreground truncate">{record.name}</p>
                                <span className="text-[10px] text-muted-foreground block truncate">ID: {record.entityId}</span>
                                {category === "bde" && (
                                  <div className="mt-1.5 space-y-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                                      <span className="text-muted-foreground">
                                        Login:{" "}
                                        <strong className="text-foreground font-mono">
                                          {record.loginTime || "—"}
                                        </strong>
                                      </span>
                                      <span className="text-muted-foreground/40">•</span>
                                      <span className="text-muted-foreground">
                                        Logout:{" "}
                                        <strong className="text-foreground font-mono">
                                          {record.logoutTime || "—"}
                                        </strong>
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge
                                        variant="outline"
                                        className={`text-[9px] h-5 px-1.5 ${
                                          record.shiftStatus === "active"
                                            ? "border-emerald-500/30 text-emerald-600"
                                            : record.shiftStatus === "paused"
                                              ? "border-amber-500/30 text-amber-600"
                                              : record.shiftStatus === "finished"
                                                ? "border-sky-500/30 text-sky-600"
                                                : ""
                                        }`}
                                      >
                                        {shiftStatusLabel(record.shiftStatus || "offline")}
                                      </Badge>
                                      {record.workedSeconds != null && record.workedSeconds > 0 && (
                                        <span className="text-[10px] font-mono font-semibold text-primary">
                                          {formatDuration(record.workedSeconds)} worked
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {category !== "bde" && (
                            <div className="grid grid-cols-3 gap-1 bg-secondary/35 p-1 rounded-lg border border-border/30">
                              <button
                                onClick={() => handleUpdateStatus(record.entityId, "present")}
                                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  record.status === "present"
                                    ? "bg-emerald-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <Check className="h-3 w-3" />
                                <span>Present</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(record.entityId, "absent")}
                                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  record.status === "absent"
                                    ? "bg-red-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <X className="h-3 w-3" />
                                <span>Absent</span>
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(record.entityId, "late")}
                                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                                  record.status === "late"
                                    ? "bg-amber-600 text-white shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                              >
                                <Clock className="h-3 w-3" />
                                <span>Late</span>
                              </button>
                            </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {records.length > 0 && category !== "bde" && (
                <div className="flex justify-end pt-2">
                  <Button variant="primary" icon={CalendarCheck} onClick={handleSubmitAttendance}>
                    Submit Attendance Log
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "qr_scanner" && (
        <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl space-y-6 max-w-md mx-auto text-center animate-scale-in">
          <div>
            <h2 className="text-base font-bold text-foreground">Self-Mark QR Code</h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              Project this screen in class. Students or staff scan with mobile to log location attendance.
            </p>
          </div>

          <div className="border border-border/80 p-5 bg-white dark:bg-zinc-800 rounded-2xl shadow-xs">
            <div className="h-44 w-44 bg-zinc-100 flex items-center justify-center relative border border-dashed border-zinc-300">
              <QrCode className="h-32 w-32 text-zinc-900" />
              <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-md animate-bounce top-1/2" />
            </div>
          </div>

          <div className="text-xs space-y-1 text-muted-foreground">
            <p className="font-semibold text-foreground capitalize">Category: {category}</p>
            <p>Code expires in: <strong className="text-primary">45 seconds</strong></p>
          </div>
        </div>
      )}


    </div>
  )
}
