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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"
import { useRouter } from "next/navigation"

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

  const kpis = [
    { label: "Total Employees", value: data?.totalEmployees ?? 0, icon: Users, href: "/hr/employees" },
    { label: "Present Today", value: data?.presentToday ?? 0, icon: UserCheck, href: "/hr/attendance" },
    { label: "Absent Today", value: data?.absentToday ?? 0, icon: UserX, href: "/hr/attendance" },
    { label: "On Leave Today", value: data?.onLeaveToday ?? 0, icon: CalendarOff, href: "/hr/leave" },
    { label: "Pending Leaves", value: data?.pendingLeaveRequests ?? 0, icon: CalendarOff, href: "/hr/leave" },
    { label: "Pending Claims", value: data?.pendingExpenseClaims ?? 0, icon: Receipt, href: "/hr/expenses" },
  ]

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-primary" />
            Dashboard
          </h2>
          <p className="text-xs text-muted-foreground">
            Workforce pulse for {data?.today || "today"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 w-[150px] text-xs"
          />
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
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
        <p className="text-xs text-muted-foreground py-10 text-center">Loading dashboard…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kpis.map((kpi) => (
              <Link key={kpi.label} href={kpi.href} className="block">
                <Card className="bg-card hover:border-primary/40 transition-colors h-full">
                  <CardContent className="p-3.5 flex items-start gap-2.5">
                    <div className="rounded-lg bg-secondary/50 p-2 text-primary">
                      <kpi.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground">{kpi.label}</p>
                      <p className="text-lg font-extrabold text-foreground">{kpi.value}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Payroll Status · {month}
                </CardTitle>
                <CardDescription>Cycle progress for the selected month</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                {[
                  { label: "Draft", value: data?.payrollStatus.draft ?? 0 },
                  { label: "Pending", value: data?.payrollStatus.pending ?? 0 },
                  { label: "Approved", value: data?.payrollStatus.approved ?? 0 },
                  { label: "Released", value: data?.payrollStatus.released ?? 0 },
                ].map((row) => (
                  <div key={row.label} className="rounded-lg border border-border/50 bg-muted/20 px-2 py-3">
                    <p className="text-[10px] text-muted-foreground">{row.label}</p>
                    <p className="text-base font-bold text-foreground">{row.value}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-extrabold flex items-center gap-2">
                  <Cake className="h-4 w-4 text-primary" />
                  Upcoming
                </CardTitle>
                <CardDescription>Birthdays & work anniversaries (next 30 days)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {(data?.upcoming?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">Nothing upcoming.</p>
                ) : (
                  data?.upcoming.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-border/40 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {item.type === "birthday" ? (
                          <Cake className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <Award className="h-3.5 w-3.5 text-emerald-500" />
                        )}
                        <span className="font-semibold text-foreground">{item.name}</span>
                        <span className="text-muted-foreground">{item.type}</span>
                      </div>
                      <span className="text-muted-foreground">
                        {item.date} · {item.days}d
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
