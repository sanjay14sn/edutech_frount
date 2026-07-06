"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, UserPlus, ShieldAlert, Key, Award, BarChart3, CalendarCheck, CheckCircle2, AlertCircle, 
  Search, Filter, Play, RefreshCw, Send, Trash2, Edit2, Check, ArrowRight, ChevronRight, ChevronLeft, Calendar, Clock, X, Mail, Phone, MoreVertical
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { useStore, BDE, Lead, BDETask } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { formatDuration, shiftStatusLabel, type ShiftStatus } from "@/lib/shiftTimer"
import { api, ApiError } from "@/lib/api"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice, showCapacityLimitToast } from "@/components/shared/CapacityLimitNotice"

interface BdeShiftLog {
  id: string
  bdeId: string
  date: string
  loginTime?: string
  logoutTime?: string
  shiftStatus?: ShiftStatus
  workedSeconds?: number
  name?: string
  status?: string
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const WEEK_OFF_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function resolveWeeklyOffDays(bde: BDE) {
  return bde.weeklyOffDays?.length ? bde.weeklyOffDays : [0]
}

function formatWeeklyOff(bde: BDE) {
  return resolveWeeklyOffDays(bde)
    .map((d) => WEEK_OFF_LABELS[d])
    .join(", ")
}

function isBdeWeeklyOff(date: Date, bde: BDE) {
  return resolveWeeklyOffDays(bde).includes(date.getDay())
}

function hasMarkedAttendance(log?: BdeShiftLog) {
  if (!log) return false
  if (log.loginTime) return true
  return log.status === "present" || log.status === "late" || log.status === "absent"
}

function statusFromLog(log: BdeShiftLog) {
  if (log.shiftStatus === "active" || log.shiftStatus === "paused") return "active"
  if (log.status === "late") return "late"
  if (log.status === "absent" && !log.loginTime) return "absent"
  if (log.loginTime || log.status === "present") return log.status === "late" ? "late" : "present"
  return "absent"
}

function canManuallyMarkDay(dayType: string) {
  return dayType !== "holiday" && dayType !== "before_joining" && dayType !== "future"
}

function currentMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
}

function shiftMonthKey(monthKey: string, delta: number) {
  const [year, month] = monthKey.split("-").map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function getCalendarConfig(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number)
  const totalDays = new Date(year, month, 0).getDate()
  const firstDay = new Date(year, month - 1, 1).getDay()
  const emptyDays = firstDay === 0 ? 6 : firstDay - 1
  const monthName = new Date(year, month - 1, 1).toLocaleString("default", { month: "long" })
  return { year, month, totalDays, emptyDays, monthName }
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function parseJoinDate(joiningDate?: string) {
  if (!joiningDate) return null
  const normalized = joiningDate.includes("T") ? joiningDate : `${joiningDate}T12:00:00`
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function getApplicableBdes(bdes: BDE[], filterBdeId: string) {
  if (filterBdeId === "all") return bdes.filter((b) => b.status === "active")
  return bdes.filter((b) => b.id === filterBdeId)
}

function isEmployedOnDate(bde: BDE, key: string) {
  const join = parseJoinDate(bde.joiningDate)
  if (!join) return true
  const cell = new Date(`${key}T12:00:00`)
  cell.setHours(0, 0, 0, 0)
  return cell >= join
}

function isWeeklyOffForEmployedBdes(cell: Date, key: string, applicable: BDE[]) {
  const employed = applicable.filter((b) => isEmployedOnDate(b, key))
  if (employed.length === 0) return false
  return employed.every((b) => isBdeWeeklyOff(cell, b))
}

function getBdeDayStatus(
  dayNum: number,
  year: number,
  month: number,
  records: BdeShiftLog[],
  bdes: BDE[],
  filterBdeId: string
) {
  const key = dateKey(year, month, dayNum)
  const cell = new Date(year, month - 1, dayNum)
  cell.setHours(0, 0, 0, 0)

  const applicable = getApplicableBdes(bdes, filterBdeId)
  const employed = applicable.filter((b) => isEmployedOnDate(b, key))
  if (employed.length === 0) return "before_joining"

  if (filterBdeId !== "all") {
    if (isBdeWeeklyOff(cell, employed[0])) return "holiday"
  } else if (isWeeklyOffForEmployedBdes(cell, key, applicable)) {
    return "holiday"
  }

  const working = employed.filter((b) => !isBdeWeeklyOff(cell, b))
  if (working.length === 0) return "holiday"

  const dayRecords = records.filter(
    (r) => r.date?.substring(0, 10) === key && working.some((b) => b.id === r.bdeId)
  )
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const punched = dayRecords.filter((r) => hasMarkedAttendance(r))
  if (punched.some((r) => r.shiftStatus === "active" || r.shiftStatus === "paused")) return "active"
  if (punched.length === working.length && working.length > 0) {
    if (punched.some((r) => statusFromLog(r) === "absent")) return "absent"
    return punched.some((r) => statusFromLog(r) === "late") ? "late" : "present"
  }
  if (punched.length > 0 && punched.length < working.length && cell <= today) return "partial"
  if (punched.length > 0) return statusFromLog(punched[0])

  if (cell > today) return "future"
  if (cell.getTime() === today.getTime()) return "pending"
  return "absent"
}

function computeMonthStats(
  config: ReturnType<typeof getCalendarConfig>,
  records: BdeShiftLog[],
  bdes: BDE[],
  filterBdeId: string
) {
  const applicable = getApplicableBdes(bdes, filterBdeId)
  let present = 0
  let absent = 0
  let active = 0
  let holidays = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let d = 1; d <= config.totalDays; d++) {
    const key = dateKey(config.year, config.month, d)
    const cell = new Date(config.year, config.month - 1, d)
    cell.setHours(0, 0, 0, 0)

    const employed = applicable.filter((b) => isEmployedOnDate(b, key))
    if (employed.length === 0) {
      continue
    }

    const working =
      filterBdeId !== "all"
        ? employed.filter((b) => !isBdeWeeklyOff(cell, b))
        : employed.filter((b) => !isBdeWeeklyOff(cell, b))

    if (working.length === 0) {
      holidays++
      continue
    }

    for (const bde of working) {
      const log = records.find((r) => r.bdeId === bde.id && r.date?.substring(0, 10) === key)
      if (log && hasMarkedAttendance(log)) {
        if (log.shiftStatus === "active" || log.shiftStatus === "paused") active++
        else if (statusFromLog(log) === "absent") absent++
        else present++
      } else if (cell <= today) {
        absent++
      }
    }
  }

  return { present, absent, active, holidays }
}

function getBdeDayBreakdown(
  dateKeyValue: string,
  records: BdeShiftLog[],
  bdes: BDE[],
  filterBdeId: string
) {
  const cell = new Date(`${dateKeyValue}T12:00:00`)
  cell.setHours(0, 0, 0, 0)
  const applicable = getApplicableBdes(bdes, filterBdeId)

  return applicable.map((bde) => {
    const log = records.find((r) => r.bdeId === bde.id && r.date?.substring(0, 10) === dateKeyValue)
    let dayType: "holiday" | "before_joining" | "present" | "absent" | "active" | "pending" | "future" = "absent"

    if (!isEmployedOnDate(bde, dateKeyValue)) dayType = "before_joining"
    else if (isBdeWeeklyOff(cell, bde)) dayType = "holiday"
    else if (log && hasMarkedAttendance(log)) {
      dayType = statusFromLog(log) as typeof dayType
    } else {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (cell > today) dayType = "future"
      else if (cell.getTime() === today.getTime()) dayType = "pending"
    }

    return { bde, log, dayType, joiningDate: bde.joiningDate }
  })
}

function BdeAttendanceCalendar({
  records,
  bdes,
  filterBdeId,
  onFilterBdeIdChange,
  showBdeFilter = true,
  allowManualMarking = true,
  onRefresh,
  loading = false,
}: {
  records: BdeShiftLog[]
  bdes: BDE[]
  filterBdeId: string
  onFilterBdeIdChange?: (id: string) => void
  showBdeFilter?: boolean
  allowManualMarking?: boolean
  onRefresh?: () => void | Promise<void>
  loading?: boolean
}) {
  const [calendarMonth, setCalendarMonth] = React.useState(currentMonthKey)
  const [selectedDay, setSelectedDay] = React.useState<number | null>(null)
  const [bdeSearch, setBdeSearch] = React.useState("")
  const [manualLogin, setManualLogin] = React.useState("09:30 AM")
  const [manualLogout, setManualLogout] = React.useState("06:30 PM")
  const [savingMark, setSavingMark] = React.useState(false)

  const sortedBdes = React.useMemo(
    () => [...bdes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [bdes]
  )

  const filteredBdeList = React.useMemo(() => {
    const query = bdeSearch.trim().toLowerCase()
    if (!query) return sortedBdes
    return sortedBdes.filter(
      (bde) =>
        bde.name.toLowerCase().includes(query) ||
        bde.employeeId.toLowerCase().includes(query) ||
        bde.email.toLowerCase().includes(query)
    )
  }, [sortedBdes, bdeSearch])

  const config = React.useMemo(() => getCalendarConfig(calendarMonth), [calendarMonth])
  const visibleRecords = React.useMemo(
    () => (filterBdeId ? records.filter((r) => r.bdeId === filterBdeId) : []),
    [records, filterBdeId]
  )

  React.useEffect(() => {
    const today = new Date()
    if (config.month === today.getMonth() + 1 && config.year === today.getFullYear()) {
      setSelectedDay(today.getDate())
    } else {
      setSelectedDay(1)
    }
  }, [calendarMonth, config.month, config.year])

  const monthStats = React.useMemo(
    () => computeMonthStats(config, visibleRecords, bdes, filterBdeId),
    [config, visibleRecords, bdes, filterBdeId]
  )

  const selectedDateKey =
    selectedDay != null ? dateKey(config.year, config.month, selectedDay) : null
  const selectedStatus =
    selectedDay != null
      ? getBdeDayStatus(selectedDay, config.year, config.month, visibleRecords, bdes, filterBdeId)
      : null
  const selectedBreakdown = selectedDateKey
    ? getBdeDayBreakdown(selectedDateKey, visibleRecords, bdes, filterBdeId)
    : []
  const selectedBdeInfo = bdes.find((b) => b.id === filterBdeId) ?? null

  React.useEffect(() => {
    const log = selectedBreakdown[0]?.log
    setManualLogin(log?.loginTime || "09:30 AM")
    setManualLogout(log?.logoutTime || "06:30 PM")
  }, [selectedDateKey, filterBdeId, selectedBreakdown])

  const handleManualMark = async (bde: BDE, status: "present" | "late" | "absent") => {
    if (!selectedDateKey || !onRefresh) return
    setSavingMark(true)
    try {
      const record: Record<string, string> = {
        entityId: bde.id,
        name: bde.name,
        status,
      }
      if (status !== "absent") {
        record.loginTime = manualLogin.trim() || "09:30 AM"
        record.logoutTime = manualLogout.trim() || "06:30 PM"
      }
      await api.saveAttendance(selectedDateKey, "bde", [record])
      await onRefresh()
    } catch (error) {
      console.error("Failed to save BDE attendance:", error)
      alert("Failed to save attendance. Please try again.")
    } finally {
      setSavingMark(false)
    }
  }

  const statusMeta: Record<string, { label: string; badge: string; detail: string }> = {
    present: {
      label: "Present",
      badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      detail: "Shift punch recorded with login and logout times.",
    },
    late: {
      label: "Late",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      detail: "Login recorded after the expected shift start.",
    },
    active: {
      label: "On shift",
      badge: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      detail: "BDE is currently punched in or on a paused shift.",
    },
    absent: {
      label: "No punch",
      badge: "bg-red-500/10 text-red-400 border-red-500/20",
      detail: "No shift login recorded for this working day.",
    },
    pending: {
      label: "Scheduled",
      badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      detail: "Today — shift not started yet.",
    },
    weekend: {
      label: "Weekend",
      badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      detail: "Non-working day.",
    },
    future: {
      label: "Upcoming",
      badge: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
      detail: "Future date.",
    },
    holiday: {
      label: "Holiday",
      badge: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      detail: "Configured weekly off day — not counted as a missing punch.",
    },
    before_joining: {
      label: "Pre-joining",
      badge: "bg-muted/50 text-muted-foreground/70 border-border/40",
      detail: "Date is before the BDE's joining date — not applicable for attendance.",
    },
    partial: {
      label: "Partial",
      badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      detail: "Some BDEs punched in; others are missing for this working day.",
    },
  }

  return (
    <div className={`grid gap-4 ${showBdeFilter ? "lg:grid-cols-[260px_1fr]" : ""}`}>
      {showBdeFilter && onFilterBdeIdChange && (
        <Card className="bg-card h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2 border-b border-border/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              BDE Attendance
            </CardTitle>
            <CardDescription className="text-[10px]">Alphabetical · one at a time</CardDescription>
          </CardHeader>
          <CardContent className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={bdeSearch}
                onChange={(e) => setBdeSearch(e.target.value)}
                placeholder="Search BDE..."
                className="w-full h-8 rounded-lg border border-border bg-card pl-8 pr-3 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="max-h-[420px] overflow-y-auto space-y-1 pr-0.5">
              {filteredBdeList.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-6 italic">No BDEs match your search.</p>
              ) : (
                filteredBdeList.map((bde) => {
                  const isActive = filterBdeId === bde.id
                  return (
                    <button
                      key={bde.id}
                      type="button"
                      onClick={() => onFilterBdeIdChange(bde.id)}
                      className={`w-full text-left rounded-lg border px-3 py-2.5 transition-colors ${
                        isActive
                          ? "border-primary/40 bg-primary/10 text-foreground"
                          : "border-border/60 bg-card hover:bg-muted/40 text-foreground/90"
                      }`}
                    >
                      <p className="text-xs font-bold leading-tight truncate">{bde.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{bde.employeeId}</p>
                      <p className="text-[10px] text-muted-foreground/80 mt-0.5">Joined {formatDate(bde.joiningDate)}</p>
                    </button>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4 min-w-0">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCalendarMonth((m) => shiftMonthKey(m, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-foreground min-w-[140px] text-center">
            {config.monthName} {config.year}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCalendarMonth((m) => shiftMonthKey(m, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

      {!filterBdeId ? (
        <Card className="bg-card">
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {bdes.length === 0
              ? "No BDEs registered yet. Add a BDE to view attendance logs."
              : "Select a BDE from the list to view their attendance calendar."}
          </CardContent>
        </Card>
      ) : (
        <>
      {selectedBdeInfo && (
        <p className="text-[11px] text-muted-foreground">
          Attendance from{" "}
          <span className="font-semibold text-foreground">{formatDate(selectedBdeInfo.joiningDate)}</span>
          {" "}· Weekly off:{" "}
          <span className="font-semibold text-foreground">{formatWeeklyOff(selectedBdeInfo)}</span>
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Present days", value: monthStats.present, tone: "text-emerald-400" },
          { label: "Missing punch", value: monthStats.absent, tone: "text-red-400" },
          { label: "Holidays", value: monthStats.holidays, tone: "text-violet-400" },
          { label: "Live shifts", value: monthStats.active, tone: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/60 bg-muted/20 p-3 text-center">
            <p className="text-[10px] uppercase font-bold text-muted-foreground">{stat.label}</p>
            <p className={`text-xl font-extrabold ${stat.tone}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="bg-card lg:col-span-2">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-extrabold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Monthly shift calendar
            </CardTitle>
            <CardDescription>Click a date to view login, logout, and hours worked.</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[9px] uppercase text-muted-foreground mb-2">
                  {WEEKDAYS.map((w) => (
                    <div key={w} className="py-1">{w}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {Array.from({ length: config.emptyDays }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="aspect-square" />
                  ))}
                  {Array.from({ length: config.totalDays }).map((_, idx) => {
                    const dayNum = idx + 1
                    const status = getBdeDayStatus(dayNum, config.year, config.month, visibleRecords, bdes, filterBdeId)
                    const isSelected = selectedDay === dayNum
                    let statusColor = "bg-secondary/15 hover:bg-secondary/40 border-transparent text-foreground/70"
                    if (status === "present") statusColor = "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/25 text-emerald-400"
                    if (status === "absent") statusColor = "bg-red-500/10 hover:bg-red-500/20 border-red-500/25 text-red-400"
                    if (status === "late") statusColor = "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400"
                    if (status === "partial") statusColor = "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/25 text-amber-400"
                    if (status === "active") statusColor = "bg-blue-500/10 hover:bg-blue-500/20 border-blue-500/25 text-blue-400"
                    if (status === "holiday") statusColor = "bg-violet-500/10 border-violet-500/20 text-violet-400/90"
                    if (status === "before_joining") statusColor = "bg-muted/40 border-border/30 text-muted-foreground/40 opacity-60"
                    if (status === "future") statusColor = "bg-zinc-900/5 border-transparent text-muted-foreground/30"
                    if (status === "pending") statusColor = "bg-orange-500/10 border-dashed border-orange-500/30 text-orange-400"

                    return (
                      <button
                        key={dayNum}
                        type="button"
                        onClick={() => setSelectedDay(dayNum)}
                        disabled={status === "before_joining"}
                        className={`aspect-square rounded-lg flex flex-col items-center justify-between p-1.5 text-[10px] font-bold border transition-all ${
                          status === "before_joining" ? "cursor-not-allowed" : "cursor-pointer"
                        } ${statusColor} ${
                          isSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]" : ""
                        }`}
                      >
                        <span className={`self-start ${status === "before_joining" ? "line-through decoration-muted-foreground/30" : ""}`}>
                          {dayNum}
                        </span>
                        {status !== "future" && status !== "holiday" && status !== "before_joining" && (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              status === "present" ? "bg-emerald-400" :
                              status === "absent" ? "bg-red-400" :
                              status === "late" || status === "partial" ? "bg-amber-400" :
                              status === "active" ? "bg-blue-400" : "bg-orange-400"
                            }`}
                          />
                        )}
                        {(status === "holiday") && (
                          <span className="text-[8px] uppercase tracking-wide opacity-80">Off</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Present</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-400" /> No punch</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" /> Weekly off</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Pre-joining</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-400" /> On shift</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" /> Today</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Day details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4 text-xs">
            {!selectedDay || !selectedDateKey ? (
              <p className="text-muted-foreground italic text-center py-6">Select a date on the calendar.</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-semibold">Date</span>
                  <span className="font-mono font-bold text-foreground">{formatDate(selectedDateKey)}</span>
                </div>
                {selectedStatus && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground font-semibold">Status</span>
                    <Badge className={`border ${statusMeta[selectedStatus]?.badge || ""}`}>
                      {statusMeta[selectedStatus]?.label || selectedStatus}
                    </Badge>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground leading-relaxed bg-secondary/20 p-3 rounded-xl border border-border/30">
                  {statusMeta[selectedStatus || "future"]?.detail}
                </p>
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {selectedBreakdown.map(({ bde, log, dayType }) => (
                    <div key={bde.id} className="rounded-xl border border-border/50 p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-bold text-foreground">{bde.name}</p>
                          <p className="text-[10px] text-muted-foreground">Joined {formatDate(bde.joiningDate)}</p>
                        </div>
                        <Badge className={`border text-[9px] uppercase h-5 ${statusMeta[dayType]?.badge || ""}`}>
                          {statusMeta[dayType]?.label || dayType}
                        </Badge>
                      </div>
                      {dayType === "holiday" && (
                        <p className="text-[10px] text-muted-foreground">
                          Weekly off ({formatWeeklyOff(bde)}) — not counted in missing punch.
                        </p>
                      )}
                      {dayType === "before_joining" && (
                        <p className="text-[10px] text-muted-foreground">
                          Before joining date ({formatDate(bde.joiningDate)}) — excluded from attendance.
                        </p>
                      )}
                      {(log?.loginTime || log?.status === "present" || log?.status === "late") && (
                        <>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2">
                              <p className="text-emerald-500 font-bold uppercase text-[9px]">Login</p>
                              <p className="font-mono font-bold text-foreground">{log.loginTime || "—"}</p>
                            </div>
                            <div className="rounded-lg bg-sky-500/5 border border-sky-500/15 p-2">
                              <p className="text-sky-500 font-bold uppercase text-[9px]">Logout</p>
                              <p className="font-mono font-bold text-foreground">{log.logoutTime || "Active"}</p>
                            </div>
                          </div>
                          {log.workedSeconds ? (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Worked:{" "}
                              <span className="font-mono font-bold text-primary">
                                {formatDuration(log.workedSeconds)}
                              </span>
                            </p>
                          ) : null}
                        </>
                      )}
                      {allowManualMarking && onRefresh && canManuallyMarkDay(dayType) && (
                        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Manual attendance</p>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Login</label>
                              <Input
                                value={manualLogin}
                                onChange={(e) => setManualLogin(e.target.value)}
                                placeholder="09:30 AM"
                                className="h-8 text-[11px] font-mono bg-card"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-semibold text-muted-foreground uppercase">Logout</label>
                              <Input
                                value={manualLogout}
                                onChange={(e) => setManualLogout(e.target.value)}
                                placeholder="06:30 PM"
                                className="h-8 text-[11px] font-mono bg-card"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingMark}
                              className="h-7 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => handleManualMark(bde, "present")}
                            >
                              Present
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingMark}
                              className="h-7 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                              onClick={() => handleManualMark(bde, "late")}
                            >
                              Late
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={savingMark}
                              className="h-7 text-[10px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleManualMark(bde, "absent")}
                            >
                              Absent
                            </Button>
                          </div>
                          {savingMark && (
                            <p className="text-[10px] text-muted-foreground italic">Saving attendance…</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
        </>
      )}
      </div>
    </div>
  )
}

function leadBelongsToBde(lead: Lead, bde: BDE) {
  if (lead.assignedBdeId && String(lead.assignedBdeId) === String(bde.id)) {
    return true
  }
  const counsellor = (lead.counsellor || "").trim().toLowerCase()
  const bdeName = (bde.name || "").trim().toLowerCase()
  return counsellor.length > 0 && counsellor === bdeName
}

function leadIsUnassigned(lead: Lead, bdes: BDE[]) {
  return !bdes.some((bde) => leadBelongsToBde(lead, bde))
}

function normalizeLeadRecord(lead: Lead & { _id?: string }) {
  return { ...lead, id: lead.id || lead._id || "" } as Lead
}

export default function BDEManagementPage() {
  const { 
    bdes, 
    leads, 
    addBde, 
    updateBde, 
    deleteBde, 
    assignLead, 
    addNotification, 
    bdeTargets, 
    bdeAttendance,
    user,
    setBdes,
    setLeads
  } = useStore()
  const { policy, atCapacity } = useCenterPolicy()
  const bdeAtCapacity = atCapacity("bdes")
  
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        await useStore.getState().fetchCenterPolicy()
        const [bdesData, leadsData] = await Promise.all([
          api.getBdes(),
          api.getLeads().catch(() => []),
        ])
        setBdes(bdesData)
        if (leadsData.length > 0) {
          setLeads(leadsData.map((lead: Lead & { _id?: string }) => normalizeLeadRecord(lead)))
        }
      } catch (error) {
        console.error("Failed to fetch BDE directory data:", error)
      }
    }
    fetchData()
  }, [setBdes, setLeads])

  const getLeadsForBde = React.useCallback(
    (bde: BDE) => leads.filter((lead) => leadBelongsToBde(lead, bde)),
    [leads]
  )

  const unassignedLeads = React.useMemo(
    () => leads.filter((lead) => leadIsUnassigned(lead, bdes)),
    [leads, bdes]
  )

  // Tab State
  const [activeTab, setActiveTab] = React.useState<"directory" | "comparison" | "incentives">("directory")
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [openDropdownId, setOpenDropdownId] = React.useState<string | null>(null)

  // Modal States
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [isAssignOpen, setIsAssignOpen] = React.useState(false)
  const [selectedBde, setSelectedBde] = React.useState<BDE | null>(null)
  const [isPerfOpen, setIsPerfOpen] = React.useState(false)
  const [isAttendanceOpen, setIsAttendanceOpen] = React.useState(false)
  const [shiftLogs, setShiftLogs] = React.useState<BdeShiftLog[]>([])
  const [attendanceLoading, setAttendanceLoading] = React.useState(false)
  const [attendanceBdeFilter, setAttendanceBdeFilter] = React.useState("")

  const attendanceBdesSorted = React.useMemo(
    () => [...bdes].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [bdes]
  )

  React.useEffect(() => {
    if (!attendanceBdesSorted.length) {
      if (attendanceBdeFilter) setAttendanceBdeFilter("")
      return
    }
    const isValid = attendanceBdesSorted.some((bde) => bde.id === attendanceBdeFilter)
    if (!isValid || attendanceBdeFilter === "all") {
      setAttendanceBdeFilter(attendanceBdesSorted[0].id)
    }
  }, [attendanceBdesSorted, attendanceBdeFilter])

  // Form States for Add/Edit BDE
  const [formData, setFormData] = React.useState({
    name: "",
    employeeId: "",
    email: "",
    phone: "",
    password: "",
    gender: "female",
    dob: "1995-01-01",
    address: "",
    qualification: "",
    experience: "",
    joiningDate: new Date().toISOString().split("T")[0],
    weeklyOffDays: [0] as number[],
    monthlyTarget: 30,
    targetType: "leads" as "leads" | "revenue",
    commissionEnabled: false,
    commissionPercentage: 2,
    commissionApplyFrom: "from_start" as "from_start" | "after_target" | "after_threshold",
    commissionThreshold: 75000,
    status: "active" as "active" | "inactive"
  })

  // Lead assignment
  const [assignmentType, setAssignmentType] = React.useState<"manual" | "auto">("manual")
  const [assignLeadId, setAssignLeadId] = React.useState("")
  const [assignBdeId, setAssignBdeId] = React.useState("")

  const toggleWeeklyOffDay = (dayIndex: number) => {
    setFormData((prev) => {
      const current = prev.weeklyOffDays
      const next = current.includes(dayIndex)
        ? current.filter((d) => d !== dayIndex)
        : [...current, dayIndex].sort((a, b) => a - b)
      return { ...prev, weeklyOffDays: next.length > 0 ? next : [0] }
    })
  }

  // Handle Input Changes
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]:
          type === "checkbox"
            ? checked
            : name === "monthlyTarget" || name === "commissionPercentage" || name === "commissionThreshold"
              ? Number(value)
              : value
      }
      if (name === "targetType") {
        updated.monthlyTarget = value === "revenue" ? 75000 : 30
      }
      if (name === "commissionApplyFrom" && value === "after_threshold" && !updated.commissionThreshold) {
        updated.commissionThreshold = updated.monthlyTarget
      }
      return updated
    })
  }

  // Add BDE Submit
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.phone) {
      alert("Please fill all required fields.")
      return
    }

    try {
      const data = await api.createBde({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        gender: formData.gender,
        dob: formData.dob,
        address: formData.address,
        qualification: formData.qualification,
        experience: formData.experience,
        joiningDate: formData.joiningDate,
        weeklyOffDays: formData.weeklyOffDays,
        monthlyTarget: formData.monthlyTarget,
        targetType: formData.targetType,
        commissionEnabled: formData.commissionEnabled,
        commissionPercentage: formData.commissionEnabled ? formData.commissionPercentage : 0,
        commissionApplyFrom: formData.commissionApplyFrom,
        commissionThreshold:
          formData.commissionEnabled && formData.commissionApplyFrom === "after_threshold"
            ? formData.commissionThreshold
            : undefined,
        status: formData.status
      })

      addBde(data)
      setIsAddOpen(false)
      addNotification({
        title: "New BDE Registered",
        description: `${formData.name} was successfully onboarded as BDE.`,
        type: "system"
      })
      resetForm()
    } catch (error) {
      console.error("Failed to create BDE", error)
      if (error instanceof ApiError && error.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "bdes", policy, error.message)
        void useStore.getState().fetchCenterPolicy()
      } else {
        alert(error instanceof Error ? error.message : "Failed to create BDE")
      }
    }
  }

  // Edit BDE Submit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBde) return

    try {
      const data = await api.updateBde(selectedBde.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        employeeId: formData.employeeId,
        gender: formData.gender,
        dob: formData.dob,
        address: formData.address,
        qualification: formData.qualification,
        experience: formData.experience,
        joiningDate: formData.joiningDate,
        weeklyOffDays: formData.weeklyOffDays,
        monthlyTarget: formData.monthlyTarget,
        targetType: formData.targetType,
        commissionEnabled: formData.commissionEnabled,
        commissionPercentage: formData.commissionEnabled ? formData.commissionPercentage : 0,
        commissionApplyFrom: formData.commissionApplyFrom,
        commissionThreshold:
          formData.commissionEnabled && formData.commissionApplyFrom === "after_threshold"
            ? formData.commissionThreshold
            : undefined,
        status: formData.status
      })

      updateBde(data)
      setIsEditOpen(false)
      addNotification({
        title: "BDE Profile Updated",
        description: `Settings for BDE ${formData.name} were updated successfully.`,
        type: "system"
      })
      resetForm()
    } catch (error) {
      console.error("Failed to update BDE", error)
      alert("Failed to update BDE")
    }
  }

  // Handle Delete BDE
  const handleDeleteBde = async (bde: BDE) => {
    if (!confirm(`Are you sure you want to remove BDE: ${bde.name}?`)) return
    try {
      await api.deleteBde(bde.id)
      deleteBde(bde.id)
      addNotification({
        title: "BDE Removed",
        description: `BDE ${bde.name} was successfully removed from the system.`,
        type: "system"
      })
    } catch (error) {
      console.error("Failed to delete BDE:", error)
      alert("Failed to delete BDE.")
    }
  }

  // Handle password reset
  const handleResetPassword = (bde: BDE) => {
    alert(`Reset password link has been sent to BDE: ${bde.name} (${bde.email})`)
  }

  // Handle toggle login access
  const handleToggleLogin = async (bde: BDE) => {
    const updatedStatus = bde.status === "active" ? "inactive" : "active"
    try {
      const data = await api.updateBde(bde.id, {
        ...bde,
        status: updatedStatus
      })
      updateBde(data)
      addNotification({
        title: updatedStatus === "active" ? "Login Enabled" : "Login Disabled",
        description: `Access for BDE ${bde.name} was changed to ${updatedStatus}.`,
        type: "system"
      })
    } catch (error) {
      console.error("Failed to toggle login", error)
    }
  }

  // Handle Manual Assignment Submit
  const handleAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!assignLeadId || !assignBdeId) {
      addNotification({
        title: "Select lead and BDE",
        description: "Choose an unassigned lead and the BDE who should own it.",
        type: "system",
      })
      return
    }

    const lead = unassignedLeads.find((l) => l.id === assignLeadId)
    const bde = bdes.find((b) => b.id === assignBdeId)
    assignLead(assignLeadId, assignBdeId, user?.id || "owner-1")
    addNotification({
      title: "Lead assigned",
      description: `${lead?.name || "Lead"} assigned to ${bde?.name || "BDE"}.`,
      type: "admissions",
    })
    setAssignLeadId("")
    setAssignBdeId("")
    setIsAssignOpen(false)
  }

  const handleAutoAssign = () => {
    if (unassignedLeads.length === 0) {
      addNotification({
        title: "No unassigned leads",
        description: "All leads are already assigned to a BDE.",
        type: "system",
      })
      return
    }
    if (activeBdes.length === 0) {
      addNotification({
        title: "No active BDEs",
        description: "Activate at least one BDE before distributing leads.",
        type: "system",
      })
      return
    }

    unassignedLeads.forEach((lead, index) => {
      const targetBde = activeBdes[index % activeBdes.length]
      assignLead(lead.id, targetBde.id, user?.id || "owner-1")
    })

    addNotification({
      title: "Leads distributed",
      description: `${unassignedLeads.length} lead${unassignedLeads.length === 1 ? "" : "s"} shared evenly across ${activeBdes.length} active BDE${activeBdes.length === 1 ? "" : "s"}.`,
      type: "admissions",
    })
    setIsAssignOpen(false)
  }

  const resetForm = () => {
    setFormData({
      name: "",
      employeeId: "",
      email: "",
      phone: "",
      password: "",
      gender: "female",
      dob: "1995-01-01",
      address: "",
      qualification: "",
      experience: "",
      joiningDate: new Date().toISOString().split("T")[0],
      weeklyOffDays: [0],
      monthlyTarget: 30,
      targetType: "leads",
      commissionEnabled: false,
      commissionPercentage: 2,
      commissionApplyFrom: "from_start",
      commissionThreshold: 75000,
      status: "active"
    })
    setSelectedBde(null)
  }

  const triggerEditBde = (bde: BDE) => {
    setSelectedBde(bde)
    setFormData({
      name: bde.name,
      employeeId: bde.employeeId,
      email: bde.email,
      phone: bde.phone,
      password: "",
      gender: bde.gender,
      dob: bde.dob,
      address: bde.address,
      qualification: bde.qualification,
      experience: bde.experience,
      joiningDate: bde.joiningDate,
      weeklyOffDays: bde.weeklyOffDays?.length ? bde.weeklyOffDays : [0],
      monthlyTarget: bde.monthlyTarget,
      targetType: bde.targetType || "leads",
      commissionEnabled: bde.commissionEnabled ?? (bde.commissionPercentage > 0),
      commissionPercentage: bde.commissionPercentage || 2,
      commissionApplyFrom: bde.commissionApplyFrom || "from_start",
      commissionThreshold: bde.commissionThreshold ?? bde.monthlyTarget,
      status: bde.status
    })
    setIsEditOpen(true)
  }

  // Filtered BDE list
  const filteredBdes = bdes.filter(bde => {
    const matchesSearch = bde.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          bde.employeeId.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          bde.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || bde.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const activeBdes = React.useMemo(() => bdes.filter((b) => b.status === "active"), [bdes])

  const loadShiftLogs = React.useCallback(async () => {
    if (!bdes.length) {
      setShiftLogs([])
      return
    }
    setAttendanceLoading(true)
    try {
      const fromApi = (
        await Promise.all(
          bdes.map(async (bde) => {
            try {
              const rows: Array<Record<string, unknown>> = await api.getAttendanceByEntity(bde.id, "bde")
              return (rows || []).map((r) => ({
                id: String(r.id || r._id || `${bde.id}-${r.date}`),
                bdeId: bde.id,
                date: String(r.date || "").substring(0, 10),
                loginTime: r.loginTime as string | undefined,
                logoutTime: r.logoutTime as string | undefined,
                shiftStatus: r.shiftStatus as ShiftStatus | undefined,
                workedSeconds: r.workedSeconds as number | undefined,
                name: (r.name as string) || bde.name,
                status: r.status as string | undefined,
              }))
            } catch {
              return []
            }
          })
        )
      ).flat()

      const fromStore: BdeShiftLog[] = bdeAttendance.map((a) => ({
        id: a.id,
        bdeId: a.bdeId,
        date: a.date.substring(0, 10),
        loginTime: a.loginTime,
        logoutTime: a.logoutTime,
        workedSeconds: a.totalHours ? Math.round(a.totalHours * 3600) : undefined,
        name: bdes.find((b) => b.id === a.bdeId)?.name,
        shiftStatus: a.logoutTime ? "finished" : "active",
        status: "present",
      }))

      const merged = [...fromApi]
      for (const row of fromStore) {
        if (!merged.some((m) => m.bdeId === row.bdeId && m.date === row.date)) {
          merged.push(row)
        }
      }
      setShiftLogs(merged)
    } catch (error) {
      console.error("Failed to load BDE shift logs:", error)
    } finally {
      setAttendanceLoading(false)
    }
  }, [bdes, bdeAttendance])

  React.useEffect(() => {
    if (activeTab === "incentives" || isAttendanceOpen) {
      loadShiftLogs()
    }
  }, [activeTab, isAttendanceOpen, loadShiftLogs])

  const renderCommissionFields = () => (
    <div className="rounded-lg border border-border/70 bg-muted/10 p-3.5 space-y-3">
      <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
        <input
          type="checkbox"
          name="commissionEnabled"
          checked={formData.commissionEnabled}
          onChange={handleFormChange}
          className="rounded border-border"
        />
        Enable Sales Commission (Optional)
      </label>

      {formData.commissionEnabled && (
        <>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Commission Rate (%)</label>
              <Input
                type="number"
                step="0.1"
                min="0"
                name="commissionPercentage"
                value={formData.commissionPercentage}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
                placeholder="e.g. 2 or 3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Commission Applies From</label>
              <Select
                name="commissionApplyFrom"
                value={formData.commissionApplyFrom}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="from_start">From first revenue (₹)</option>
                <option value="after_target">After monthly target achieved</option>
                <option value="after_threshold">After custom threshold (₹)</option>
              </Select>
            </div>
          </div>

          {formData.commissionApplyFrom === "after_threshold" && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Commission Threshold (₹)</label>
              <Input
                type="number"
                name="commissionThreshold"
                value={formData.commissionThreshold}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
                placeholder="75000"
              />
            </div>
          )}

          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Example: 2% after ₹75,000 means commission is calculated only on revenue above ₹75,000.
            Use <strong className="text-foreground">After monthly target</strong> to apply commission only once the BDE hits their ₹{formData.monthlyTarget.toLocaleString("en-IN")} target.
          </p>
        </>
      )}
    </div>
  )

  const renderWeeklyOffFields = () => (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-muted-foreground">Weekly Off / Holidays</label>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        Select which days are non-working for this BDE. The attendance calendar uses this from their joining date onward.
      </p>
      <div className="flex flex-wrap gap-2">
        {WEEK_OFF_LABELS.map((label, dayIndex) => (
          <label
            key={label}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold cursor-pointer transition-colors ${
              formData.weeklyOffDays.includes(dayIndex)
                ? "border-violet-500/40 bg-violet-500/10 text-violet-400"
                : "border-border bg-card text-muted-foreground hover:bg-muted/40"
            }`}
          >
            <input
              type="checkbox"
              className="sr-only"
              checked={formData.weeklyOffDays.includes(dayIndex)}
              onChange={() => toggleWeeklyOffDay(dayIndex)}
            />
            {label}
          </label>
        ))}
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Page Title & Add/Actions Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            <span>BDE Executive Management</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor calling conversions, assign pipelines, and manage permissions for sales representatives.
          </p>
          {policy && (
            <div className="mt-2">
              <CapacityLimitNotice resource="bdes" policy={policy} variant="compact" showWhenAvailable />
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              setAssignmentType(unassignedLeads.length > 0 ? "manual" : "auto")
              setIsAssignOpen(true)
            }}
          >
            Assign Leads{unassignedLeads.length > 0 ? ` (${unassignedLeads.length})` : ""}
          </Button>
          <Button variant="primary" size="sm" icon={UserPlus} disabled={bdeAtCapacity} onClick={() => { resetForm(); setIsAddOpen(true) }}>
            Add New BDE
          </Button>
        </div>
      </div>

      {bdeAtCapacity && policy && (
        <CapacityLimitNotice resource="bdes" policy={policy} />
      )}

      {/* Main Tab Controller */}
      <div className="flex border-b border-border bg-card p-1 rounded-xl">
        <button
          onClick={() => setActiveTab("directory")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
            activeTab === "directory" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          BDE Directory
        </button>
        <button
          onClick={() => setActiveTab("comparison")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
            activeTab === "comparison" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Performance Comparison
        </button>
        <button
          onClick={() => setActiveTab("incentives")}
          className={`flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-semibold rounded-lg cursor-pointer ${
            activeTab === "incentives" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Attendance Logs
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "directory" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="grid gap-3 sm:grid-cols-3 bg-card p-4 rounded-xl border border-border">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, Employee ID, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
              <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 text-xs">
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </Select>
            </div>
          </div>

          {/* Directory Grid/Table */}
          <Card className="bg-card">
            <CardContent className="p-0">
              <div className="overflow-visible">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                      <th className="p-4">BDE Profile</th>
                      <th className="p-4 text-center">Assigned Leads</th>
                      <th className="p-4 text-center">Conversion</th>
                      <th className="p-4 text-center">Month Target</th>
                      <th className="p-4 text-center">Weekly Off</th>
                      <th className="p-4 text-center">Revenue Generated</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredBdes.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-muted-foreground italic">
                          No registered Business Development Executives match criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredBdes.map((bde, index) => {
                        // calculate leads associated
                        const myLeads = getLeadsForBde(bde)
                        const myConverted = myLeads.filter(l => l.stage === "converted").length
                        const rate = myLeads.length > 0 ? Math.round((myConverted / myLeads.length) * 100) : 0
                        const revenue = myLeads.filter(l => l.stage === "converted").reduce((acc, curr) => acc + curr.value, 0)
                        const isLast = index === filteredBdes.length - 1
                        
                        return (
                          <tr key={bde.id} className="hover:bg-muted/40 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-primary shrink-0">
                                  {bde.name.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-bold text-foreground leading-tight">{bde.name}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-mono">
                                    <span>{bde.employeeId}</span>
                                    <span>•</span>
                                    <span>Joined {formatDate(bde.joiningDate)}</span>
                                  </div>
                                  <div className="flex items-center gap-2.5 mt-1 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-0.5"><Mail className="h-3 w-3 shrink-0" /> {bde.email}</span>
                                    <span className="text-border">•</span>
                                    <span className="flex items-center gap-0.5"><Phone className="h-3 w-3 shrink-0" /> {bde.phone}</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-semibold text-foreground">{myLeads.length}</td>
                            <td className="p-4 text-center">
                              <p className="font-bold text-foreground">{rate}%</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">{myConverted}</p>
                            </td>
                            <td className="p-4 text-center">
                              {bde.targetType === "revenue" ? (
                                <>
                                  <p className="font-medium text-foreground">{formatCurrency(revenue)} / {formatCurrency(bde.monthlyTarget)}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Revenue Target</p>
                                </>
                              ) : (
                                <>
                                  <p className="font-medium text-foreground">{myConverted} / {bde.monthlyTarget}</p>
                                  <p className="text-[10px] text-muted-foreground mt-0.5">Conversions</p>
                                </>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <p className="font-medium text-violet-400">{formatWeeklyOff(bde)}</p>
                              <p className="text-[10px] text-muted-foreground mt-0.5">From join date</p>
                            </td>
                            <td className="p-4 text-center font-semibold text-emerald-500">{formatCurrency(revenue)}</td>
                            <td className="p-4 text-center">
                              <Badge variant={bde.status === "active" ? "success" : "destructive"}>
                                {bde.status}
                              </Badge>
                            </td>
                            <td className="p-4 text-right">
                              <div className="relative flex justify-end">
                                <Button 
                                  variant="outline" 
                                  size="icon" 
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setOpenDropdownId(openDropdownId === bde.id ? null : bde.id)
                                  }}
                                  title="Actions"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                                
                                {openDropdownId === bde.id && (
                                  <>
                                    <div 
                                      className="fixed inset-0 z-40" 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setOpenDropdownId(null)
                                      }}
                                    />
                                    <div className={`absolute right-0 w-48 rounded-lg border border-border bg-card p-1 shadow-md z-50 text-left ${
                                      isLast ? "bottom-full mb-1" : "mt-8"
                                    }`}>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          setSelectedBde(bde)
                                          setIsPerfOpen(true)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary rounded-md cursor-pointer text-left font-medium"
                                      >
                                        <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>View Performance</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          setSelectedBde(bde)
                                          setIsAttendanceOpen(true)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary rounded-md cursor-pointer text-left font-medium"
                                      >
                                        <CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>View Attendance</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          triggerEditBde(bde)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary rounded-md cursor-pointer text-left font-medium"
                                      >
                                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Edit Profile</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          handleResetPassword(bde)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-foreground hover:bg-secondary rounded-md cursor-pointer text-left font-medium"
                                      >
                                        <Key className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Reset Password</span>
                                      </button>
                                      <div className="h-px bg-border my-1" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          handleToggleLogin(bde)
                                        }}
                                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md cursor-pointer text-left font-medium ${
                                          bde.status === "active" 
                                            ? "text-red-500 hover:bg-red-500/10" 
                                            : "text-emerald-500 hover:bg-emerald-500/10"
                                        }`}
                                      >
                                        <ShieldAlert className="h-3.5 w-3.5" />
                                        <span>{bde.status === "active" ? "Disable Access" : "Enable Access"}</span>
                                      </button>
                                      <div className="h-px bg-border my-1" />
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setOpenDropdownId(null)
                                          handleDeleteBde(bde)
                                        }}
                                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/10 rounded-md cursor-pointer text-left font-medium"
                                      >
                                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        <span>Remove Executive</span>
                                      </button>
                                    </div>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === "comparison" && (() => {
        // Compute top performer from real data
        const topBde = bdes.length > 0 ? bdes.reduce((best, bde) => {
          const converted = getLeadsForBde(bde).filter(l => l.stage === 'converted').length
          const bestConverted = getLeadsForBde(best).filter(l => l.stage === 'converted').length
          return converted > bestConverted ? bde : best
        }) : null
        const topConverted = topBde ? getLeadsForBde(topBde).filter(l => l.stage === 'converted').length : 0
        const topRevenue = topBde ? getLeadsForBde(topBde).filter(l => l.stage === 'converted').reduce((sum, l) => sum + (l.value || 0), 0) : 0
        const topTarget = topBde?.monthlyTarget || 1
        const topPct = topBde?.targetType === 'revenue' 
          ? Math.min(100, Math.round((topRevenue / topTarget) * 100))
          : Math.min(100, Math.round((topConverted / topTarget) * 100))
        const topInitials = topBde ? topBde.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : '--'

        // Revenue: sum value of all converted leads
        const totalRevenue = leads.filter(l => l.stage === 'converted').reduce((sum, l) => sum + (l.value || 0), 0)

        // Active pipelines: leads assigned to a BDE that aren't converted/lost
        const activePipelines = leads.filter(l => !leadIsUnassigned(l, bdes) && l.stage !== 'converted' && l.stage !== 'lost').length

        return (
        <div className="space-y-6 animate-scale-in">
          {/* Comparison Cards & Charts */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-500" />
                  <span>Top Performing Executive</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topBde ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-500">
                        {topInitials}
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground">{topBde.name}</h3>
                        <p className="text-[10px] text-muted-foreground">{topBde.employeeId} • {topConverted} Conversions</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-muted-foreground">
                        <span>Target Completed</span>
                        <span>{topPct}% achieved</span>
                      </div>
                      <div className="w-full bg-muted h-1.5 rounded-full overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full transition-all duration-700" style={{ width: `${topPct}%` }} />
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">No BDE data available yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <BarChart3 className="h-4 w-4 text-emerald-500" />
                  <span>Revenue Contribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="text-3xl font-extrabold text-foreground">{formatCurrency(totalRevenue)}</h3>
                <p className="text-[11px] text-muted-foreground">
                  Total revenue generated by sales executives this month.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Active Pipelines</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <h3 className="text-3xl font-extrabold text-foreground">{activePipelines} Leads</h3>
                <p className="text-[11px] text-muted-foreground">
                  Leads currently actively engaged by BDE team.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Performance chart list */}
          <Card className="bg-card">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="text-sm font-bold">Executive Conversion Rates Compared</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {bdes.map((bde) => {
                const myLeads = getLeadsForBde(bde)
                const myConverted = myLeads.filter(l => l.stage === "converted").length
                const rate = myLeads.length > 0 ? Math.round((myConverted / myLeads.length) * 100) : 0
                return (
                  <div key={bde.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground">{bde.name} ({bde.employeeId})</span>
                      <span className="font-bold text-foreground">{rate}% Conversion ({myConverted} Converted)</span>
                    </div>
                    <div className="w-full bg-muted h-3.5 rounded-lg overflow-hidden relative">
                      <div className="bg-primary h-full rounded-lg" style={{ width: `${rate}%` }} />
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
        )
      })()}

      {activeTab === "incentives" && (
        <div className="space-y-4 animate-scale-in">
          <BdeAttendanceCalendar
            records={shiftLogs}
            bdes={bdes}
            filterBdeId={attendanceBdeFilter}
            onFilterBdeIdChange={setAttendanceBdeFilter}
            onRefresh={loadShiftLogs}
            loading={attendanceLoading}
          />
        </div>
      )}

      {/* Add BDE Dialog Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Onboard New Business Development Executive"
        description="Fill in credentials and personal particulars below."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          {bdeAtCapacity && policy && (
            <CapacityLimitNotice resource="bdes" policy={policy} variant="inline" />
          )}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
              <Input
                name="name"
                placeholder="Emma Watson"
                value={formData.name}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Employee ID</label>
              <Input
                name="employeeId"
                value="Auto Generated"
                disabled
                className="bg-card text-xs h-9.5 opacity-60 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
              <Input
                type="email"
                name="email"
                placeholder="emma@apex.edu"
                value={formData.email}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
              <Input
                name="phone"
                placeholder="+1 555-0188"
                value={formData.phone}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Password *</label>
              <Input
                type="password"
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Gender</label>
              <Select
                name="gender"
                value={formData.gender}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Date of Birth</label>
              <Input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Joining Date</label>
              <Input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          {renderWeeklyOffFields()}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Residential Address</label>
            <Input
              name="address"
              placeholder="742 Evergreen Terrace, Springfield"
              value={formData.address}
              onChange={handleFormChange}
              className="bg-card text-xs h-9.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Qualification</label>
              <Input
                name="qualification"
                placeholder="MBA Sales"
                value={formData.qualification}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Experience Details</label>
              <Input
                name="experience"
                placeholder="3 years at TechCorp"
                value={formData.experience}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Monthly Target Type</label>
              <Select
                name="targetType"
                value={formData.targetType}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="leads">Leads Converted</option>
                <option value="revenue">Revenue Target (₹)</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                {formData.targetType === "revenue" ? "Monthly Target (₹) *" : "Monthly Target (Leads) *"}
              </label>
              <Input
                type="number"
                name="monthlyTarget"
                value={formData.monthlyTarget}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
                required
              />
            </div>
          </div>

          {renderCommissionFields()}

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={bdeAtCapacity}>
              Save BDE
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Edit BDE Dialog Modal */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit BDE Particulars"
        description="Update representative record metadata details."
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Full Name *</label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Employee ID *</label>
              <Input
                name="employeeId"
                value={formData.employeeId}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email Address *</label>
              <Input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
              <Input
                name="phone"
                value={formData.phone}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Gender</label>
              <Select
                name="gender"
                value={formData.gender}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <Select
                name="status"
                value={formData.status}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Joining Date</label>
              <Input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Date of Birth</label>
              <Input
                type="date"
                name="dob"
                value={formData.dob}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          {renderWeeklyOffFields()}

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Monthly Target Type</label>
              <Select
                name="targetType"
                value={formData.targetType}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
              >
                <option value="leads">Leads Converted</option>
                <option value="revenue">Revenue Target (₹)</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                {formData.targetType === "revenue" ? "Monthly Target (₹) *" : "Monthly Target (Leads) *"}
              </label>
              <Input
                type="number"
                name="monthlyTarget"
                value={formData.monthlyTarget}
                onChange={handleFormChange}
                className="bg-card text-xs h-9.5"
                required
              />
            </div>
          </div>

          {renderCommissionFields()}

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Confirm Changes
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Assign Leads Dialog */}
      <Dialog
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Assign Leads"
        description="Give unassigned leads to a BDE — one at a time or distribute evenly across your team."
      >
        <div className="space-y-4 pt-2">
          <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Unassigned leads</p>
              <p className="text-2xl font-extrabold text-foreground">{unassignedLeads.length}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide">Active BDEs</p>
              <p className="text-2xl font-extrabold text-foreground">{activeBdes.length}</p>
            </div>
          </div>

          {unassignedLeads.length === 0 ? (
            <div className="rounded-xl border border-border/60 bg-card p-6 text-center text-xs text-muted-foreground">
              All leads are already assigned. New unassigned leads will appear here.
            </div>
          ) : (
            <>
              <div className="flex border border-border p-0.5 rounded-lg bg-muted/20">
                <button
                  type="button"
                  onClick={() => setAssignmentType("manual")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                    assignmentType === "manual" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Assign one lead
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType("auto")}
                  className={`flex-1 py-2 text-xs font-semibold rounded-md cursor-pointer ${
                    assignmentType === "auto" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Distribute all
                </button>
              </div>

              {assignmentType === "manual" ? (
                <form onSubmit={handleAssignSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Lead</label>
                    <Select value={assignLeadId} onChange={(e) => setAssignLeadId(e.target.value)} className="h-9.5 text-xs bg-card">
                      <option value="">Select a lead…</option>
                      {unassignedLeads.map((l) => (
                        <option key={l.id} value={l.id}>{l.name} · {l.course}{l.city ? ` · ${l.city}` : ""}</option>
                      ))}
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Assign to BDE</label>
                    <Select value={assignBdeId} onChange={(e) => setAssignBdeId(e.target.value)} className="h-9.5 text-xs bg-card">
                      <option value="">Select a BDE…</option>
                      {activeBdes.map((b) => (
                        <option key={b.id} value={b.id}>{b.name} ({getLeadsForBde(b).length} leads)</option>
                      ))}
                    </Select>
                  </div>

                  {unassignedLeads.length > 0 && (
                    <div className="rounded-lg border border-border/50 divide-y divide-border/40 max-h-32 overflow-y-auto">
                      {unassignedLeads.slice(0, 6).map((lead) => (
                        <button
                          key={lead.id}
                          type="button"
                          onClick={() => setAssignLeadId(lead.id)}
                          className={`w-full px-3 py-2 text-left text-xs hover:bg-muted/40 cursor-pointer ${
                            assignLeadId === lead.id ? "bg-primary/5 text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          <span className="font-semibold text-foreground">{lead.name}</span>
                          <span className="text-muted-foreground"> · {lead.course}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="primary" size="sm">
                      Assign lead
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground leading-relaxed">
                    Split <strong className="text-foreground">{unassignedLeads.length}</strong> unassigned lead{unassignedLeads.length === 1 ? "" : "s"} evenly across{" "}
                    <strong className="text-foreground">{activeBdes.length}</strong> active BDE{activeBdes.length === 1 ? "" : "s"}.
                  </div>
                  <div className="pt-3 border-t border-border flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsAssignOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="button" variant="primary" size="sm" onClick={handleAutoAssign}>
                      Distribute {unassignedLeads.length} lead{unassignedLeads.length === 1 ? "" : "s"}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Dialog>

      {/* View Performance Dialog Panel */}
      <Dialog
        isOpen={isPerfOpen}
        onClose={() => setIsPerfOpen(false)}
        title={selectedBde ? `${selectedBde.name} Performance Details` : "BDE Performance Details"}
        description="Detailed leads pipeline tracking and metrics breakdown."
      >
        {selectedBde && (() => {
          const selectedBdeLeads = getLeadsForBde(selectedBde)
          return (
          <div className="space-y-4 pt-2 text-xs">
            {/* KPI metrics */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Leads</span>
                <span className="text-base font-extrabold text-foreground">
                  {selectedBdeLeads.length}
                </span>
              </div>
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Converted</span>
                <span className="text-base font-extrabold text-emerald-500">
                  {selectedBdeLeads.filter(l => l.stage === "converted").length}
                </span>
              </div>
              <div className="p-3 bg-muted/40 border border-border/60 rounded-xl">
                <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Active pipeline</span>
                <span className="text-base font-extrabold text-sky-500">
                  {selectedBdeLeads.filter(l => l.stage !== "converted" && l.stage !== "lost").length}
                </span>
              </div>
            </div>

            {/* General bio details */}
            <div className="border-t border-border pt-3 space-y-2">
              <h4 className="font-bold text-foreground">Staff Profile details</h4>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <p>Gender: <span className="text-foreground capitalize font-medium">{selectedBde.gender}</span></p>
                <p>D.O.B: <span className="text-foreground font-medium">{formatDate(selectedBde.dob)}</span></p>
                <p>Quals: <span className="text-foreground font-medium">{selectedBde.qualification}</span></p>
                <p>Experience: <span className="text-foreground font-medium">{selectedBde.experience}</span></p>
              </div>
              <p className="text-muted-foreground">Address: <span className="text-foreground font-medium">{selectedBde.address}</span></p>
            </div>
            
            <div className="pt-3 border-t border-border flex justify-end">
              <Button size="sm" onClick={() => setIsPerfOpen(false)}>Close Panel</Button>
            </div>
          </div>
          )
        })()}
      </Dialog>

      {/* View Attendance Dialog Panel */}
      <Dialog
        isOpen={isAttendanceOpen}
        onClose={() => setIsAttendanceOpen(false)}
        title={selectedBde ? `${selectedBde.name} — Attendance` : "Attendance Logs"}
        description="Monthly shift calendar with login, logout, and hours worked."
      >
        {selectedBde && (
          <div className="pt-2 max-h-[75vh] overflow-y-auto">
            <BdeAttendanceCalendar
              records={shiftLogs.filter((r) => r.bdeId === selectedBde.id)}
              bdes={[selectedBde]}
              filterBdeId={selectedBde.id}
              showBdeFilter={false}
              onRefresh={loadShiftLogs}
              loading={attendanceLoading}
            />
            <div className="pt-4 flex justify-end border-t border-border/40 mt-4">
              <Button size="sm" onClick={() => setIsAttendanceOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
