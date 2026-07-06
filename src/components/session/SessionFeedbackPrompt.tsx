"use client"

import * as React from "react"
import { Star } from "lucide-react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

type PendingSession = {
  batchId: string
  batchCode?: string
  sessionDate: string
  sessionTopic: string
  trainerName?: string
  sessionLabel?: string
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (rating: number) => void
}) {
  const [hover, setHover] = React.useState(0)

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (hover || value)
        return (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            className="p-1 rounded-md transition-colors hover:bg-muted/40"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => onChange(star)}
          >
            <Star
              className={`h-7 w-7 ${active ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}`}
            />
          </button>
        )
      })}
    </div>
  )
}

export function SessionFeedbackPrompt() {
  const { user, addNotification } = useStore()
  const [pending, setPending] = React.useState<PendingSession | null>(null)
  const [open, setOpen] = React.useState(false)
  const [rating, setRating] = React.useState(0)
  const [comment, setComment] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const checkPending = React.useCallback(async () => {
    if (user?.role !== "student") return
    try {
      const result = await api.getPendingSessionFeedback()
      if (result?.pending) {
        setPending((current) => current || result.pending)
        setOpen(true)
      }
    } catch {
      // Ignore polling errors
    }
  }, [user?.role])

  React.useEffect(() => {
    if (user?.role !== "student") return

    void checkPending()
    const interval = window.setInterval(() => {
      void checkPending()
    }, 30000)

    return () => window.clearInterval(interval)
  }, [user?.role, checkPending])

  const closeAndClear = () => {
    setOpen(false)
    setPending(null)
    setRating(0)
    setComment("")
  }

  const handleSkip = async () => {
    if (!pending || submitting) return
    setSubmitting(true)
    try {
      await api.submitSessionFeedback({
        batchId: pending.batchId,
        sessionDate: pending.sessionDate,
        sessionTopic: pending.sessionTopic,
        trainerName: pending.trainerName,
        skipped: true,
      })
      closeAndClear()
    } catch (err: unknown) {
      addNotification({
        title: "Could not skip feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "system",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async () => {
    if (!pending || submitting) return
    if (rating < 1) {
      addNotification({
        title: "Rating required",
        description: "Please select a star rating before submitting.",
        type: "system",
      })
      return
    }

    setSubmitting(true)
    try {
      await api.submitSessionFeedback({
        batchId: pending.batchId,
        sessionDate: pending.sessionDate,
        sessionTopic: pending.sessionTopic,
        trainerName: pending.trainerName,
        rating,
        comment: comment.trim(),
        skipped: false,
      })
      addNotification({
        title: "Feedback submitted",
        description: "Thank you for rating today's session.",
        type: "system",
      })
      closeAndClear()
    } catch (err: unknown) {
      addNotification({
        title: "Could not submit feedback",
        description: err instanceof Error ? err.message : "Please try again.",
        type: "system",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (user?.role !== "student" || !pending) return null

  return (
    <Dialog
      isOpen={open}
      onClose={() => {}}
      dismissible={false}
      title="How was today's class?"
      description="Your session has ended. Share a quick rating to help us improve."
      className="max-w-md"
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 space-y-1">
          <p className="font-semibold text-foreground">{pending.sessionTopic}</p>
          <p className="text-xs text-muted-foreground">
            {pending.batchCode ? `${pending.batchCode} · ` : ""}
            {pending.sessionLabel || pending.sessionDate}
          </p>
          {pending.trainerName ? (
            <p className="text-xs text-muted-foreground">Trainer: {pending.trainerName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Star rating</p>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div className="space-y-2">
          <label htmlFor="session-feedback-comment" className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Comments (optional)
          </label>
          <textarea
            id="session-feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="What went well? What could be better?"
            rows={4}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs resize-none focus:outline-hidden focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
          <Button variant="outline" size="sm" onClick={() => void handleSkip()} disabled={submitting}>
            Skip
          </Button>
          <Button variant="primary" size="sm" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? "Saving…" : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
