"use client"

import * as React from "react"
import { CalendarCheck, Clock, FilePen, Timer } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { KPICard } from "@/components/dashboard/KPICard"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { computeWorkedSeconds, formatDuration } from "@/lib/shiftTimer"
import {
  type AttendanceCorrection,
  type EmployeeShift,
  WORK_MODE_LABELS,
  formatDay,
  localDateStr,
  statusBadgeVariant,
} from "@/lib/employeePortal"

const emptyCorrection = { date: "", requestedLoginTime: "", requestedLogoutTime: "", reason: "" }

export default function EmployeeAttendancePage() {
  const [month, setMonth] = React.useState(() => localDateStr().slice(0, 7))
  const [records, setRecords] = React.useState<EmployeeShift[]>([])
  const [corrections, setCorrections] = React.useState<AttendanceCorrection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState(emptyCorrection)

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getEmployeeAttendance(month)
      setRecords(data?.records || [])
      setCorrections(data?.corrections || [])
    } catch (err) {
      console.error(err)
      setRecords([])
      setCorrections([])
    } finally {
      setLoading(false)
    }
  }, [month])

  React.useEffect(() => {
    void load()
  }, [load])

  const openCorrection = (date = localDateStr()) => {
    setForm({ ...emptyCorrection, date })
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.requestEmployeeAttendanceCorrection({
        date: form.date,
        requestedLoginTime: form.requestedLoginTime || undefined,
        requestedLogoutTime: form.requestedLogoutTime || undefined,
        reason: form.reason,
      })
      setOpen(false)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to submit correction")
    } finally {
      setSaving(false)
    }
  }

  const totalSeconds = records.reduce((sum, r) => sum + computeWorkedSeconds(r), 0)
  const daysPresent = records.filter((r) => r.loginAt || r.loginTime).length
  const avgSeconds = daysPresent ? Math.round(totalSeconds / daysPresent) : 0
  const pendingCorrections = corrections.filter((c) => c.status === "Pending").length

  return (
    <div className="space-y-6">
      <EmployeePageHeader
        title="Attendance"
        description="Your clock-in history and correction requests"
        actions={
          <>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 w-40 text-xs" />
            <Button size="sm" icon={FilePen} onClick={() => openCorrection()}>
              Request correction
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Days present" value={daysPresent} subtext="This month" icon={CalendarCheck} />
        <KPICard title="Total hours" value={formatDuration(totalSeconds).slice(0, 5)} subtext="HH:MM worked" icon={Clock} />
        <KPICard title="Daily average" value={formatDuration(avgSeconds).slice(0, 5)} subtext="HH:MM per day" icon={Timer} />
        <KPICard title="Corrections" value={pendingCorrections} subtext="Awaiting approval" icon={FilePen} />
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Attendance log</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : records.length === 0 ? (
            <EmptyState>No attendance records for this month.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Date</th>
                    <th className="py-2 pr-3 font-semibold">Clock in</th>
                    <th className="py-2 pr-3 font-semibold">Clock out</th>
                    <th className="py-2 pr-3 font-semibold">Worked</th>
                    <th className="py-2 pr-3 font-semibold">Mode</th>
                    <th className="py-2 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{formatDay(r.date)}</td>
                      <td className="py-2.5 pr-3">{r.loginTime || "—"}</td>
                      <td className="py-2.5 pr-3">
                        {r.logoutTime || (r.shiftStatus === "active" ? <Badge variant="success">Working</Badge> : "—")}
                      </td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums">{formatDuration(computeWorkedSeconds(r))}</td>
                      <td className="py-2.5 pr-3">{r.workMode ? WORK_MODE_LABELS[r.workMode] : "—"}</td>
                      <td className="py-2.5 text-right">
                        <button
                          onClick={() => openCorrection(r.date)}
                          className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                        >
                          Correct
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Correction requests</CardTitle>
          <CardDescription className="text-xs">Missed a clock-in or clock-out? Request a fix and HR will review it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {corrections.length === 0 ? (
            <EmptyState>No correction requests yet.</EmptyState>
          ) : (
            corrections.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">{formatDay(c.date)}</p>
                  <p className="text-muted-foreground">
                    {c.requestedLoginTime ? `In ${c.requestedLoginTime}` : ""}
                    {c.requestedLoginTime && c.requestedLogoutTime ? " · " : ""}
                    {c.requestedLogoutTime ? `Out ${c.requestedLogoutTime}` : ""}
                    {" — "}
                    {c.reason}
                  </p>
                </div>
                <Badge variant={statusBadgeVariant(c.status)}>{c.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Request attendance correction">
        <form onSubmit={submit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Date</label>
            <Input
              type="date"
              required
              max={localDateStr()}
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Correct clock-in</label>
              <Input
                type="time"
                value={form.requestedLoginTime}
                onChange={(e) => setForm({ ...form, requestedLoginTime: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Correct clock-out</label>
              <Input
                type="time"
                value={form.requestedLogoutTime}
                onChange={(e) => setForm({ ...form, requestedLogoutTime: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Reason</label>
            <Input
              required
              placeholder="e.g. Forgot to clock out"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Submit request
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
