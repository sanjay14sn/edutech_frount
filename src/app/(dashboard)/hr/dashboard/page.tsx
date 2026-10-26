"use client"
import * as React from "react"
import Link from "next/link"
import {
  Users,
  UserCheck,
  UserX,
  CalendarOff,
  Receipt,
  Wallet,
  Cake,
  Award,
  RefreshCw,
  LayoutDashboard,
  ArrowLeft,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  CalendarCheck,
  PartyPopper,
  type LucideIcon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

type DashboardData = {
  month: string
  today: string
  totalEmployees: number
  presentToday: number
  absentToday: number
  onLeaveToday: number
  pendingLeaveRequests: number
  pendingExpenseClaims: number
  payrollStatus: { draft: number; pending: number; approved: number; released: number; total: number }
  upcoming: Array<{ name: string; type: string; date: string; days: number }>
}

function parseIso(date: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date || "")
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

function formatLongDate(date?: string) {
  const d = date ? parseIso(date) : new Date()
  if (!d) return date || ""
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function formatShortDate(date: string) {
  const d = parseIso(date)
  if (d) return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  const md = /^(\d{2})-(\d{2})$/.exec(date)
  if (md) return new Date(2000, Number(md[1]) - 1, Number(md[2])).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  return date
}

function relativeDays(days: number) {
  if (days <= 0) return "Today"
  if (days === 1) return "Tomorrow"
  return `In ${days} days`
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

const TONES = {
  indigo: { icon: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400", glow: "from-indigo-500/10", bar: "bg-indigo-500" },
  emerald: { icon: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", glow: "from-emerald-500/10", bar: "bg-emerald-500" },
  rose: { icon: "bg-rose-500/15 text-rose-600 dark:text-rose-400", glow: "from-rose-500/10", bar: "bg-rose-500" },
  amber: { icon: "bg-amber-500/15 text-amber-600 dark:text-amber-400", glow: "from-amber-500/10", bar: "bg-amber-500" },
  sky: { icon: "bg-sky-500/15 text-sky-600 dark:text-sky-400", glow: "from-sky-500/10", bar: "bg-sky-500" },
  violet: { icon: "bg-violet-500/15 text-violet-600 dark:text-violet-400", glow: "from-violet-500/10", bar: "bg-violet-500" },
  slate: { icon: "bg-slate-500/15 text-slate-600 dark:text-slate-300", glow: "from-slate-500/10", bar: "bg-slate-400" },
} as const

type Tone = keyof typeof TONES

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string
  value: number | string
  hint?: string
  icon: LucideIcon
  tone: Tone
  href: string
}) {
  const t = TONES[tone]
  return (
    <Link href={href} className="group block">
      <Card className="relative h-full overflow-hidden bg-card transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30">
        <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-80", t.glow)} />
        <CardContent className="relative flex items-start justify-between gap-3 p-4">
          <div className="space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
            {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={cn("rounded-xl p-2.5", t.icon)}>
              <Icon className="h-4 w-4" />
            </div>
            <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default function HRDashboardPage() {
  const { user } = useStore()
  const router = useRouter()
  const [month, setMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [data, setData] = React.useState<DashboardData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (user?.role === "trainer" || user?.role === "bde") {
      router.replace("/hr/me")
    }
  }, [user, router])

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await api.getHRDashboard(month)
      setData(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [month])

  React.useEffect(() => {
    if (user && user.role !== "trainer" && user.role !== "bde") void load()
  }, [user, load])

  const shiftMonth = (delta: number) => {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`)
  }

  const total = data?.totalEmployees ?? 0
  const present = data?.presentToday ?? 0
  const absent = data?.absentToday ?? 0
  const onLeave = data?.onLeaveToday ?? 0
  const unmarked = Math.max(total - present - absent - onLeave, 0)
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const attendanceRate = pct(present)

  const attendanceSegments = [
    { label: "Present", value: present, tone: "emerald" as Tone },
    { label: "Absent", value: absent, tone: "rose" as Tone },
    { label: "On leave", value: onLeave, tone: "amber" as Tone },
    { label: "Not marked", value: unmarked, tone: "slate" as Tone },
  ]

  const pendingLeaves = data?.pendingLeaveRequests ?? 0
  const pendingClaims = data?.pendingExpenseClaims ?? 0
  const attention = [
    {
      label: "Leave requests awaiting approval",
      value: pendingLeaves,
      icon: CalendarOff,
      tone: "amber" as Tone,
      href: "/hr/leave",
    },
    {
      label: "Expense claims to review",
      value: pendingClaims,
      icon: Receipt,
      tone: "sky" as Tone,
      href: "/hr/expenses",
    },
    {
      label: "Staff not marked today",
      value: unmarked,
      icon: CalendarCheck,
      tone: "violet" as Tone,
      href: "/hr/attendance",
    },
  ]
  const attentionCount = attention.filter((a) => a.value > 0).length

  const payroll = data?.payrollStatus
  const payrollStages = [
    { label: "Draft", value: payroll?.draft ?? 0, tone: "slate" as Tone },
    { label: "Pending", value: payroll?.pending ?? 0, tone: "amber" as Tone },
    { label: "Approved", value: payroll?.approved ?? 0, tone: "sky" as Tone },
    { label: "Released", value: payroll?.released ?? 0, tone: "emerald" as Tone },
  ]
  const payrollTotal = payrollStages.reduce((s, p) => s + p.value, 0)
  const releasedPct = payrollTotal > 0 ? Math.round(((payroll?.released ?? 0) / payrollTotal) * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <span className="rounded-lg bg-primary/10 p-1.5 text-primary">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            HR Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">Workforce pulse · {formatLongDate(data?.today)}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border/70 bg-card">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
              className="flex h-8 w-8 items-center justify-center rounded-l-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] px-2 text-center text-xs font-semibold text-foreground">
              {monthLabel(month)}
            </span>
            <button
              type="button"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
              className="flex h-8 w-8 items-center justify-center rounded-r-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            className={cn("h-8 text-xs", loading && "[&_svg]:animate-spin")}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2 text-xs text-rose-600">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[104px] animate-pulse rounded-xl border border-border/50 bg-muted/30" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total employees"
              value={total}
              hint="Active on roster"
              icon={Users}
              tone="indigo"
              href="/hr/employees"
            />
            <StatCard
              label="Present today"
              value={present}
              hint={`${attendanceRate}% attendance`}
              icon={UserCheck}
              tone="emerald"
              href="/hr/attendance"
            />
            <StatCard
              label="Absent today"
              value={absent}
              hint={`${pct(absent)}% of staff`}
              icon={UserX}
              tone="rose"
              href="/hr/attendance"
            />
            <StatCard
              label="On leave today"
              value={onLeave}
              hint={`${pendingLeaves} request${pendingLeaves === 1 ? "" : "s"} pending`}
              icon={CalendarOff}
              tone="amber"
              href="/hr/leave"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="bg-card lg:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                      <CalendarCheck className="h-4 w-4 text-primary" />
                      Today&apos;s attendance
                    </CardTitle>
                    <CardDescription>Live split of the roster for today</CardDescription>
                  </div>
                  <Link
                    href="/hr/attendance"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    Mark attendance <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                  <p className="text-4xl font-extrabold tabular-nums text-foreground">{attendanceRate}%</p>
                  <p className="pb-1.5 text-xs text-muted-foreground">
                    {present} of {total} staff present
                  </p>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/50">
                  {total > 0 &&
                    attendanceSegments.map((s) =>
                      s.value > 0 ? (
                        <div
                          key={s.label}
                          className={cn("h-full transition-all", TONES[s.tone].bar)}
                          style={{ width: `${pct(s.value)}%` }}
                          title={`${s.label}: ${s.value}`}
                        />
                      ) : null
                    )}
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {attendanceSegments.map((s) => (
                    <div key={s.label} className="rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className={cn("h-2 w-2 rounded-full", TONES[s.tone].bar)} />
                        {s.label}
                      </div>
                      <p className="mt-0.5 text-lg font-bold tabular-nums text-foreground">
                        {s.value}
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">{pct(s.value)}%</span>
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm font-extrabold">
                  Needs attention
                  {attentionCount > 0 && (
                    <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                      {attentionCount}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Items waiting on you</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {attentionCount === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    <p className="text-xs font-semibold text-foreground">All caught up</p>
                    <p className="text-[11px] text-muted-foreground">No pending approvals right now.</p>
                  </div>
                ) : (
                  attention.map((a) => (
                    <Link
                      key={a.label}
                      href={a.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 transition-colors hover:bg-muted/30",
                        a.value === 0 && "opacity-50"
                      )}
                    >
                      <div className={cn("rounded-lg p-2", TONES[a.tone].icon)}>
                        <a.icon className="h-3.5 w-3.5" />
                      </div>
                      <span className="flex-1 text-xs font-medium text-foreground">{a.label}</span>
                      <span className="text-sm font-bold tabular-nums text-foreground">{a.value}</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                      <Wallet className="h-4 w-4 text-primary" />
                      Payroll · {monthLabel(month)}
                    </CardTitle>
                    <CardDescription>
                      {payrollTotal > 0
                        ? `${payrollTotal} payslip${payrollTotal === 1 ? "" : "s"} · ${releasedPct}% released`
                        : "No payroll run for this month yet"}
                    </CardDescription>
                  </div>
                  <Link
                    href="/hr/payroll"
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                  >
                    {payrollTotal > 0 ? "Open payroll" : "Run payroll"} <ArrowUpRight className="h-3 w-3" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  {payrollTotal > 0 &&
                    payrollStages.map((s) =>
                      s.value > 0 ? (
                        <div
                          key={s.label}
                          className={cn("h-full", TONES[s.tone].bar)}
                          style={{ width: `${(s.value / payrollTotal) * 100}%` }}
                        />
                      ) : null
                    )}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {payrollStages.map((s, i) => (
                    <div key={s.label} className="relative text-center">
                      {i < payrollStages.length - 1 && (
                        <div className="absolute left-1/2 top-4 h-px w-full bg-border" />
                      )}
                      <div
                        className={cn(
                          "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full border-2 bg-card text-xs font-bold tabular-nums",
                          s.value > 0 ? "border-transparent text-white" : "border-border text-muted-foreground",
                          s.value > 0 && TONES[s.tone].bar
                        )}
                      >
                        {s.value}
                      </div>
                      <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                  <PartyPopper className="h-4 w-4 text-primary" />
                  Upcoming celebrations
                </CardTitle>
                <CardDescription>Birthdays & work anniversaries in the next 30 days</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.upcoming?.length ?? 0) === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-center">
                    <Cake className="h-7 w-7 text-muted-foreground/60" />
                    <p className="text-xs text-muted-foreground">Nothing coming up in the next 30 days.</p>
                  </div>
                ) : (
                  data?.upcoming.map((item, idx) => {
                    const birthday = item.type === "birthday"
                    return (
                      <div
                        key={`${item.name}-${idx}`}
                        className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
                      >
                        <div
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold",
                            birthday ? TONES.amber.icon : TONES.emerald.icon
                          )}
                        >
                          {initials(item.name) || "?"}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-foreground">{item.name}</p>
                          <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            {birthday ? (
                              <Cake className="h-3 w-3 text-amber-500" />
                            ) : (
                              <Award className="h-3 w-3 text-emerald-500" />
                            )}
                            {birthday ? "Birthday" : "Work anniversary"} · {formatShortDate(item.date)}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            item.days <= 1
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {relativeDays(item.days)}
                        </span>
                      </div>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
