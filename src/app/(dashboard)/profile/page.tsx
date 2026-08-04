"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  UserCircle,
  Cloud,
  Database,
  Building2,
  Users,
  GraduationCap,
  Briefcase,
  BookOpen,
  GitPullRequest,
  IndianRupee,
  TrendingUp,
  Wallet,
  Activity,
  MonitorPlay,
  FileCheck,
  CalendarCheck,
  Sparkles,
  RefreshCw,
  Zap,
  Shield,
  CheckCircle2,
  Bot,
  HardDrive,
  CircleDot,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type InstituteProfile = {
  institute: {
    tenantId: string
    tenantName: string
    centerCount: number
    centerNames: string[]
  }
  storage: {
    cloudinary: {
      bytes: number
      bytesLabel: string
      files: number
      lastUploadAt: string | null
    }
    mongo: {
      bytes: number
      bytesLabel: string
      documents: number
    }
  }
  overview: {
    totalStudents: number
    activeStudents: number
    totalTrainers: number
    totalBdes: number
    totalBatches: number
    totalLeads: number
  }
  revenue: {
    monthlyCollections: number
    monthlyCollectionsLabel: string
    outstandingDues: number
    outstandingDuesLabel: string
    conversionRate: number
    newAdmissionsThisMonth: number
  }
  systemUsage: {
    dailyActiveUsers: number
    lmsWatchHours: number
    assignmentSubmissions: number
    attendancePercentage: number
  }
  ai: {
    assistantLabel: string
    requestsToday: number
    requestsTodayLabel: string
    estimatedCostInr: number
    estimatedCostLabel: string
    mostUsedBy: string
    totalTokens: number
    totalRequests: number
    lastUsedAt: string | null
  }
  generatedAt?: string
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0)
}

function usagePercent(bytes: number, capBytes: number) {
  if (!capBytes) return 0
  return Math.min(100, Math.round((bytes / capBytes) * 100))
}

import { PageLoader } from "@/components/shared/PageLoader"
function SectionHeader({
  icon: Icon,
  title,
  description,
  accent = "primary",
}: {
  icon: React.ElementType
  title: string
  description?: string
  accent?: "primary" | "emerald" | "sky" | "violet" | "amber"
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary border-primary/20",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
    amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  }

  return (
    <div className="flex items-start gap-3">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", accentMap[accent])}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-base font-bold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
    </div>
  )
}

function StatTile({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "default",
  delay = 0,
}: {
  label: string
  value: string | number
  subtext?: string
  icon: React.ElementType
  tone?: "default" | "emerald" | "sky" | "violet" | "amber" | "rose"
  delay?: number
}) {
  const tones = {
    default: "border-border/60 bg-card",
    emerald: "border-emerald-500/20 bg-emerald-500/[0.04]",
    sky: "border-sky-500/20 bg-sky-500/[0.04]",
    violet: "border-violet-500/20 bg-violet-500/[0.04]",
    amber: "border-amber-500/20 bg-amber-500/[0.04]",
    rose: "border-rose-500/20 bg-rose-500/[0.04]",
  }
  const iconTones = {
    default: "bg-secondary/80 text-foreground",
    emerald: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    sky: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    amber: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    rose: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className={cn("rounded-xl border p-4 shadow-xs", tones[tone])}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-xl font-black tracking-tight text-foreground">{value}</p>
          {subtext ? <p className="mt-1 text-[11px] text-muted-foreground">{subtext}</p> : null}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", iconTones[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  )
}

function UsageMeter({
  label,
  valueLabel,
  detail,
  percent,
  icon: Icon,
  tone = "primary",
}: {
  label: string
  valueLabel: string
  detail: string
  percent: number
  icon: React.ElementType
  tone?: "primary" | "sky" | "violet"
}) {
  const barTone = {
    primary: "bg-primary",
    sky: "bg-sky-500",
    violet: "bg-violet-500",
  }
  const iconTone = {
    primary: "bg-primary/10 text-primary",
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", iconTone[tone])}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="text-lg font-black text-foreground">{valueLabel}</p>
            <p className="text-[11px] text-muted-foreground">{detail}</p>
          </div>
        </div>
        <Badge variant="outline" className="shrink-0 text-[10px]">
          {percent}% used
        </Badge>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted/60">
        <div
          className={cn("h-full rounded-full transition-all duration-700", barTone[tone])}
          style={{ width: `${Math.max(percent, 4)}%` }}
        />
      </div>
    </div>
  )
}

function RingStat({ label, value, suffix = "", color = "text-primary" }: { label: string; value: number; suffix?: string; color?: string }) {
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (Math.min(value, 100) / 100) * circumference

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-24 w-24">
        <svg className="h-24 w-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" />
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={color}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-black text-foreground">
            {value}
            {suffix}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-muted-foreground">{label}</p>
    </div>
  )
}

export default function ProfilePage() {
  const { user, addNotification } = useStore()
  const role = user?.role || "owner"

  const [data, setData] = React.useState<InstituteProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)
  const [fetchError, setFetchError] = React.useState("")

  const loadProfile = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setFetchError("")
    try {
      const response = (await api.getInstituteProfile()) as InstituteProfile
      setData(response)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load institute profile"
      setFetchError(message)
      addNotification({ title: "Profile load failed", description: message, type: "system" })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [addNotification])

  React.useEffect(() => {
    if (role === "owner") loadProfile()
  }, [role, loadProfile])

  if (role !== "owner") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Institute profile is available to owners only.
          </CardContent>
        </Card>
      </div>
    )
  }

  if (loading && !data) {
    return <PageLoader />
  }

  const institute = data?.institute
  const storage = data?.storage
  const overview = data?.overview
  const revenue = data?.revenue
  const systemUsage = data?.systemUsage
  const ai = data?.ai

  const instituteInitials = (institute?.tenantName || user?.name || "IN")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  const healthScore = Math.round(
    ((systemUsage?.attendancePercentage ?? 0) * 0.35 +
      (revenue?.conversionRate ?? 0) * 0.35 +
      Math.min(100, ((overview?.activeStudents ?? 0) / Math.max(overview?.totalStudents ?? 1, 1)) * 100) * 0.3)
  )

  const cloudinaryPercent = usagePercent(storage?.cloudinary.bytes ?? 0, 1024 * 1024 * 1024)
  const mongoPercent = usagePercent(storage?.mongo.bytes ?? 0, 100 * 1024 * 1024)

  return (
    <div className="space-y-6 pb-2">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/10 via-card to-violet-500/5"
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-violet-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-lg font-black text-white shadow-lg shadow-primary/20">
              {instituteInitials}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-foreground">
                  {institute?.tenantName || "Institute Profile"}
                </h1>
                <Badge variant="success" className="text-[10px] uppercase">
                  Active
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Platform health, storage, revenue & AI usage for your institute
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                  <UserCircle className="h-3.5 w-3.5" />
                  {user?.email}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                  <Building2 className="h-3.5 w-3.5" />
                  {institute?.centerCount ?? 0} center{(institute?.centerCount ?? 0) === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Health {healthScore}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadProfile(true)}
              disabled={refreshing}
              className="gap-2 bg-background/80 backdrop-blur-sm"
            >
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {data?.generatedAt ? (
              <p className="text-[10px] text-muted-foreground">
                Updated {new Date(data.generatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="relative grid grid-cols-2 gap-px border-t border-border/50 bg-border/50 sm:grid-cols-4">
          {[
            { label: "Students", value: formatNumber(overview?.totalStudents ?? 0), icon: Users },
            { label: "Collected", value: revenue?.monthlyCollectionsLabel ?? "₹0", icon: IndianRupee },
            { label: "Conversion", value: `${revenue?.conversionRate ?? 0}%`, icon: TrendingUp },
            { label: "Active Today", value: formatNumber(systemUsage?.dailyActiveUsers ?? 0), icon: Activity },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 bg-card/90 px-4 py-3 backdrop-blur-sm">
              <item.icon className="h-4 w-4 text-primary" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-black text-foreground">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{fetchError}</CardContent>
        </Card>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        {/* Left column — main metrics */}
        <div className="space-y-6 xl:col-span-2">
          {/* Storage */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <SectionHeader
                icon={HardDrive}
                title="Storage & Usage"
                description="Cloud media, database footprint, and AI token consumption"
                accent="sky"
              />
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <UsageMeter
                label="Cloudinary Storage"
                valueLabel={storage?.cloudinary.bytesLabel ?? "0 B"}
                detail={`${formatNumber(storage?.cloudinary.files ?? 0)} files uploaded`}
                percent={cloudinaryPercent}
                icon={Cloud}
                tone="sky"
              />
              <UsageMeter
                label="MongoDB Footprint"
                valueLabel={storage?.mongo.bytesLabel ?? "0 B"}
                detail={`${formatNumber(storage?.mongo.documents ?? 0)} documents estimated`}
                percent={mongoPercent}
                icon={Database}
                tone="violet"
              />
              <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-violet-500/5 p-4 sm:col-span-2 lg:col-span-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">AI Tokens (Lifetime)</p>
                    <p className="text-2xl font-black text-foreground">{formatNumber(ai?.totalTokens ?? 0)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatNumber(ai?.totalRequests ?? 0)} total requests
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Quizzes", "Assignments", "Jobs"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full border border-primary/15 bg-background/70 px-2 py-0.5 text-[10px] font-semibold text-primary"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Institute Overview */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <SectionHeader
                icon={Building2}
                title="Institute Overview"
                description="People, batches, and pipeline at a glance"
                accent="primary"
              />
            </CardHeader>
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
              <StatTile label="Total Students" value={formatNumber(overview?.totalStudents ?? 0)} icon={Users} tone="sky" delay={0.02} />
              <StatTile label="Active Students" value={formatNumber(overview?.activeStudents ?? 0)} icon={CheckCircle2} tone="emerald" delay={0.04} />
              <StatTile label="Total Trainers" value={formatNumber(overview?.totalTrainers ?? 0)} icon={GraduationCap} tone="violet" delay={0.06} />
              <StatTile label="Total BDEs" value={formatNumber(overview?.totalBdes ?? 0)} icon={Briefcase} tone="amber" delay={0.08} />
              <StatTile label="Total Batches" value={formatNumber(overview?.totalBatches ?? 0)} icon={BookOpen} tone="default" delay={0.1} />
              <StatTile label="Total Leads" value={formatNumber(overview?.totalLeads ?? 0)} icon={GitPullRequest} tone="rose" delay={0.12} />
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <SectionHeader
                icon={Wallet}
                title="Revenue"
                description="Collections, dues, and admissions performance"
                accent="emerald"
              />
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-card p-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    This Month&apos;s Collections
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-tight text-foreground">
                    {revenue?.monthlyCollectionsLabel ?? "₹0.00"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {formatNumber(revenue?.newAdmissionsThisMonth ?? 0)} new admissions this month
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <StatTile
                    label="Outstanding Dues"
                    value={revenue?.outstandingDuesLabel ?? "₹0.00"}
                    icon={Wallet}
                    tone="amber"
                  />
                  <StatTile
                    label="Conversion Rate"
                    value={`${revenue?.conversionRate ?? 0}%`}
                    subtext="Lead to admission"
                    icon={TrendingUp}
                    tone="emerald"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right column — system + AI */}
        <div className="space-y-6">
          {/* System Usage */}
          <Card className="overflow-hidden border-border/60">
            <CardHeader className="border-b border-border/40 bg-muted/20 pb-4">
              <SectionHeader
                icon={Zap}
                title="System Usage"
                description="Engagement across LMS, attendance & activity"
                accent="amber"
              />
            </CardHeader>
            <CardContent className="space-y-5 p-4">
              <div className="flex items-center justify-around gap-2 rounded-xl border border-border/50 bg-muted/20 p-4">
                <RingStat
                  label="Attendance"
                  value={systemUsage?.attendancePercentage ?? 0}
                  suffix="%"
                  color="text-emerald-500"
                />
                <RingStat
                  label="Conversion"
                  value={revenue?.conversionRate ?? 0}
                  suffix="%"
                  color="text-primary"
                />
              </div>
              <div className="grid gap-3">
                <StatTile
                  label="Daily Active Users"
                  value={formatNumber(systemUsage?.dailyActiveUsers ?? 0)}
                  subtext="Attendance activity today"
                  icon={Activity}
                  tone="sky"
                />
                <StatTile
                  label="LMS Watch Hours"
                  value={`${systemUsage?.lmsWatchHours ?? 0}h`}
                  subtext="Estimated from video content"
                  icon={MonitorPlay}
                  tone="violet"
                />
                <StatTile
                  label="Assignment Submissions"
                  value={formatNumber(systemUsage?.assignmentSubmissions ?? 0)}
                  icon={FileCheck}
                  tone="emerald"
                />
              </div>
            </CardContent>
          </Card>

          {/* AI Usage — premium panel */}
          <Card className="overflow-hidden border-violet-500/25 bg-gradient-to-br from-violet-500/10 via-card to-primary/5 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                    <Bot className="h-4 w-4" />
                  </div>
                  AI Usage
                </CardTitle>
                <Badge className="bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/20">
                  Gemini
                </Badge>
              </div>
              <CardDescription>Smart content generation for your institute</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border border-violet-500/15 bg-background/60 p-4 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-primary text-white shadow-md shadow-violet-500/20">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground">{ai?.assistantLabel ?? "AI Assistant"}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {ai?.requestsToday
                        ? ai.requestsTodayLabel
                        : "No AI requests today — generate quizzes or assignments to start"}
                    </p>
                  </div>
                  {ai?.requestsToday ? (
                    <Badge variant="success" className="shrink-0 text-[10px]">
                      Live
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/50 bg-card/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Est. Cost</p>
                  <p className="mt-1 text-lg font-black text-foreground">{ai?.estimatedCostLabel ?? "₹0.00"}</p>
                  <p className="text-[10px] text-muted-foreground">Lifetime usage</p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/80 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requests</p>
                  <p className="mt-1 text-lg font-black text-foreground">{formatNumber(ai?.totalRequests ?? 0)}</p>
                  <p className="text-[10px] text-muted-foreground">All time</p>
                </div>
              </div>

              <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  <CircleDot className="h-3 w-3 text-primary" />
                  Most Used By
                </div>
                <p className="mt-2 text-base font-bold text-foreground">{ai?.mostUsedBy ?? institute?.tenantName}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Quiz Generator", "Assignment Writer", "Job Postings"].map((feature) => (
                    <span
                      key={feature}
                      className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-1 text-[10px] font-medium text-muted-foreground"
                    >
                      <CalendarCheck className="h-3 w-3" />
                      {feature}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Center card */}
          {institute && (
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-foreground">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-foreground">{institute.tenantName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {institute.centerNames.join(" · ") || "No centers listed"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] uppercase">
                    {institute.tenantId}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
