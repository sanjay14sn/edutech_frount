"use client"

import * as React from "react"
import {
  RefreshCw,
  Save,
  UserCheck,
  Clock,
  UserX,
  Users,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ArrowLeft,
} from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { formatDisplayDate } from "@/components/ui/DatePicker"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"

type Status = "present" | "absent" | "late"

type Staff = { entityId: string; name: string }

type Row = Staff & { status: Status }

type DaySummary = {
  present: number
  late: number
  absent: number
  marked: number
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function toIso(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

function todayIso() {
  const n = new Date()
  return toIso(n.getFullYear(), n.getMonth() + 1, n.getDate())
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function dayTone(summary?: DaySummary, isFuture?: boolean) {
  if (isFuture) return "bg-muted/20 text-muted-foreground/50 border-transparent"
  if (!summary || summary.marked === 0) {
    return "bg-card hover:bg-muted/40 border-border/50 text-foreground"
  }
  if (summary.absent > 0 && summary.present === 0 && summary.late === 0) {
    return "bg-rose-500/10 hover:bg-rose-500/15 border-rose-500/25 text-rose-700 dark:text-rose-400"
  }
  if (summary.late > 0 && summary.absent === 0) {
    return "bg-amber-500/10 hover:bg-amber-500/15 border-amber-500/25 text-amber-700 dark:text-amber-400"
  }
  if (summary.absent > 0 || summary.late > 0) {
    return "bg-orange-500/10 hover:bg-orange-500/15 border-orange-500/25 text-orange-700 dark:text-orange-400"
  }
  return "bg-emerald-500/10 hover:bg-emerald-500/15 border-emerald-500/25 text-emerald-700 dark:text-emerald-400"
}

export default function HRAttendancePage() {
  const { addNotification } = useStore()
  const now = new Date()
  const [year, setYear] = React.useState(now.getFullYear())
  const [month, setMonth] = React.useState(now.getMonth() + 1) // 1-12
  const [selectedDate, setSelectedDate] = React.useState(todayIso)
  const [staffType, setStaffType] = React.useState<"trainer" | "bde">("trainer")
  const [staff, setStaff] = React.useState<Staff[]>([])
  const [monthRecords, setMonthRecords] = React.useState<any[]>([])
  const [rows, setRows] = React.useState<Row[]>([])
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  const monthKey = `${year}-${String(month).padStart(2, "0")}`
  const totalDays = new Date(year, month, 0).getDate()
  const emptyDays = new Date(year, month - 1, 1).getDay()
  const today = todayIso()

  const summaries = React.useMemo(() => {
    const map = new Map<string, DaySummary>()
    for (const rec of monthRecords) {
      const d = String(rec.date || "").slice(0, 10)
      if (!d.startsWith(monthKey)) continue
      const cur = map.get(d) || { present: 0, late: 0, absent: 0, marked: 0 }
      cur.marked += 1
      if (rec.status === "present") cur.present += 1
      else if (rec.status === "late") cur.late += 1
      else if (rec.status === "absent") cur.absent += 1
      map.set(d, cur)
    }
    return map
  }, [monthRecords, monthKey])

  const loadMonth = React.useCallback(async () => {
    try {
      setLoading(true)
      const employees = await api.getHREmployees()
      const active = (employees || []).filter(
        (e: any) => e.status === "active" && e.sourceType === staffType
      )
      setStaff(
        active.map((e: any) => ({
          entityId: e.sourceId,
          name: e.name,
        }))
      )

      // EOD: past days without present/late/punch → auto-mark absent
      try {
        await api.finalizeAttendanceMonth(monthKey, staffType)
      } catch (err) {
        console.warn("Attendance finalize skipped", err)
      }

      let records: any[] = []
      try {
        records = (await api.getAttendanceMonth(monthKey, staffType)) || []
      } catch {
        records = []
      }
      setMonthRecords(records)
      setDirty(false)
    } catch (err) {
      console.error(err)
      setStaff([])
      setMonthRecords([])
    } finally {
      setLoading(false)
    }
  }, [monthKey, staffType])

  React.useEffect(() => {
    void loadMonth()
  }, [loadMonth])

  // Build editable rows for the selected day from staff + month records
  React.useEffect(() => {
    const byId = new Map(
      monthRecords
        .filter((r) => String(r.date || "").slice(0, 10) === selectedDate)
        .map((r) => [String(r.entityId), r])
    )
    const isPast = selectedDate < todayIso()
    setRows(
      staff.map((s) => {
        const existing = byId.get(s.entityId)
        const punched =
          Boolean(existing?.loginTime) ||
          existing?.shiftStatus === "active" ||
          existing?.shiftStatus === "paused" ||
          existing?.shiftStatus === "finished"
        let status: Status = "present"
        if (existing?.status === "present" || existing?.status === "late" || existing?.status === "absent") {
          status = existing.status as Status
        } else if (punched) {
          status = "present"
        } else if (isPast) {
          status = "absent" // EOD default
        }
        return { ...s, status }
      })
    )
    setDirty(false)
  }, [staff, monthRecords, selectedDate])

  const shiftMonth = (delta: number) => {
    const d = new Date(year, month - 1 + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth() + 1)
    const nextKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    if (!selectedDate.startsWith(nextKey)) {
      const day = Math.min(Number(selectedDate.slice(8, 10)) || 1, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())
      setSelectedDate(toIso(d.getFullYear(), d.getMonth() + 1, day))
    }
  }

  const setStatus = (entityId: string, status: Status) => {
    setRows((prev) => prev.map((r) => (r.entityId === entityId ? { ...r, status } : r)))
    setDirty(true)
  }

  const markAll = (status: Status) => {
    setRows((prev) => prev.map((r) => ({ ...r, status })))
    setDirty(true)
  }

  const save = async () => {
    try {
      setSaving(true)
      await api.saveAttendance(
        selectedDate,
        staffType,
        rows.map((r) => ({
          entityId: r.entityId,
          name: r.name,
          type: staffType,
          status: r.status,
          date: selectedDate,
        }))
      )
      // Refresh month cache for this day
      setMonthRecords((prev) => {
        const others = prev.filter((r) => String(r.date || "").slice(0, 10) !== selectedDate)
        return [
          ...others,
          ...rows.map((r) => ({
            entityId: r.entityId,
            name: r.name,
            type: staffType,
            status: r.status,
            date: selectedDate,
          })),
        ]
      })
      setDirty(false)
      addNotification({
        title: "Attendance saved",
        description: `${formatDisplayDate(selectedDate)} · ${staffType === "trainer" ? "Trainers" : "BDEs"}`,
        type: "system",
      })
    } catch (err: any) {
      alert(err.message || "Failed to save attendance")
    } finally {
      setSaving(false)
    }
  }

  const selectedSummary = summaries.get(selectedDate)
  const present = rows.filter((r) => r.status === "present").length
  const late = rows.filter((r) => r.status === "late").length
  const absent = rows.filter((r) => r.status === "absent").length

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1">
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-foreground">Attendance</h2>
            {dirty && (
              <Badge variant="warning" className="text-[10px] px-2 py-0">
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Calendar ledger · past days without present / punch auto-mark absent at EOD
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
            {(["trainer", "bde"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setStaffType(type)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                  staffType === type
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {type === "trainer" ? "Trainers" : "BDEs"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadMonth} disabled={loading}>
            Reload
          </Button>
          <Button size="sm" icon={Save} onClick={save} disabled={saving || rows.length === 0}>
            {saving ? "Saving…" : "Save day"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Calendar */}
        <Card className="bg-card lg:col-span-3 overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {MONTHS[month - 1]} {year}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] px-2"
                  onClick={() => {
                    const n = new Date()
                    setYear(n.getFullYear())
                    setMonth(n.getMonth() + 1)
                    setSelectedDate(todayIso())
                  }}
                >
                  Today
                </Button>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <CardDescription>
              Green = present · Amber = late · Rose = absent (incl. EOD auto) · Empty = today not marked
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase text-muted-foreground mb-2">
              {WEEKDAYS.map((w) => (
                <div key={w} className="py-1">
                  {w}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: emptyDays }).map((_, i) => (
                <div key={`e-${i}`} className="aspect-square" />
              ))}
              {Array.from({ length: totalDays }).map((_, idx) => {
                const day = idx + 1
                const iso = toIso(year, month, day)
                const summary = summaries.get(iso)
                const isSelected = selectedDate === iso
                const isToday = today === iso
                const isFuture = iso > today
                return (
                  <button
                    key={iso}
                    type="button"
                    disabled={isFuture}
                    onClick={() => setSelectedDate(iso)}
                    className={cn(
                      "aspect-square rounded-xl border p-1.5 flex flex-col items-start justify-between text-left transition-all",
                      dayTone(summary, isFuture),
                      isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                      isToday && !isSelected && "border-primary/50"
                    )}
                  >
                    <span className="text-[11px] font-bold tabular-nums">{day}</span>
                    {summary && summary.marked > 0 ? (
                      <div className="flex gap-0.5 self-end">
                        {summary.present > 0 && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                        {summary.late > 0 && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        {summary.absent > 0 && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />}
                      </div>
                    ) : (
                      <span className="text-[9px] text-muted-foreground/60 self-end">—</span>
                    )}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Day detail */}
        <Card className="bg-card lg:col-span-2 overflow-hidden flex flex-col">
          <CardHeader className="pb-3 border-b border-border/50">
            <CardTitle className="text-sm font-extrabold">{formatDisplayDate(selectedDate)}</CardTitle>
            <CardDescription>
              {staffType === "trainer" ? "Trainers" : "BDEs"} · {staff.length} active
              {selectedSummary
                ? ` · ${selectedSummary.marked} marked`
                : " · not marked yet"}
            </CardDescription>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <UserCheck className="h-3 w-3" /> {present}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                <Clock className="h-3 w-3" /> {late}
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/10 px-2 py-1 text-[11px] font-semibold text-rose-700 dark:text-rose-400">
                <UserX className="h-3 w-3" /> {absent}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="flex gap-1.5 px-3 py-2 border-b border-border/40">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] flex-1"
                onClick={() => markAll("present")}
                disabled={!rows.length}
              >
                All present
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-[10px] flex-1"
                onClick={() => markAll("absent")}
                disabled={!rows.length}
              >
                All absent
              </Button>
            </div>

            {loading ? (
              <p className="p-8 text-center text-xs text-muted-foreground">Loading…</p>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-12 text-center">
                <Users className="h-5 w-5 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">No active {staffType}s</p>
              </div>
            ) : (
              <ul className="divide-y divide-border/40 max-h-[28rem] overflow-y-auto">
                {rows.map((row) => (
                  <li
                    key={row.entityId}
                    className="flex flex-col gap-2 px-3 py-3 hover:bg-muted/20 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                          row.status === "present" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
                          row.status === "late" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          row.status === "absent" && "bg-rose-500/15 text-rose-700 dark:text-rose-400"
                        )}
                      >
                        {initials(row.name) || "?"}
                      </div>
                      <p className="text-xs font-semibold text-foreground break-words leading-snug">
                        {row.name}
                      </p>
                    </div>
                    <div className="w-full sm:w-[7.5rem] shrink-0">
                      <Select
                        value={row.status}
                        onChange={(e) => setStatus(row.entityId, e.target.value as Status)}
                        className="h-8 text-xs"
                      >
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                      </Select>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
