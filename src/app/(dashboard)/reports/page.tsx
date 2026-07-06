"use client"

import * as React from "react"
import {
  FileText, Download, Calendar, RefreshCw, Clock, Loader2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"

type CallLogRow = {
  id: string
  candidate: string
  bdeName?: string
  date: string
  time: string
  duration: string
  status: string
  notes: string
}

type CallSummaryMetrics = {
  totalDials: number
  avgDurationLabel: string
  interestedCandidates: number
  connectionRate: number
}

function formatMonthLabel(month: string) {
  const [year, mon] = month.split("-")
  const date = new Date(Number(year), Number(mon) - 1, 1)
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

function badgeVariant(status: string): "success" | "warning" | "destructive" | "default" {
  if (status === "Connected") return "success"
  if (status === "Line Busy" || status === "Switched Off") return "warning"
  if (status === "No Answer") return "destructive"
  return "default"
}

export default function ReportsPage() {
  const { user } = useStore()
  const isOwner = user?.role === "owner" || user?.role === "super_admin"

  const [selectedMonth, setSelectedMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [metrics, setMetrics] = React.useState<CallSummaryMetrics>({
    totalDials: 0,
    avgDurationLabel: "0m 00s",
    interestedCandidates: 0,
    connectionRate: 0,
  })
  const [callLogs, setCallLogs] = React.useState<CallLogRow[]>([])

  const loadReport = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await api.getCallSummary(selectedMonth)
      setMetrics(data.metrics)
      setCallLogs(data.logs || [])
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load call summary"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [selectedMonth])

  React.useEffect(() => {
    loadReport()
  }, [loadReport])

  const handleDownload = () => {
    if (callLogs.length === 0) {
      alert("No call logs to export for this month.")
      return
    }

    const headers = ["Candidate", "BDE", "Date", "Call Time", "Talk Time", "Outcome", "Notes"]
    const rows = callLogs.map((log) => [
      log.candidate,
      log.bdeName || "",
      log.date,
      log.time,
      log.duration,
      log.status,
      `"${(log.notes || "").replace(/"/g, '""')}"`,
    ])

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `call-summary-${selectedMonth}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            <span>Call Summary Reports</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit daily calling connection rates, cumulative call logs, and download Excel/PDF sheets for targets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground outline-none"
            />
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={loadReport} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" size="sm" icon={Download} onClick={handleDownload} disabled={loading}>
            Download Report
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground -mt-2">
        Showing data for <span className="font-semibold text-foreground">{formatMonthLabel(selectedMonth)}</span>
        {isOwner ? " · All BDE call logs for your tenant" : " · Your call activity only"}
      </p>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Total Dials</span>
            <h3 className="text-2xl font-extrabold text-foreground">
              {loading ? "—" : metrics.totalDials}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">For {formatMonthLabel(selectedMonth)}</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Average Duration</span>
            <h3 className="text-2xl font-extrabold text-foreground">
              {loading ? "—" : metrics.avgDurationLabel}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Average connection talk time</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Interested Candidates</span>
            <h3 className="text-2xl font-extrabold text-foreground">
              {loading ? "—" : metrics.interestedCandidates}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Active prospective students</p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground block">Dials Connection Rate</span>
            <h3 className="text-2xl font-extrabold text-foreground">
              {loading ? "—" : `${metrics.connectionRate}%`}
            </h3>
            <p className="text-[10px] text-muted-foreground mt-1">Percentage of answered calls</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Clock className="h-4.5 w-4.5 text-primary" />
            <span>Daily Call Logs Audit Registry</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading call logs…
            </div>
          ) : callLogs.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              No call logs recorded for {formatMonthLabel(selectedMonth)}.
              {isOwner
                ? " BDE staff call outcomes will appear here once logged from Follow-ups."
                : " Log call outcomes from the Follow-ups page to build your registry."}
            </div>
          ) : (
            <div className="overflow-x-auto text-xs text-left">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border uppercase font-semibold text-muted-foreground">
                    <th className="p-4">Candidate Profile</th>
                    {isOwner && <th className="p-4">BDE</th>}
                    <th className="p-4 text-center">Date</th>
                    <th className="p-4 text-center">Call Time</th>
                    <th className="p-4 text-center">Talk Time</th>
                    <th className="p-4 text-center">Call Outcome</th>
                    <th className="p-4">Outcome Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {callLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-bold text-foreground">{log.candidate}</td>
                      {isOwner && (
                        <td className="p-4 text-muted-foreground">{log.bdeName || "—"}</td>
                      )}
                      <td className="p-4 text-center text-muted-foreground">{log.date}</td>
                      <td className="p-4 text-center text-muted-foreground">{log.time}</td>
                      <td className="p-4 text-center font-medium text-foreground">{log.duration}</td>
                      <td className="p-4 text-center">
                        <Badge variant={badgeVariant(log.status)} className="text-[9px] uppercase font-bold">
                          {log.status}
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground leading-normal">{log.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
