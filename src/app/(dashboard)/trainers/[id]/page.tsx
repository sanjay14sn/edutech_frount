"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  GraduationCap,
  Mail,
  Phone,
  Award,
  Star,
  Briefcase,
  Clock,
  IndianRupee,
  Calendar,
  FileText,
  Settings,
  MessageSquare,
  BookOpen,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import { enrichTrainersWithStats } from "@/lib/trainerStats"

function maskAccountNumber(value?: string) {
  if (!value) return "—"
  const trimmed = value.trim()
  if (trimmed.length <= 4) return "****"
  return `****${trimmed.slice(-4)}`
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4 py-2 border-b border-border/30 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground shrink-0">{label}</span>
      <span className="text-xs text-foreground sm:text-right">{value || "—"}</span>
    </div>
  )
}

export default function TrainerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const trainerId = String(params.id || "")
  const { addNotification } = useStore()

  const [trainer, setTrainer] = React.useState<any>(null)
  const [assignedBatches, setAssignedBatches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  const [feedbackOpen, setFeedbackOpen] = React.useState(false)
  const [feedbackLoading, setFeedbackLoading] = React.useState(false)
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

  React.useEffect(() => {
    const load = async () => {
      if (!trainerId) return
      setLoading(true)
      try {
        const [trainerData, batchData] = await Promise.all([
          api.getTrainerById(trainerId),
          api.getBatches().catch(() => []),
        ])
        const [enriched] = enrichTrainersWithStats([trainerData], batchData)
        setTrainer(enriched)

        const trainerName = (trainerData.name || "").trim().toLowerCase()
        const batches = (batchData || []).filter(
          (batch: any) => (batch.trainerName || "").trim().toLowerCase() === trainerName
        )
        setAssignedBatches(batches)
      } catch (error) {
        console.error("Failed to load trainer profile:", error)
        setTrainer(null)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [trainerId])

  const handleSeeFeedback = async () => {
    if (!trainer) return
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
    return Number.isNaN(d.getTime())
      ? value.substring(0, 10)
      : d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
  }

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase()
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

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <span>Loading trainer profile...</span>
        </div>
      </div>
    )
  }

  if (!trainer) {
    return (
      <div className="space-y-4">
        <Link href="/trainers">
          <Button variant="ghost" size="sm" icon={ArrowLeft}>
            Back to Trainer Ledger
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Trainer profile not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/trainers">
            <Button variant="ghost" size="sm" icon={ArrowLeft} className="mb-2 h-8 px-2">
              Trainer Faculty Ledger
            </Button>
          </Link>
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {(trainer.name || "TR").substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 flex-wrap">
                <GraduationCap className="h-5 w-5 text-primary" />
                {trainer.name}
                {getStatusBadge(trainer.status)}
              </h1>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {trainer.trainerId || "TRN-Legacy"} • {trainer.employmentType || "Full Time"}
              </p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" />
                  {trainer.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {trainer.phone}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={MessageSquare} onClick={() => void handleSeeFeedback()}>
            See Feedback
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Settings}
            onClick={() => router.push(`/trainers/new?edit=${trainer.id}`)}
          >
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Active Batches</p>
            <p className="text-2xl font-bold text-foreground mt-1">{trainer.activeBatches || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Hours / Week</p>
            <p className="text-2xl font-bold text-foreground mt-1">{trainer.hoursThisWeek ?? 0}h</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Session Rating</p>
            <p className="text-2xl font-bold text-foreground mt-1 flex items-center justify-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              {trainer.rating != null ? Number(trainer.rating).toFixed(1) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-primary" />
              Employment
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="Employment Type" value={trainer.employmentType} />
            <DetailRow
              label="Joining Date"
              value={trainer.joiningDate ? formatDate(trainer.joiningDate) : "—"}
            />
            <DetailRow label="Status" value={trainer.status || "Active"} />
            <DetailRow
              label="Portal Access"
              value={trainer.createAccount ? "Account enabled" : "No login account"}
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Professional
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="Skills / Specialization" value={trainer.skills || trainer.specialization} />
            <DetailRow
              label="Experience"
              value={trainer.experience != null ? `${trainer.experience} years` : "—"}
            />
            <DetailRow label="Highest Qualification" value={trainer.highestQualification} />
            <DetailRow label="Certifications" value={trainer.certifications} />
            <DetailRow label="Technology / Subject" value={trainer.technologySubject} />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Training Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="Training Mode" value={trainer.trainingMode} />
            <DetailRow
              label="Available Days"
              value={
                trainer.availableDays?.length
                  ? trainer.availableDays.join(", ")
                  : "—"
              }
            />
            <DetailRow
              label="Time Slots"
              value={
                trainer.availableTimeSlots?.length
                  ? trainer.availableTimeSlots.join(" • ")
                  : "—"
              }
            />
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <IndianRupee className="h-4 w-4 text-primary" />
              Payment & Banking
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="Payment Model" value={trainer.paymentModel} />
            <DetailRow
              label="Rate / Salary"
              value={
                trainer.salaryRateAmount != null
                  ? formatCurrency(Number(trainer.salaryRateAmount))
                  : "—"
              }
            />
            <DetailRow label="Account Holder" value={trainer.bankHolderName} />
            <DetailRow label="Account Number" value={maskAccountNumber(trainer.bankAccountNumber)} />
            <DetailRow label="IFSC Code" value={trainer.ifscCode} />
            <DetailRow label="UPI ID" value={trainer.upiId} />
            <DetailRow label="PAN Number" value={trainer.panNumber} />
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Assigned Batches
          </CardTitle>
          <CardDescription>
            {assignedBatches.length} batch{assignedBatches.length === 1 ? "" : "es"} linked to this trainer.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {assignedBatches.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
              No batches assigned yet.
            </div>
          ) : (
            <div className="space-y-2">
              {assignedBatches.map((batch) => (
                <div
                  key={batch.id || batch._id}
                  className="rounded-lg border border-border/60 bg-muted/10 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground">{batch.name || batch.batchName}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {batch.courseName || batch.course || "Course"} • {batch.schedule || "No schedule"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{batch.studentsCount ?? batch.studentCount ?? 0} students</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {(trainer.resumeFileName || trainer.idProofFileName || trainer.certificationsFileName) && (
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DetailRow label="Resume" value={trainer.resumeFileName} />
            <DetailRow label="ID Proof" value={trainer.idProofFileName} />
            <DetailRow label="Certifications" value={trainer.certificationsFileName} />
          </CardContent>
        </Card>
      )}

      <Dialog
        isOpen={feedbackOpen}
        onClose={() => {
          setFeedbackOpen(false)
          setFeedbackData(null)
        }}
        title={`Session Feedback — ${trainer.name}`}
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
                No session feedback yet.
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
