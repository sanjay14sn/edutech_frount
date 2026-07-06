"use client"

import * as React from "react"
import { Users, IndianRupee, BookOpen, CalendarRange, Eye, Plus, FileText, CheckCircle2, TrendingUp, AlertTriangle, MapPin, ChevronRight, Wallet } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { KPICard } from "./KPICard"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { countActiveCourses } from "@/lib/courseStats"
import {
  buildRevenueTrends,
  getIncomeForStudents,
  studentsAtCenter,
} from "@/lib/incomeStats"
import { downloadCsvFile, sanitizeFilename, type CsvSection } from "@/lib/exportReports"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { StudentRisk } from "@/lib/studentRiskStats"

interface CenterData {
  id: string
  name: string
  location: string
  leads: number
  income: number
  attendance: string
  courses: number
  batches: number
  recentActivity: { id: string; text: string; time: string; type: string }[]
  risks?: StudentRisk[]
}

const DASHBOARD_CHART_HEIGHT = 256

function DashboardChart({
  children,
}: {
  children: React.ReactElement
}) {
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    setReady(true)
  }, [])

  return (
    <div className="h-64 w-full min-w-0">
      {ready ? (
        <ResponsiveContainer width="100%" height={DASHBOARD_CHART_HEIGHT}>
          {children}
        </ResponsiveContainer>
      ) : (
        <div className="h-full w-full rounded-lg bg-muted/20 animate-pulse" aria-hidden />
      )}
    </div>
  )
}

export function OwnerDashboard() {
  const router = useRouter()
  const { activeTenant, addNotification } = useStore()
  const tenantName = activeTenant?.name || "Your Institute"
  
  const [centersList, setCentersList] = React.useState<CenterData[]>([])
  const [metrics, setMetrics] = React.useState<any>(null)
  const [courses, setCourses] = React.useState<any[]>([])
  const [batches, setBatches] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [revenueTrends, setRevenueTrends] = React.useState<any[]>([])
  const [leadPipelineConversion, setLeadPipelineConversion] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isExporting, setIsExporting] = React.useState(false)

  const [selectedCenterId, setSelectedCenterId] = React.useState("all")

  React.useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [data, coursesData, batchesData, studentsData] = await Promise.all([
          api.getDashboardMetrics(),
          api.getCourses().catch(() => []),
          api.getBatches().catch(() => []),
          api.getStudents().catch(() => []),
        ])
        setCourses(coursesData)
        setBatches(batchesData)
        setStudents(studentsData)
        if (data.centersList) setCentersList(data.centersList)
        if (data.metrics) setMetrics(data.metrics)
        if (data.revenueTrends) setRevenueTrends(data.revenueTrends)
        if (data.leadPipelineConversion) setLeadPipelineConversion(data.leadPipelineConversion)
      } catch (err) {
        console.error("Failed to load owner dashboard data:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchDashboardData()
  }, [])

  // Deriving metrics dynamically based on selected center
  const activeCenter = centersList.find((c) => c.id === selectedCenterId)

  const activeCoursesCount = React.useMemo(() => {
    if (selectedCenterId !== "all" && activeCenter) {
      return countActiveCourses(courses, batches, activeCenter.name)
    }
    return countActiveCourses(courses, batches)
  }, [selectedCenterId, activeCenter, courses, batches])

  const scopedStudents = React.useMemo(() => {
    if (selectedCenterId !== "all" && activeCenter) {
      return studentsAtCenter(students, batches, activeCenter.name)
    }
    return students
  }, [selectedCenterId, activeCenter, students, batches])

  const income = React.useMemo(
    () => getIncomeForStudents(scopedStudents),
    [scopedStudents]
  )

  const coursesKpi = activeCoursesCount
  
  const attendance = activeCenter
    ? activeCenter.attendance
    : metrics?.averageAttendance || "0%"

  const activities = activeCenter
    ? activeCenter.recentActivity
    : centersList.flatMap((c) => c.recentActivity)

  const leads = activeCenter ? activeCenter.leads : (metrics?.totalLeads || 0)

  const displayRevenueTrends = React.useMemo(() => {
    const trends = buildRevenueTrends(scopedStudents)
    return trends.length > 0 ? trends : revenueTrends
  }, [scopedStudents, revenueTrends])

  const displayLeadConversion = React.useMemo(() => {
    if (selectedCenterId === "all" || centersList.length === 0) return leadPipelineConversion
    const index = centersList.findIndex((c) => c.id === selectedCenterId)
    const multiplier = index === 0 ? 0.6 : 0.4
    return leadPipelineConversion.map((d) => ({
      stage: d.stage,
      Count: Math.round(d.Count * multiplier)
    }))
  }, [selectedCenterId, centersList, leadPipelineConversion])

  const displayRisks: StudentRisk[] = React.useMemo(() => {
    if (selectedCenterId !== "all" && activeCenter?.risks) {
      return activeCenter.risks
    }
    return metrics?.risks || []
  }, [selectedCenterId, activeCenter, metrics?.risks])

  const riskEmptyMessage =
    selectedCenterId !== "all" && activeCenter
      ? `No critical risks detected at ${activeCenter.name}.`
      : "No critical risks detected across your centers."

  const handleExportReports = async () => {
    setIsExporting(true)
    try {
      const month = new Date().toISOString().slice(0, 7)
      const centerLabel =
        selectedCenterId === "all" ? "All Centers" : activeCenter?.name || "Selected Center"

      const callSummary = await api.getCallSummary(month).catch(() => null)

      const sections: CsvSection[] = [
        {
          title: "Institute Report Summary",
          headers: ["Metric", "Value"],
          rows: [
            ["Tenant", tenantName],
            ["Center Scope", centerLabel],
            ["Report Month", month],
            ["Generated At", new Date().toLocaleString()],
            ["Active Leads", leads],
            ["Monthly Income (INR)", income],
            ["Monthly Attendance Rate", attendance],
            ["Active Courses", coursesKpi],
          ],
        },
        {
          title: "Revenue Trends",
          headers: ["Month", "Collected (INR)", "Dues Outstanding (INR)"],
          rows: displayRevenueTrends.map((row) => [
            row.month,
            row.Collected ?? 0,
            row.Dues ?? 0,
          ]),
        },
        {
          title: "Lead Conversion Pipeline",
          headers: ["Stage", "Count"],
          rows: displayLeadConversion.map((row) => [row.stage, row.Count ?? 0]),
        },
      ]

      if (centersList.length > 0) {
        sections.push({
          title: "Campus Centers",
          headers: ["Center", "Location", "Leads", "Income (INR)", "Attendance", "Courses", "Batches"],
          rows: centersList.map((center) => [
            center.name,
            center.location,
            center.leads,
            center.income,
            center.attendance,
            center.courses,
            center.batches,
          ]),
        })
      }

      if (scopedStudents.length > 0) {
        sections.push({
          title: "Students (Scoped)",
          headers: [
            "Name",
            "Email",
            "Course",
            "Status",
            "Fees Paid (INR)",
            "Fees Total (INR)",
            "Outstanding (INR)",
            "Enrollment Date",
          ],
          rows: scopedStudents.map((student) => [
            student.name || "",
            student.email || "",
            student.course || "",
            student.status || "",
            student.feesPaid ?? 0,
            student.feesTotal ?? 0,
            Math.max(0, (student.feesTotal || 0) - (student.feesPaid || 0)),
            student.enrollmentDate || "",
          ]),
        })
      }

      if (callSummary?.metrics) {
        sections.push({
          title: `Call Summary (${month})`,
          headers: ["Metric", "Value"],
          rows: [
            ["Total Dials", callSummary.metrics.totalDials ?? 0],
            ["Average Duration", callSummary.metrics.avgDurationLabel ?? "—"],
            ["Interested Candidates", callSummary.metrics.interestedCandidates ?? 0],
            ["Connection Rate (%)", callSummary.metrics.connectionRate ?? 0],
          ],
        })
      }

      if (callSummary?.logs?.length) {
        sections.push({
          title: "Call Logs",
          headers: ["Candidate", "BDE", "Date", "Time", "Duration", "Outcome", "Notes"],
          rows: callSummary.logs.map((log: any) => [
            log.candidate || "",
            log.bdeName || "",
            log.date || "",
            log.time || "",
            log.duration || "",
            log.status || "",
            log.notes || "",
          ]),
        })
      }

      const filename = sanitizeFilename(
        `institute-report-${tenantName}-${centerLabel}-${month}`
      )
      downloadCsvFile(filename, sections)

      addNotification({
        title: "Report Exported",
        description: `Downloaded ${filename}.csv with dashboard, student, and call data.`,
        type: "system",
      })
    } catch (err: unknown) {
      addNotification({
        title: "Export Failed",
        description: err instanceof Error ? err.message : "Could not export reports.",
        type: "system",
      })
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Loading Owner Dashboard...</div>
  }


  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>{tenantName} Dashboard</span>
            <Badge variant="success" className="text-xs">
              Active Growth
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational and Financial insights for your academic institute tenant.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Multi-Center Selector */}
          {centersList.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap">Center:</span>
              <Select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                className="bg-card border-border text-foreground text-xs h-9 w-44"
              >
                <option value="all">All Centers (Combined)</option>
                {centersList.map((center) => (
                  <option key={center.id} value={center.id}>
                    {center.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" icon={Wallet} onClick={() => window.location.href = "/hr"}>
              HR & Payroll
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={FileText}
              onClick={() => void handleExportReports()}
              disabled={isExporting}
            >
              {isExporting ? "Exporting…" : "Export Reports"}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => router.push("/courses?action=add-course")}
            >
              New Course
            </Button>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Active Leads"
          value={leads.toString()}
          icon={Users}
          delay={0.05}
        />
        <KPICard
          title="Monthly Income (INR)"
          value={formatCurrency(income)}
          icon={IndianRupee}
          delay={0.1}
        />
        <KPICard
          title="Monthly Attendance Rate"
          value={attendance}
          icon={CalendarRange}
          delay={0.15}
        />
        <KPICard
          title="Active Courses"
          value={coursesKpi.toString()}
          icon={BookOpen}
          delay={0.2}
        />
      </div>

      {/* Analytics Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Analytics Area Chart */}
        <Card className="lg:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-500" />
              <span>Revenue Streams & Dues {selectedCenterId !== "all" && `(${activeCenter?.name})`}</span>
            </CardTitle>
            <CardDescription>Visual comparison of collected fees vs pending student dues.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardChart>
              <AreaChart data={displayRevenueTrends}>
                <defs>
                  <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="duesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="Collected" stroke="#10b981" fillOpacity={1} fill="url(#collGrad)" strokeWidth={2} name="Collected" />
                <Area type="monotone" dataKey="Dues" stroke="#ef4444" fillOpacity={1} fill="url(#duesGrad)" strokeWidth={2} name="Dues Outstanding" />
              </AreaChart>
            </DashboardChart>
          </CardContent>
        </Card>

        {/* Lead Conversion Funnel */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Number of active leads in pipeline stages.</CardDescription>
          </CardHeader>
          <CardContent className="min-w-0">
            <DashboardChart>
              <BarChart data={displayLeadConversion} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" fontSize={10} />
                <YAxis dataKey="stage" type="category" stroke="var(--muted-foreground)" fontSize={10} width={75} />
                <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px" }} />
                <Bar dataKey="Count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </DashboardChart>
          </CardContent>
        </Card>
      </div>

      {/* Activity Logs & Student Alerts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Activity Feed */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Recent events {selectedCenterId !== "all" ? `at ${activeCenter?.name}` : "across all branches"}.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs leading-normal">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{log.text}</p>
                    <span className="text-[10px] text-muted-foreground">{log.time}</span>
                  </div>
                </div>
              ))}
              {activities.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity logs for this branch.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Tasks & Alerts */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle>Student Risk & Tasks</CardTitle>
            <CardDescription>Priority issues and actions requiring immediate review.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {displayRisks.length > 0 ? (
              displayRisks.map((risk, i) => {
                const content = (
                  <>
                    <AlertTriangle className="h-4.5 w-4.5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-foreground">{risk.title}</p>
                      <p className="text-muted-foreground mt-0.5">{risk.description}</p>
                    </div>
                  </>
                )

                if (risk.link) {
                  return (
                    <Link
                      key={`${risk.title}-${i}`}
                      href={risk.link}
                      className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs leading-normal transition-colors hover:bg-red-500/10"
                    >
                      {content}
                    </Link>
                  )
                }

                return (
                  <div
                    key={`${risk.title}-${i}`}
                    className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs leading-normal"
                  >
                    {content}
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border/80 rounded-lg text-xs text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-2 opacity-80" />
                <p>{riskEmptyMessage}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
