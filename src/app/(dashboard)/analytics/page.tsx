"use client"

import * as React from "react"
import { BarChart3, LineChart, TrendingUp, CalendarDays, GraduationCap, RefreshCw } from "lucide-react"
import {
  AreaChart, Area, BarChart, Bar, LineChart as RechartsLineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"

type RevenuePoint = { month: string; Online: number; Offline: number; total: number }
type StudentPoint = { month: string; Students: number }
type AttendancePoint = { week: string; rate: number }
type FacultyPoint = { name: string; Batches: number; Hours: number; Rating: number }

type AnalyticsOverview = {
  monthlyRevenueGrowth: RevenuePoint[]
  studentCumulativeGrowth: StudentPoint[]
  weeklyAttendanceRates: AttendancePoint[]
  facultyPerformance: FacultyPoint[]
  summary?: {
    totalStudents: number
    totalTrainers: number
    totalBatches: number
    totalFeesCollected: number
  }
}

const EMPTY_ANALYTICS: AnalyticsOverview = {
  monthlyRevenueGrowth: [],
  studentCumulativeGrowth: [],
  weeklyAttendanceRates: [],
  facultyPerformance: [],
}

function formatCurrency(value: number) {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`
  return String(value)
}

export default function AnalyticsPage() {
  const [data, setData] = React.useState<AnalyticsOverview>(EMPTY_ANALYTICS)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState("")

  const loadAnalytics = React.useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const overview = await api.getAnalyticsOverview()
      setData({
        monthlyRevenueGrowth: overview?.monthlyRevenueGrowth || [],
        studentCumulativeGrowth: overview?.studentCumulativeGrowth || [],
        weeklyAttendanceRates: overview?.weeklyAttendanceRates || [],
        facultyPerformance: overview?.facultyPerformance || [],
        summary: overview?.summary,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load analytics")
      setData(EMPTY_ANALYTICS)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadAnalytics()
  }, [loadAnalytics])

  const attendanceDomain = React.useMemo(() => {
    const rates = data.weeklyAttendanceRates.map((point) => point.rate)
    if (rates.length === 0) return [0, 100] as [number, number]
    const min = Math.max(0, Math.min(...rates) - 5)
    const max = Math.min(100, Math.max(...rates) + 5)
    return [min, max] as [number, number]
  }, [data.weeklyAttendanceRates])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Analytics Intelligence</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Detailed metrics of institute operations, financial health, admissions funnel, and teacher ratings.
          </p>
          {data.summary ? (
            <p className="text-[10px] text-muted-foreground mt-1">
              Live data: {data.summary.totalStudents} active students · {data.summary.totalBatches} batches · {data.summary.totalTrainers} trainers · ₹{data.summary.totalFeesCollected.toLocaleString()} collected
            </p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" icon={RefreshCw} onClick={() => void loadAnalytics()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              <span>Revenue stream growth</span>
            </CardTitle>
            <CardDescription>Breakdown of online program fees vs offline fees collected.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading revenue data…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.monthlyRevenueGrowth}>
                  <defs>
                    <linearGradient id="onlineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="offlineGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickFormatter={formatCurrency} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    formatter={(value: number) => [`₹${Number(value).toLocaleString()}`, ""]}
                  />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="Online" stroke="#3b82f6" fillOpacity={1} fill="url(#onlineGrad)" strokeWidth={2} name="Online fees" />
                  <Area type="monotone" dataKey="Offline" stroke="#a855f7" fillOpacity={1} fill="url(#offlineGrad)" strokeWidth={2} name="Offline fees" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <LineChart className="h-4.5 w-4.5 text-primary" />
              <span>Cumulative Student Registrations</span>
            </CardTitle>
            <CardDescription>Growth of total active student enrollments hosted on platform.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading enrollment data…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart data={data.studentCumulativeGrowth}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="Students" stroke="#10b981" strokeWidth={2.5} dot={{ stroke: "#10b981", strokeWidth: 2 }} name="Active Students" />
                </RechartsLineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <CalendarDays className="h-4.5 w-4.5 text-amber-500" />
              <span>Weekly Attendance Rates</span>
            </CardTitle>
            <CardDescription>Weekly average attendance rate percentages across all batches.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading attendance data…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.weeklyAttendanceRates}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="week" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={attendanceDomain} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }}
                    formatter={(value: number) => [`${value}%`, "Attendance"]}
                  />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Attendance %" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <GraduationCap className="h-4.5 w-4.5 text-purple-500" />
              <span>Faculty work & Rating Matrix</span>
            </CardTitle>
            <CardDescription>Evaluates hours taught, active batches, and student approval ratings.</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Loading faculty data…</div>
            ) : data.facultyPerformance.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No trainers found. Add trainers to see performance metrics.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.facultyPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Hours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Taught Hours/Wk" />
                  <Bar dataKey="Rating" fill="#a855f7" radius={[4, 4, 0, 0]} name="Approval Index (%)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
