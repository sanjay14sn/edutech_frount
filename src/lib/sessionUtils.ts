export type BatchSession = { topic?: string; date?: string; endDate?: string }

const DEFAULT_SESSION_MS = 60 * 60 * 1000

function localLedgerDate(referenceTime = new Date()): string {
  const y = referenceTime.getFullYear()
  const m = String(referenceTime.getMonth() + 1).padStart(2, "0")
  const d = String(referenceTime.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function parseSessionDateTime(value?: string): Date | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function toLedgerDate(value?: string): string | null {
  if (!value) return null
  return value.substring(0, 10)
}

export function toDateTimeLocalValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const min = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${m}-${d}T${h}:${min}`
}

export function getSessionEndTime(
  session: BatchSession,
  defaultDurationMs = DEFAULT_SESSION_MS
): Date | null {
  const start = parseSessionDateTime(session.date)
  if (!start) return null

  if (session.endDate) {
    const end = parseSessionDateTime(session.endDate)
    if (end && end > start) return end
  }

  return new Date(start.getTime() + defaultDurationMs)
}

export function getSessionsForLedgerDate(batch: any, ledgerDate: string): BatchSession[] {
  if (!batch || !ledgerDate) return []

  if (batch.sessions?.length) {
    return batch.sessions
      .filter((s: BatchSession) => s?.date && toLedgerDate(s.date) === ledgerDate)
      .sort((a: BatchSession, b: BatchSession) => {
        const aStart = parseSessionDateTime(a.date)?.getTime() ?? 0
        const bStart = parseSessionDateTime(b.date)?.getTime() ?? 0
        return aStart - bStart
      })
  }

  if (batch.nextSessionDate && toLedgerDate(batch.nextSessionDate) === ledgerDate) {
    return [{
      topic: batch.nextSessionTopic || "Scheduled Class Session",
      date: batch.nextSessionDate,
      endDate: batch.nextSessionEndDate,
    }]
  }

  return []
}

export function formatSessionTimeRange(session: BatchSession): string {
  const start = parseSessionDateTime(session.date)
  const end = getSessionEndTime(session)
  if (!start) return ""

  const sameDay =
    end &&
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate()

  const datePart = start.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  const startTime = start.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })

  if (!end) return `${datePart}, ${startTime}`

  const endTime = end.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
  if (sameDay) {
    return `${datePart}, ${startTime} – ${endTime}`
  }

  const endDatePart = end.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
  return `${datePart}, ${startTime} – ${endDatePart}, ${endTime}`
}

export type SessionRollCallStatus = "in_progress" | "upcoming" | "completed"

export function getSessionStatus(
  session: BatchSession,
  ledgerDate: string,
  referenceTime = new Date()
): SessionRollCallStatus | null {
  const today = localLedgerDate(referenceTime)
  if (ledgerDate !== today) return null

  const start = parseSessionDateTime(session.date)
  const end = getSessionEndTime(session)
  if (!start || !end) return null

  if (referenceTime.getTime() < start.getTime()) return "upcoming"
  if (referenceTime.getTime() > end.getTime()) return "completed"
  return "in_progress"
}

export function resolveRollCallSession(
  sessions: BatchSession[],
  ledgerDate: string,
  referenceTime = new Date()
): { session: BatchSession | null; status: SessionRollCallStatus | null; index: number } {
  if (!sessions.length) {
    return { session: null, status: null, index: -1 }
  }

  const today = localLedgerDate(referenceTime)
  const isToday = ledgerDate === today

  if (!isToday) {
    return { session: sessions[0], status: null, index: 0 }
  }

  // Use the most recently started session whose start is <= now (current time slot).
  // This avoids an earlier long session (e.g. 10:00–23:00) blocking a later slot (11:20–12:06).
  let currentIndex = -1
  let currentSession: BatchSession | null = null
  let latestStart = -1

  for (let i = 0; i < sessions.length; i++) {
    const start = parseSessionDateTime(sessions[i].date)
    if (!start) continue
    const startMs = start.getTime()
    if (startMs <= referenceTime.getTime() && startMs >= latestStart) {
      latestStart = startMs
      currentSession = sessions[i]
      currentIndex = i
    }
  }

  if (currentSession && currentIndex >= 0) {
    const end = getSessionEndTime(currentSession)
    const status: SessionRollCallStatus =
      end && referenceTime.getTime() <= end.getTime() ? "in_progress" : "completed"
    return { session: currentSession, status, index: currentIndex }
  }

  for (let i = 0; i < sessions.length; i++) {
    const start = parseSessionDateTime(sessions[i].date)
    if (start && start.getTime() > referenceTime.getTime()) {
      return { session: sessions[i], status: "upcoming", index: i }
    }
  }

  const lastIndex = sessions.length - 1
  return { session: sessions[lastIndex], status: "completed", index: lastIndex }
}

/** True when attendance roll call should be shown (live class in progress or upcoming today). */
export function isRollCallOpen(
  sessions: BatchSession[],
  ledgerDate: string,
  referenceTime = new Date()
): boolean {
  const today = localLedgerDate(referenceTime)
  // Past/future ledger dates: allow manual roll call entry
  if (ledgerDate !== today) return true

  if (!sessions.length) return false

  const resolved = resolveRollCallSession(sessions, ledgerDate, referenceTime)
  if (resolved.status === "in_progress" || resolved.status === "upcoming") {
    return true
  }

  const hasUpcomingToday = sessions.some((s) => {
    const start = parseSessionDateTime(s.date)
    return start && start.getTime() > referenceTime.getTime()
  })

  return hasUpcomingToday
}

export function getBatchRollCallPriority(
  batch: any,
  ledgerDate: string,
  referenceTime = new Date()
): number {
  const sessions = getSessionsForLedgerDate(batch, ledgerDate)
  if (!sessions.length) return 0

  const resolved = resolveRollCallSession(sessions, ledgerDate, referenceTime)
  if (resolved.status === "in_progress") return 300
  if (resolved.status === "upcoming") return 200
  if (resolved.status === "completed") return 100
  return 50
}

export function findBestRollCallTarget(
  batches: any[],
  referenceTime = new Date()
): { batch: any; ledgerDate: string; status: SessionRollCallStatus } | null {
  const today = localLedgerDate(referenceTime)
  let best: {
    batch: any
    ledgerDate: string
    status: SessionRollCallStatus
    score: number
  } | null = null

  for (const batch of batches) {
    const sessions = getSessionsForLedgerDate(batch, today)
    if (!sessions.length) continue

    const resolved = resolveRollCallSession(sessions, today, referenceTime)
    if (!resolved.status) continue

    const score =
      resolved.status === "in_progress" ? 300 :
      resolved.status === "upcoming" ? 200 : 100

    if (!best || score > best.score) {
      best = { batch, ledgerDate: today, status: resolved.status, score }
    }
  }

  return best ? { batch: best.batch, ledgerDate: best.ledgerDate, status: best.status } : null
}

export function sortSessionsForRollCallDisplay(
  sessions: BatchSession[],
  ledgerDate: string,
  referenceTime = new Date()
): BatchSession[] {
  const statusRank: Record<string, number> = {
    in_progress: 0,
    upcoming: 1,
    completed: 2,
  }

  return [...sessions].sort((a, b) => {
    const aStatus = getSessionStatus(a, ledgerDate, referenceTime)
    const bStatus = getSessionStatus(b, ledgerDate, referenceTime)
    const aRank = aStatus ? statusRank[aStatus] : 3
    const bRank = bStatus ? statusRank[bStatus] : 3
    if (aRank !== bRank) return aRank - bRank

    const aStart = parseSessionDateTime(a.date)?.getTime() ?? 0
    const bStart = parseSessionDateTime(b.date)?.getTime() ?? 0
    return aStart - bStart
  })
}

export function defaultSessionEndFromStart(startValue: string, durationMs = DEFAULT_SESSION_MS): string {
  const start = parseSessionDateTime(startValue)
  if (!start) return ""
  return toDateTimeLocalValue(new Date(start.getTime() + durationMs))
}
