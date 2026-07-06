"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarCheck, History, ArrowLeft, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { formatDuration, shiftStatusLabel, type ShiftStatus } from "@/lib/shiftTimer"

interface ShiftLogRow {
  entityId: string
  name: string
  status: string
  date?: string
  loginTime?: string
  logoutTime?: string
  shiftStatus?: ShiftStatus
  workedSeconds?: number
}

function statusBadgeClass(status: ShiftStatus | undefined) {
  switch (status) {
    case "active":
      return "border-emerald-500/30 text-emerald-600"
    case "paused":
      return "border-amber-500/30 text-amber-600"
    case "finished":
      return "border-sky-500/30 text-sky-600"
    default:
      return ""
  }
}

export default function BdeShiftLogsPage() {
  const router = useRouter()
  const { user, addNotification } = useStore()
  const role = user?.role

  const [logs, setLogs] = React.useState<ShiftLogRow[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (role !== "bde") return

    const loadLogs = async () => {
      setLoading(true)
      try {
        const data: any[] = await api.getMyBdeShiftLogs()
        setLogs(
          (data || []).map((r) => ({
            entityId: r.entityId,
            name: r.name,
            status: r.status,
            date: r.date,
            loginTime: r.loginTime,
            logoutTime: r.logoutTime,
            shiftStatus: r.shiftStatus,
            workedSeconds: r.workedSeconds,
          }))
        )
      } catch (err) {
        console.error("Failed to load BDE shift logs:", err)
        addNotification({
          title: "Could not load logs",
          description: "Unable to fetch your shift history. Please try again.",
          type: "system",
        })
      } finally {
        setLoading(false)
      }
    }

    loadLogs()
  }, [role, addNotification])

  const stats = React.useMemo(() => {
    const punched = logs.filter((l) => l.loginTime)
    const totalSeconds = punched.reduce((sum, l) => sum + (l.workedSeconds ?? 0), 0)
    const finished = punched.filter((l) => l.shiftStatus === "finished" || l.logoutTime).length
    return {
      totalDays: punched.length,
      finishedShifts: finished,
      totalWorked: totalSeconds,
    }
  }, [logs])

  if (role !== "bde") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl space-y-4 max-w-md mx-auto text-center mt-20 animate-scale-in">
        <History className="h-12 w-12 text-destructive" />
        <div>
          <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Shift log history is only available for BDE accounts.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.back()} className="mt-2 text-xs">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Link
            href="/attendance"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to daily shift log
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <span>All Shift Logs</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
              Complete history of your shift punches — login, pause, and logout times synced from your dashboard.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3 w-fit">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
            {(user?.name || "B")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <p className="text-xs font-bold text-foreground">{user?.name}</p>
            <p className="text-[10px] text-muted-foreground">{user?.email}</p>
            <Badge variant="outline" className="text-[9px] uppercase mt-1 h-5 px-1.5">
              BDE
            </Badge>
          </div>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-extrabold">Summary</CardTitle>
          <CardDescription className="text-xs">
            Overview of your recorded shift activity across all dates.
          </CardDescription>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-3">
            <div className="bg-secondary/20 p-2 rounded-lg border border-border/30 text-center">
              <span className="text-[9px] uppercase font-bold text-muted-foreground block">Logged Days</span>
              <strong className="text-sm font-black text-foreground">{stats.totalDays}</strong>
            </div>
            <div className="bg-sky-500/5 p-2 rounded-lg border border-sky-500/20 text-center">
              <span className="text-[9px] uppercase font-bold text-sky-500 block">Completed Shifts</span>
              <strong className="text-sm font-black text-sky-500">{stats.finishedShifts}</strong>
            </div>
            <div className="bg-primary/5 p-2 rounded-lg border border-primary/20 text-center col-span-2 sm:col-span-1">
              <span className="text-[9px] uppercase font-bold text-primary block">Total Worked</span>
              <strong className="text-sm font-black text-primary font-mono">
                {stats.totalWorked ? formatDuration(stats.totalWorked) : "0m 00s"}
              </strong>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card className="bg-card overflow-hidden">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base font-extrabold">Shift History</CardTitle>
          <CardDescription className="text-xs">
            Click a row to open that day in your daily shift log.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 px-4 text-xs text-muted-foreground">
              <History className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-bold text-foreground text-sm">No shift logs yet</p>
              <p className="mt-1 max-w-md mx-auto leading-relaxed">
                Punch in from your dashboard to start tracking. Your history will appear here automatically.
              </p>
              <Button size="sm" className="mt-4 text-xs" onClick={() => router.push("/dashboard")}>
                Go to Dashboard
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-emerald-500">
                      Login
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-sky-500">
                      Logout
                    </th>
                    <th className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-primary">
                      Worked
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr
                      key={`${log.date ?? index}-${log.loginTime ?? "row"}`}
                      onClick={() => log.date && router.push(`/attendance?date=${log.date}`)}
                      className="border-b border-border/60 hover:bg-muted/10 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-foreground text-xs">
                          {log.date ? formatDate(log.date) : "—"}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{log.date || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[9px] h-5 px-1.5 uppercase ${statusBadgeClass(log.shiftStatus)}`}
                        >
                          {shiftStatusLabel(log.shiftStatus || "offline")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-emerald-500 font-mono">
                          {log.loginTime || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-sky-500 font-mono">
                          {log.logoutTime || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-black text-primary font-mono">
                          {log.workedSeconds ? formatDuration(log.workedSeconds) : "0m 00s"}
                        </span>
                      </td>
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
