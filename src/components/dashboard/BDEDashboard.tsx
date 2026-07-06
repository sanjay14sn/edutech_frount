"use client"
import * as React from "react"
import {
  GitPullRequest, Calendar, Phone, MessageSquare, CheckSquare, Target,
  TrendingUp, Award, Clock, Pause, Play, LogOut, RotateCcw, PiggyBank,
  Users, Sparkles, Trophy, ChevronRight, Wallet
} from "lucide-react"
import { useStore, Lead, BDETask, FollowUp } from "@/store/useStore"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"
import {
  computeWorkedSeconds,
  deriveShiftStatus,
  formatDuration,
  shiftStatusLabel,
  type ShiftRecord,
  type ShiftStatus,
} from "@/lib/shiftTimer"

interface BDEProfile {
  employeeId: string
  centerName: string
  monthlyTarget: number
  targetType: "revenue" | "leads"
  commissionEnabled?: boolean
  commissionPercentage: number
}

interface BDEMetrics {
  totalAssigned: number
  newLeads: number
  interestedLeads: number
  convertedLeads: number
  contactedLeads: number
  conversionRate: number
  activeCrm: number
}

interface BDETargets {
  achievedCount: number
  targetCount: number
  targetPercent: number
  remaining: number
  revenue: number
  incentive: number
  bonusAmount: number
}

interface BDERecovery {
  totalRecovery: number
  totalFeeTarget: number
  totalOutstanding: number
}

interface BDEAttendanceRecord extends ShiftRecord {
  date: string
}

function useLiveShiftTimer(attendance: BDEAttendanceRecord | null) {
  const [elapsed, setElapsed] = React.useState(0)

  React.useEffect(() => {
    const tick = () => setElapsed(computeWorkedSeconds(attendance))
    tick()

    const status = deriveShiftStatus(attendance)
    if (status === "finished" || status === "offline") return

    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [attendance])

  return elapsed
}

export function BDEDashboard() {
  const { user, setLeads, setBdeTasks, activeTenant } = useStore()

  const [loading, setLoading] = React.useState(true)
  const [profile, setProfile] = React.useState<BDEProfile | null>(null)
  const [metrics, setMetrics] = React.useState<BDEMetrics | null>(null)
  const [targets, setTargets] = React.useState<BDETargets | null>(null)
  const [recovery, setRecovery] = React.useState<BDERecovery | null>(null)
  const [myLeads, setMyLeads] = React.useState<Lead[]>([])
  const [myTasks, setMyTasks] = React.useState<BDETask[]>([])
  const [myFollowups, setMyFollowups] = React.useState<FollowUp[]>([])
  const [attendance, setAttendance] = React.useState<BDEAttendanceRecord | null>(null)
  const [punchLoading, setPunchLoading] = React.useState(false)

  const shiftStatus: ShiftStatus = deriveShiftStatus(attendance)
  const elapsedSeconds = useLiveShiftTimer(attendance)
  const isFinished = shiftStatus === "finished"
  const isActive = shiftStatus === "active"
  const isPaused = shiftStatus === "paused"
  const isOffline = shiftStatus === "offline"

  const currentBdeName = user?.name || "BDE"

  const loadDashboard = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getDashboardMetrics()

      if (data.profile) setProfile(data.profile)
      if (data.metrics) setMetrics(data.metrics)
      if (data.targets) setTargets(data.targets)
      setRecovery(
        data.recovery ?? {
          totalRecovery: 0,
          totalFeeTarget: 0,
          totalOutstanding: 0,
        }
      )
      if (data.attendance !== undefined) setAttendance(data.attendance)

      const leads = (data.myLeads || []) as Lead[]
      const tasks = (data.myTasks || []) as BDETask[]
      const followups = (data.followUps || []) as FollowUp[]

      setMyLeads(leads)
      setMyTasks(tasks)
      setMyFollowups(followups)
      setLeads(leads)
      setBdeTasks(tasks)
    } catch (err) {
      console.error("Error fetching BDE dashboard data", err)
    } finally {
      setLoading(false)
    }
  }, [setLeads, setBdeTasks])

  React.useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handleShiftAction = async (action: "login" | "pause" | "resume" | "logout") => {
    if (punchLoading || (isFinished && action !== "login")) return
    try {
      setPunchLoading(true)
      const record = await api.punchBdeAttendance(action)
      setAttendance({
        date: record.date,
        shiftStatus: record.shiftStatus,
        loginTime: record.loginTime,
        logoutTime: record.logoutTime,
        loginAt: record.loginAt,
        logoutAt: record.logoutAt,
        pausedAt: record.pausedAt,
        totalPausedSeconds: record.totalPausedSeconds,
        workedSeconds: record.workedSeconds,
      })
    } catch (err) {
      console.error("Failed to update shift", err)
    } finally {
      setPunchLoading(false)
    }
  }
  const handleResetShift = async () => {
    if (punchLoading) return
    try {
      setPunchLoading(true)
      await api.resetBdeShift()
      setAttendance(null)
    } catch (err) {
      console.error("Failed to reset shift", err)
    } finally {
      setPunchLoading(false)
    }
  }

  const handleToggleTask = async (taskId: string, currentStatus: BDETask["status"]) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed"
    try {
      await api.updateTaskStatus(taskId, nextStatus)
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
      )
    } catch (err) {
      console.error("Failed to update task", err)
    }
  }

  const triggerWhatsApp = (phone: string, name: string) => {
    const text = encodeURIComponent(
      `Hello ${name}, this is ${currentBdeName} from ${activeTenant?.name || "our institute"}. Hope you are doing well!`
    )
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank")
  }

  if (loading && !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Loading dashboard...
      </div>
    )
  }

  const totalAssigned = metrics?.totalAssigned ?? 0
  const newLeads = metrics?.newLeads ?? 0
  const interestedLeads = metrics?.interestedLeads ?? 0
  const convertedLeads = metrics?.convertedLeads ?? 0
  const contactedLeads = metrics?.contactedLeads ?? 0
  const conversionRate = metrics?.conversionRate ?? 0
  const activeCrm = metrics?.activeCrm ?? 0

  const funnelPct = (count: number) =>
    totalAssigned > 0 ? Math.round((count / totalAssigned) * 100) : 0

  const stageRate = (from: number, to: number) =>
    from > 0 ? Math.round((to / from) * 100) : 0

  const funnelStages = [
    {
      label: "Total Leads",
      count: totalAssigned,
      pct: totalAssigned > 0 ? 100 : 0,
      hint: "Pipeline volume",
      icon: Users,
      barClass: "bg-primary",
      trackClass: "bg-primary/15",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: "Contacted",
      count: contactedLeads,
      pct: funnelPct(contactedLeads),
      hint: `${stageRate(totalAssigned, contactedLeads)}% of total`,
      icon: Phone,
      barClass: "bg-sky-500",
      trackClass: "bg-sky-500/15",
      iconClass: "bg-sky-500/10 text-sky-600",
    },
    {
      label: "Interested",
      count: interestedLeads,
      pct: funnelPct(interestedLeads),
      hint: `${stageRate(contactedLeads, interestedLeads)}% from contact`,
      icon: Sparkles,
      barClass: "bg-amber-500",
      trackClass: "bg-amber-500/15",
      iconClass: "bg-amber-500/10 text-amber-600",
    },
    {
      label: "Converted",
      count: convertedLeads,
      pct: funnelPct(convertedLeads),
      hint: `${conversionRate}% conversion`,
      icon: Trophy,
      barClass: "bg-emerald-500",
      trackClass: "bg-emerald-500/15",
      iconClass: "bg-emerald-500/10 text-emerald-600",
    },
  ] as const

  const targetAchieved = targets?.achievedCount ?? 0
  const targetTotal = targets?.targetCount ?? profile?.monthlyTarget ?? 30
  const targetPercent = targets?.targetPercent ?? 0
  const remaining = targets?.remaining ?? Math.max(0, targetTotal - targetAchieved)
  const revenue = targets?.revenue ?? 0
  const incentive = targets?.incentive ?? 0
  const bonusAmount = targets?.bonusAmount ?? 0
  const commissionEnabled = profile?.commissionEnabled ?? false
  const totalRecovery = recovery?.totalRecovery ?? 0
  const totalFeeTarget = recovery?.totalFeeTarget ?? 0
  const totalOutstanding = recovery?.totalOutstanding ?? 0
  const isRevenueTarget = profile?.targetType === "revenue"

  const pendingTasks = myTasks.filter((t) => t.status !== "completed").length
  const recoveryPercent =
    totalFeeTarget > 0 ? Math.min(Math.round((totalRecovery / totalFeeTarget) * 100), 100) : 0

  return (
    <div className="space-y-6">
      {/* ── Hero + Shift ── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-card border border-border p-5 rounded-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Hello, {currentBdeName}
            </h1>
            {targetPercent >= 85 && (
              <Badge variant="success" className="text-[9px] py-0.5 px-2 gap-1 font-bold">
                <Award className="h-3 w-3" />
                Top Performer
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {profile?.employeeId || "—"} · {profile?.centerName || activeTenant?.name || "Main Campus"}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3 bg-muted/30 border border-border/50 rounded-lg px-3 py-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            <div>
              <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider block">
                Shift
              </span>
              <span className="text-lg font-mono font-bold text-foreground tabular-nums leading-none">
                {formatDuration(elapsedSeconds)}
              </span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                {shiftStatusLabel(shiftStatus)}
                {attendance?.loginTime && (
                  <> · {attendance.loginTime}{attendance.logoutTime ? ` – ${attendance.logoutTime}` : ""}</>
                )}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isOffline && (
              <Button variant="primary" size="sm" icon={Clock} disabled={punchLoading} onClick={() => handleShiftAction("login")}>
                {punchLoading ? "Starting..." : "Punch In"}
              </Button>
            )}
            {isActive && (
              <>
                <Button variant="outline" size="sm" icon={Pause} disabled={punchLoading} onClick={() => handleShiftAction("pause")}>Pause</Button>
                <Button variant="destructive" size="sm" icon={LogOut} disabled={punchLoading} onClick={() => handleShiftAction("logout")}>Logout</Button>
              </>
            )}
            {isPaused && (
              <>
                <Button variant="primary" size="sm" icon={Play} disabled={punchLoading} onClick={() => handleShiftAction("resume")}>Resume</Button>
                <Button variant="destructive" size="sm" icon={LogOut} disabled={punchLoading} onClick={() => handleShiftAction("logout")}>Logout</Button>
              </>
            )}
            {isFinished && (
              <Button variant="outline" size="sm" icon={RotateCcw} disabled={punchLoading} onClick={handleResetShift}>
                {punchLoading ? "Resetting..." : "Reset Shift"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Overview KPIs ── */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Overview</p>
        <div
          className={`grid gap-3 grid-cols-2 ${
            commissionEnabled ? "lg:grid-cols-5" : "lg:grid-cols-4"
          }`}
        >
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Assigned</span>
                <GitPullRequest className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-2xl font-black text-foreground">{totalAssigned}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{newLeads} new waiting</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Conversion</span>
                <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              </div>
              <p className="text-2xl font-black text-foreground">{conversionRate}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{convertedLeads} converted</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Month Target</span>
                <Target className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-sm font-black text-foreground leading-tight">
                {isRevenueTarget
                  ? `${formatCurrency(targetAchieved)} / ${formatCurrency(targetTotal)}`
                  : `${targetAchieved} / ${targetTotal}`}
              </p>
              <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${targetPercent}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground">{targetPercent}% · {isRevenueTarget ? formatCurrency(remaining) : remaining} left</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-muted-foreground">Fee Recovery</span>
                <PiggyBank className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="text-sm font-black text-primary leading-tight">
                {formatCurrency(totalRecovery)}
                {totalFeeTarget > 0 && (
                  <span className="text-muted-foreground font-semibold"> / {formatCurrency(totalFeeTarget)}</span>
                )}
              </p>
              {totalFeeTarget > 0 && (
                <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: `${recoveryPercent}%` }} />
                </div>
              )}
              <p className="text-[10px] text-muted-foreground">
                {totalOutstanding > 0 ? `${formatCurrency(totalOutstanding)} pending` : "Fully collected"}
              </p>
            </CardContent>
          </Card>

          {commissionEnabled && (
            <Card className="bg-card col-span-2 lg:col-span-1">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] uppercase font-bold text-muted-foreground">Commission</span>
                  <Award className="h-3.5 w-3.5 text-pink-500" />
                </div>
                <p className="text-2xl font-black text-foreground">{formatCurrency(incentive)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">On {formatCurrency(revenue)} revenue</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Main workspace ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Conversion funnel — compact pipeline */}
          <Card className="bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Conversion Pipeline</CardTitle>
                  <CardDescription className="text-xs">Lead stages from assignment to enrollment</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-[9px] h-5">{activeCrm} active</Badge>
                  <Badge className="text-[9px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                    {conversionRate}% converted
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4 pb-5 space-y-4">
              <div className="flex items-stretch gap-1 overflow-x-auto pb-1">
                {funnelStages.map((stage, index) => {
                  const Icon = stage.icon
                  return (
                    <React.Fragment key={stage.label}>
                      <div className={`flex-1 min-w-[72px] rounded-lg border border-border/50 p-3 text-center ${stage.trackClass}`}>
                        <div className={`mx-auto mb-1.5 h-7 w-7 rounded-md flex items-center justify-center ${stage.iconClass}`}>
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-lg font-black text-foreground tabular-nums">{stage.count}</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase mt-0.5">{stage.label}</p>
                        <p className="text-[10px] font-semibold text-muted-foreground">{stage.pct}%</p>
                      </div>
                      {index < funnelStages.length - 1 && (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/30 self-center shrink-0 hidden sm:block" />
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40">
                <div className="text-center py-2 rounded-lg bg-muted/20">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Contact</p>
                  <p className="text-sm font-black mt-0.5">{stageRate(totalAssigned, contactedLeads)}%</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-muted/20">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Interest</p>
                  <p className="text-sm font-black mt-0.5">{stageRate(contactedLeads, interestedLeads)}%</p>
                </div>
                <div className="text-center py-2 rounded-lg bg-muted/20">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Close</p>
                  <p className="text-sm font-black text-emerald-600 mt-0.5">{stageRate(interestedLeads, convertedLeads)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="bg-card">
            <CardHeader className="pb-3 border-b border-border/40 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-primary" />
                Today&apos;s Tasks
              </CardTitle>
              <Badge variant="outline" className="text-[9px]">{pendingTasks} pending</Badge>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {myTasks.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground text-center">No tasks assigned for today.</p>
                ) : (
                  myTasks.map((task) => (
                    <div key={task.id} className="p-3 flex items-start gap-3 hover:bg-muted/20">
                      <input
                        type="checkbox"
                        checked={task.status === "completed"}
                        onChange={() => handleToggleTask(task.id, task.status)}
                        className="mt-0.5 h-3.5 w-3.5 rounded-sm border-border text-primary cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-bold ${task.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>
                        )}
                      </div>
                      <Badge
                        variant={task.status === "completed" ? "success" : task.status === "delayed" ? "destructive" : "warning"}
                        className="text-[9px] uppercase shrink-0"
                      >
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          {/* Follow-ups */}
          <Card className="bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/60">
                {myFollowups.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground text-center">No scheduled follow-ups.</p>
                ) : (
                  myFollowups.map((f) => {
                    const lead = myLeads.find((l) => l.id === f.leadId)
                    if (!lead) return null
                    return (
                      <div key={f.id} className="p-3 space-y-2 hover:bg-muted/20">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{lead.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{lead.course}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] shrink-0">{formatDate(f.nextFollowupDate)}</Badge>
                        </div>
                        {f.notes && (
                          <p className="text-[10px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/30 line-clamp-2">
                            {f.notes}
                          </p>
                        )}
                        <div className="flex gap-1.5">
                          <Button variant="outline" size="icon" className="h-7 w-7 text-emerald-500 border-emerald-500/20" onClick={() => triggerWhatsApp(lead.phone, lead.name)}>
                            <MessageSquare className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => window.open(`tel:${lead.phone}`, "_self")}>
                            <Phone className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly insights — no duplicate recovery block */}
          <Card className="bg-card">
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                Monthly Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-center">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Revenue</p>
                  <p className="text-sm font-black text-foreground mt-0.5">{formatCurrency(revenue)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/20 border border-border/40 text-center">
                  <p className="text-[9px] uppercase font-bold text-muted-foreground">Active CRM</p>
                  <p className="text-sm font-black text-foreground mt-0.5">{activeCrm}</p>
                </div>
              </div>

              {remaining > 0 && (
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/15 p-3">
                  <p className="text-[9px] font-bold text-amber-600 uppercase flex items-center gap-1">
                    <Award className="h-3 w-3" /> Bonus Target
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    {isRevenueTarget ? (
                      <>Generate {formatCurrency(remaining)} more to unlock a <span className="font-bold text-amber-500">{formatCurrency(bonusAmount)}</span> bonus.</>
                    ) : (
                      <>Convert {remaining} more lead{remaining !== 1 ? "s" : ""} to unlock a <span className="font-bold text-amber-500">{formatCurrency(bonusAmount)}</span> bonus.</>
                    )}
                  </p>
                </div>
              )}

              {remaining === 0 && targetTotal > 0 && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-3">
                  <p className="text-[9px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                    <Award className="h-3 w-3" /> Target Hit
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">Monthly target achieved. Great work!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
