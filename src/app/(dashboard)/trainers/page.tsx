"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Plus, Search, Mail, Phone, Star, Award, Trash2, Settings, MessageSquare } from "lucide-react"
import { Card, CardHeader, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { enrichTrainersWithStats } from "@/lib/trainerStats"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice } from "@/components/shared/CapacityLimitNotice"

export default function TrainersPage() {
  const router = useRouter()
  const { addNotification } = useStore()
  const { policy, atCapacity } = useCenterPolicy()
  const trainersAtCapacity = atCapacity("trainers")
  const [trainers, setTrainers] = React.useState<any[]>([])
  const [pageLoading, setPageLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [feedbackLoading, setFeedbackLoading] = React.useState(false)
  const [feedbackTrainer, setFeedbackTrainer] = React.useState<any>(null)
  const [feedbackData, setFeedbackData] = React.useState<{
    summary: { total: number; submitted: number; skipped: number; averageRating: number | null }
    feedback: Array<{
      id: string
      studentName: string
      sessionTopic: string
      sessionDate: string
      rating?: number
      comment?: string
      skipped?: boolean
      createdAt?: string
    }>
  } | null>(null)

  const handleSeeFeedback = async (trainer: any) => {
    setFeedbackTrainer(trainer)
    setFeedbackOpen(true)
    setFeedbackLoading(true)
    setFeedbackData(null)
    try {
      const data = await api.getTrainerSessionFeedback(trainer.id)
      setFeedbackData(data)
    } catch (err: any) {
      addNotification({
        title: "Could not load feedback",
        description: err.message || "Failed to fetch session feedback.",
        type: "system",
      })
    } finally {
      setFeedbackLoading(false)
    }
  }

  const formatFeedbackDate = (value?: string) => {
    if (!value) return "—"
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? value.substring(0, 10) : d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  React.useEffect(() => {
    const loadTrainers = async () => {
      try {
        setPageLoading(true)
        await useStore.getState().fetchCenterPolicy()
        const [trainerData, batchData] = await Promise.all([
          api.getTrainers(),
          api.getBatches().catch(() => []),
        ])
        setTrainers(enrichTrainersWithStats(trainerData, batchData))
      } catch (err) {
        console.error("Failed to load trainers:", err)
      } finally {
        setPageLoading(false)
      }
    }
    loadTrainers()
  }, [])

  const filteredTrainers = trainers.filter((t) =>
    (t.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.skills || t.specialization || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.trainerId || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleDeleteTrainer = async (id: string) => {
    if (!confirm("Are you sure you want to remove this trainer?")) return
    try {
      await api.deleteTrainer(id)
      setTrainers(prev => prev.filter(t => t.id !== id))
      addNotification({
        title: "Trainer Removed",
        description: "Trainer record has been deleted successfully.",
        type: "admissions"
      })
    } catch (err: any) {
      console.error("Failed to delete trainer:", err)
      addNotification({
        title: "Action Failed",
        description: err.message || "Failed to delete trainer.",
        type: "system"
      })
    }
  }

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    switch (s) {
      case "active":
      case "available":
        return <Badge variant="success">Active</Badge>
      case "busy":
        return <Badge variant="warning">Busy</Badge>
      case "inactive":
        return <Badge variant="secondary">Inactive</Badge>
      case "on_leave":
        return <Badge variant="destructive">On Leave</Badge>
      default:
        return <Badge variant="secondary">{status || "Active"}</Badge>
    }
  }

  const getEmploymentBadge = (type: string) => {
    const t = type || "Full Time";
    if (t === "Full Time") return <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-primary/10 text-primary">Full-Time</span>
    if (t === "Part Time") return <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-cyan-500/10 text-cyan-400">Part-Time</span>
    return <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-400">{t}</span>
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <p className="text-xs text-muted-foreground">Loading trainer faculty ledger...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-primary" />
            <span>Trainer Faculty Ledger</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your faculty members, specialized courses, schedules, and quality rating insights.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          disabled={trainersAtCapacity}
          onClick={() => router.push("/trainers/new")}
        >
          Register Trainer
        </Button>
      </div>

      {trainersAtCapacity && policy && (
        <CapacityLimitNotice resource="trainers" policy={policy} />
      )}

      {/* Search Bar */}
      <div className="flex bg-card p-4 rounded-xl border border-border">
        <div className="relative w-full max-w-sm">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search trainer ID, name, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      {/* Trainers Grid */}
      {filteredTrainers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-xl">
          No trainers registered yet.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTrainers.map((trainer) => (
            <Card key={trainer.id} className="bg-card flex flex-col justify-between group relative">
              <CardHeader
                className="pb-3 pr-10 cursor-pointer rounded-t-xl transition-colors hover:bg-muted/20"
                onClick={() => router.push(`/trainers/${trainer.id}`)}
                title="View trainer profile"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs group-hover:ring-2 group-hover:ring-primary/20 transition-all">
                      {trainer.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                          {trainer.name}
                        </h3>
                        {getEmploymentBadge(trainer.employmentType)}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono font-medium block">
                        {trainer.trainerId || "TRN-Legacy"}
                      </span>
                    </div>
                  </div>
                  {getStatusBadge(trainer.status)}
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-muted-foreground/70" /> {trainer.email}</p>
                  <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-muted-foreground/70" /> {trainer.phone}</p>
                  <p className="flex items-center gap-1.5">
                    <Award className="h-3.5 w-3.5 text-muted-foreground/70" /> 
                    <span className="truncate max-w-[240px]">
                      {trainer.skills || trainer.specialization} ({trainer.experience || 0} yrs exp)
                    </span>
                  </p>
                  {trainer.trainingMode && (
                    <p className="flex items-center gap-1.5">
                      <Settings className="h-3.5 w-3.5 text-muted-foreground/70" />
                      <span>Mode: {trainer.trainingMode}</span>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-2.5 border-t border-border/40">
                  <div className="p-2 bg-secondary rounded-lg">
                    <p className="font-bold text-foreground">{trainer.activeBatches || 0}</p>
                    <p className="text-[9px]">Batches</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <p className="font-bold text-foreground">{trainer.hoursThisWeek ?? 0}h</p>
                    <p className="text-[9px]">Hours/Wk</p>
                  </div>
                  <div className="p-2 bg-secondary rounded-lg">
                    <p className="font-bold text-foreground flex items-center justify-center gap-0.5">
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      <span>{trainer.rating != null ? Number(trainer.rating).toFixed(1) : "—"}</span>
                    </p>
                    <p className="text-[9px]">Rating</p>
                  </div>
                </div>

                {/* Edit and Delete actions in the card container */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/40 mt-1 flex-wrap">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleSeeFeedback(trainer);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-600 hover:text-amber-500 transition-colors cursor-pointer"
                    title="See Feedback"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>See Feedback</span>
                  </button>
                  <span className="text-border/60 text-[10px]">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/trainers/new?edit=${trainer.id}`);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    title="Edit Profile"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    <span>Edit Profile</span>
                  </button>
                  <span className="text-border/60 text-[10px]">|</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTrainer(trainer.id);
                    }}
                    className="flex items-center gap-1 text-[11px] font-bold text-destructive hover:text-destructive/80 transition-colors cursor-pointer"
                    title="Delete Trainer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Remove</span>
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        isOpen={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false)
          setFeedbackTrainer(null)
          setFeedbackData(null)
        }}
        title={feedbackTrainer ? `Session Feedback — ${feedbackTrainer.name}` : "Session Feedback"}
        description="Student ratings and comments collected after class sessions."
        className="max-w-2xl"
      >
        {feedbackLoading ? (
          <div className="flex justify-center py-10">
            <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : feedbackData ? (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
                <p className="font-bold text-foreground text-sm">{feedbackData.summary.total}</p>
                <p className="text-[10px] text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
                <p className="font-bold text-foreground text-sm">{feedbackData.summary.submitted}</p>
                <p className="text-[10px] text-muted-foreground">Rated</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
                <p className="font-bold text-foreground text-sm">{feedbackData.summary.skipped}</p>
                <p className="text-[10px] text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-2.5 text-center">
                <p className="font-bold text-foreground text-sm flex items-center justify-center gap-1">
                  {feedbackData.summary.averageRating != null ? (
                    <>
                      <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                      {feedbackData.summary.averageRating.toFixed(1)}
                    </>
                  ) : (
                    "—"
                  )}
                </p>
                <p className="text-[10px] text-muted-foreground">Avg Rating</p>
              </div>
            </div>

            {feedbackData.feedback.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                No session feedback yet. Students will see a rating popup after classes end.
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1">
                {feedbackData.feedback.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border/60 bg-card p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-foreground">{item.studentName}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sessionTopic}</p>
                      </div>
                      {item.skipped ? (
                        <Badge variant="secondary" className="text-[9px]">Skipped</Badge>
                      ) : (
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= (item.rating || 0)
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    {item.comment ? (
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{item.comment}</p>
                    ) : null}
                    <p className="text-[10px] text-muted-foreground">{formatFeedbackDate(item.sessionDate)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Unable to load feedback.</div>
        )}
      </Dialog>
    </div>
  )
}

