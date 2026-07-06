"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FilePlus,
  Sparkles,
  Star,
  BookOpen,
  UserMinus,
  Video,
  MessageSquare,
} from "lucide-react"
import { KPICard } from "./KPICard"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

interface ClassSchedule {
  id: string
  batchId: string
  time: string
  batchName: string
  topic: string
  studentsCount: number
  attendanceStatus: "marked" | "pending"
  sessionStatus?: "in_progress" | "upcoming"
  meetLink?: string
  platform?: string
}

interface WatchlistItem {
  studentName: string
  batchLabel: string
}

interface TrainerMetrics {
  activeBatches: number
  totalStudents: number
  dailyHours: number
  scheduledClasses: number
  liveClasses?: number
  averageRating: number
  feedbackCount: number
}

export function TrainerDashboard() {
  const router = useRouter()
  const { user } = useStore()
  const [isLoading, setIsLoading] = React.useState(true)
  const [profileName, setProfileName] = React.useState(user?.name || "Trainer")
  const [metrics, setMetrics] = React.useState<TrainerMetrics | null>(null)
  const [schedules, setSchedules] = React.useState<ClassSchedule[]>([])
  const [watchlist, setWatchlist] = React.useState<WatchlistItem[]>([])

  React.useEffect(() => {
    let cancelled = false

    const loadDashboard = async (silent = false) => {
      if (!silent) setIsLoading(true)
      try {
        const data = await api.getDashboardMetrics()
        if (cancelled) return
        setProfileName(data.profile?.name || user?.name || "Trainer")
        setMetrics(data.metrics || null)
        setSchedules(data.schedules || [])
        setWatchlist(data.watchlist || [])
      } catch (err) {
        console.error("Failed to load trainer dashboard:", err)
      } finally {
        if (!cancelled && !silent) setIsLoading(false)
      }
    }

    void loadDashboard()
    const interval = window.setInterval(() => {
      void loadDashboard(true)
    }, 30000)

    return () => {
      cancelled = true
      window.clearInterval(interval)
    }
  }, [user?.name])

  const liveClassCount = React.useMemo(
    () => schedules.filter((schedule) => schedule.sessionStatus === "in_progress").length,
    [schedules]
  )

  const handleRecordAttendance = (batchId: string) => {
    router.push(`/attendance?batch=${encodeURIComponent(batchId)}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Loading trainer dashboard...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Trainer Dashboard</span>
            <Badge variant="outline" className="text-purple-500 border-purple-500/20 bg-purple-500/5">
              {profileName}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your daily batch schedule, attendance logs, and student performance metrics.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/lms/assignments">
            <Button variant="outline" size="sm" icon={FilePlus}>
              Assignments
            </Button>
          </Link>
          <Link href="/remarks">
            <Button variant="outline" size="sm" icon={MessageSquare}>
              Remarks
            </Button>
          </Link>
          <Link href="/courses">
            <Button variant="primary" size="sm" icon={Calendar}>
              My Batches
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KPICard
          title="Supervised Batches"
          value={`${metrics?.activeBatches ?? 0} Batch${(metrics?.activeBatches ?? 0) === 1 ? "" : "es"}`}
          subtext={`${metrics?.totalStudents ?? 0} students total`}
          icon={BookOpen}
          delay={0.05}
        />
        <KPICard
          title="Daily Lecture Hours"
          value={`${metrics?.dailyHours ?? 0} hrs`}
          subtext={
            liveClassCount > 0
              ? `${liveClassCount} live now • ${metrics?.scheduledClasses ?? 0} class${(metrics?.scheduledClasses ?? 0) === 1 ? "" : "es"} today`
              : `${metrics?.scheduledClasses ?? 0} upcoming class${(metrics?.scheduledClasses ?? 0) === 1 ? "" : "es"}`
          }
          icon={Clock}
          delay={0.1}
        />
        <KPICard
          title="Avg Student Rating"
          value={`${metrics?.averageRating ?? 5}/5`}
          subtext={`Based on ${metrics?.feedbackCount ?? 0} review${(metrics?.feedbackCount ?? 0) === 1 ? "" : "s"}`}
          icon={Star}
          delay={0.15}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>Live & Upcoming Schedule</span>
              {liveClassCount > 0 && (
                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 animate-pulse">
                  {liveClassCount} Live
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Live classes and upcoming sessions for today. The list refreshes automatically while a class is in progress.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {schedules.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/80 py-10 text-center text-xs text-muted-foreground">
                No live or upcoming classes scheduled right now.
              </div>
            ) : (
              schedules.map((schedule) => {
                const isLive = schedule.sessionStatus === "in_progress"

                return (
                <div
                  key={schedule.id}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all bg-card/50 gap-4",
                    isLive
                      ? "border-emerald-500/40 bg-emerald-500/5 shadow-sm"
                      : "border-border/80 hover:border-border"
                  )}
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {isLive && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Live Now
                        </span>
                      )}
                      <span
                        className={cn(
                          "text-xs font-semibold px-2.5 py-0.5 rounded-sm",
                          isLive
                            ? "text-emerald-700 bg-emerald-500/15"
                            : "text-primary/95 bg-secondary"
                        )}
                      >
                        {schedule.time}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({schedule.studentsCount} Students)
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground">{schedule.batchName}</h4>
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Clock className="h-3 w-3 shrink-0" />
                      <span>Topic: {schedule.topic}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {schedule.meetLink && (
                      <a
                        href={schedule.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-zinc-300 font-semibold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:text-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Video className="h-4 w-4 text-emerald-400 shrink-0 animate-pulse" />
                        <span className="hidden sm:inline">Join Class</span>
                      </a>
                    )}

                    {schedule.attendanceStatus === "marked" ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Attendance Logged</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecordAttendance(schedule.batchId)}
                        icon={Calendar}
                        className="border-primary/20 text-primary hover:bg-primary/5"
                      >
                        Record Attendance
                      </Button>
                    )}
                  </div>
                </div>
                )
              })
            )}
          </CardContent>
        </Card>

        <Card className="bg-card flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Attendance Watchlist</span>
              </CardTitle>
              <CardDescription>Students absent for last 2 sessions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5">
              {watchlist.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/80 py-8 text-center text-xs text-muted-foreground">
                  No at-risk students right now.
                </div>
              ) : (
                watchlist.map((item) => (
                  <div key={`${item.studentName}-${item.batchLabel}`} className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/10 text-red-500 text-xs font-bold shrink-0">
                      <UserMinus className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">{item.studentName}</p>
                      <p className="text-[10px] text-muted-foreground">{item.batchLabel}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </div>

          <div className="p-6 pt-0">
            <div className="rounded-lg bg-muted/65 p-3 text-[10px] text-muted-foreground leading-normal flex items-start gap-2">
              <Sparkles className="h-3.5 w-3.5 text-purple-500 shrink-0 mt-0.5" />
              <span>
                Tip: Trigger automated push notifications to parents/students directly from the Attendance page.
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
