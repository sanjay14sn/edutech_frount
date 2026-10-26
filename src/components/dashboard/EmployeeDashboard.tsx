"use client"

import * as React from "react"
import Link from "next/link"
import {
  CalendarOff,
  Hourglass,
  Building2,
  IdCard,
  CalendarCheck,
  ClipboardPen,
  CalendarClock,
  ChevronRight,
  LogIn,
  LogOut,
  Timer,
  MapPin,
  CheckCircle2,
  Sun,
  Sunset,
  Moon,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { KPICard } from "@/components/dashboard/KPICard"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { computeWorkedSeconds, deriveShiftStatus, formatDuration } from "@/lib/shiftTimer"
import {
  type EmployeeShift,
  type EmployeeSummary,
  WORK_MODE_LABELS,
  formatDay,
} from "@/lib/employeePortal"
import { useStore } from "@/store/useStore"

function greetingFor(hour: number) {
  if (hour < 12) return { text: "Good Morning", icon: Sun }
  if (hour < 17) return { text: "Good Afternoon", icon: Sun }
  if (hour < 21) return { text: "Good Evening", icon: Sunset }
  return { text: "Good Evening", icon: Moon }
}

function longDate(d: Date) {
  const weekday = d.toLocaleDateString("en-GB", { weekday: "long" })
  const month = d.toLocaleDateString("en-GB", { month: "long" })
  return `${weekday}, ${d.getDate()} ${month} ${d.getFullYear()}`
}

export function EmployeeDashboard() {
  const { user } = useStore()
  const [summary, setSummary] = React.useState<EmployeeSummary | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const load = React.useCallback(async () => {
    try {
      setError("")
      setSummary(await api.getEmployeeSummary())
    } catch (err) {
      setError((err as Error).message || "Failed to load your dashboard")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const now = new Date()
  const greeting = greetingFor(now.getHours())
  const GreetingIcon = greeting.icon
  const firstName = (summary?.employee.name || user?.name || "").split(" ")[0]

  if (loading) {
    return <p className="py-16 text-center text-xs text-muted-foreground">Loading your dashboard…</p>
  }

  if (error || !summary) {
    return (
      <Card className="bg-card">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          {error || "No employee profile is linked to your login. Please contact HR."}
        </CardContent>
      </Card>
    )
  }

  const { employee, leave, today } = summary

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Employee Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {employee.designation} · {employee.department}
        </p>
      </div>

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
        <CardContent className="flex items-center gap-4 p-5 sm:p-6">
          <div className="hidden sm:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <GreetingIcon className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-foreground">
              {greeting.text}, {firstName}! Hope your work is going well.
            </p>
            <p className="text-xs text-muted-foreground mt-1">{longDate(now)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TodayAttendanceCard
          className="sm:col-span-2 lg:col-span-1 lg:row-span-2"
          attendance={today.attendance}
          onChange={load}
        />
        <KPICard title="Leave Balance" value={leave.available} subtext="Days available" icon={CalendarOff} delay={0.05} />
        <KPICard title="Pending Leaves" value={leave.pending} subtext="Awaiting approval" icon={Hourglass} delay={0.1} />
        <KPICard title="Department" value={employee.department || "—"} subtext={employee.designation} icon={Building2} delay={0.15} />
        <KPICard
          title="Employee ID"
          value={employee.employeeCode}
          subtext={`Joined ${formatDay(employee.joiningDate)}`}
          icon={IdCard}
          delay={0.2}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <QuickAction
          href="/employee/attendance"
          icon={CalendarCheck}
          title="Attendance"
          subtitle="View & corrections"
        />
        <QuickAction
          href="/employee/daily-report"
          icon={ClipboardPen}
          title="Daily Report"
          subtitle={today.reportSubmitted ? "Today's report submitted" : "Submit today's work"}
          done={today.reportSubmitted}
        />
        <QuickAction
          href="/employee/leave?apply=1"
          icon={CalendarClock}
          title="Leave Request"
          subtitle="Apply for leave"
        />
      </div>
    </div>
  )
}

function TodayAttendanceCard({
  attendance,
  onChange,
  className,
}: {
  attendance: EmployeeShift | null
  onChange: () => Promise<void>
  className?: string
}) {
  const [workMode, setWorkMode] = React.useState("office")
  const [busy, setBusy] = React.useState(false)
  const [, setTick] = React.useState(0)
  const status = deriveShiftStatus(attendance)

  React.useEffect(() => {
    if (status !== "active") return
    const id = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [status])

  const run = async (action: () => Promise<unknown>) => {
    try {
      setBusy(true)
      await action()
      await onChange()
    } catch (err) {
      alert((err as Error).message || "Something went wrong")
    } finally {
      setBusy(false)
    }
  }

  const worked = formatDuration(computeWorkedSeconds(attendance))

  return (
    <Card className={cn("bg-card", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-semibold">
          <span>Today&apos;s Attendance</span>
          {status === "active" && <Badge variant="success">Working</Badge>}
          {status === "finished" && <Badge variant="secondary">Shift ended</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "offline" && (
          <>
            <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 py-6 text-center">
              <Timer className="mx-auto h-6 w-6 text-muted-foreground" />
              <p className="mt-2 text-sm font-medium text-foreground">Not clocked in yet</p>
              <p className="text-[11px] text-muted-foreground">Choose where you are working from and clock in.</p>
            </div>
            <div className="flex gap-2">
              <Select value={workMode} onChange={(e) => setWorkMode(e.target.value)} className="h-10 text-sm">
                <option value="office">Office</option>
                <option value="remote">Remote</option>
                <option value="field">Field</option>
              </Select>
              <Button
                icon={LogIn}
                isLoading={busy}
                className="shrink-0"
                onClick={() => run(() => api.employeeClockIn(workMode))}
              >
                Clock In
              </Button>
            </div>
          </>
        )}

        {status !== "offline" && attendance && (
          <>
            <div className="rounded-lg bg-muted/30 py-5 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Worked today</p>
              <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">{worked}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground">Clock in</p>
                <p className="mt-0.5 font-semibold text-foreground">{attendance.loginTime || "—"}</p>
              </div>
              <div className="rounded-lg border border-border/60 p-3">
                <p className="text-muted-foreground">Clock out</p>
                <p className="mt-0.5 font-semibold text-foreground">{attendance.logoutTime || "—"}</p>
              </div>
            </div>
            {attendance.workMode && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {WORK_MODE_LABELS[attendance.workMode]}
              </p>
            )}
            {status === "active" && (
              <Button
                variant="outline"
                icon={LogOut}
                isLoading={busy}
                className="w-full text-rose-600 border-rose-500/30 hover:bg-rose-500/5"
                onClick={() => {
                  if (confirm("Clock out for today?")) void run(() => api.employeeClockOut())
                }}
              >
                Clock Out
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function QuickAction({
  href,
  icon: Icon,
  title,
  subtitle,
  done,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle: string
  done?: boolean
}) {
  return (
    <Link href={href} className="group">
      <Card className="bg-card h-full group-hover:border-primary/40">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className={cn("text-xs", done ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
              {done && <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 -mt-0.5" />}
              {subtitle}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardContent>
      </Card>
    </Link>
  )
}
