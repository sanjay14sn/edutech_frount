export type ShiftStatus = "offline" | "active" | "paused" | "finished"

export interface ShiftRecord {
  shiftStatus?: ShiftStatus
  loginAt?: string | null
  logoutAt?: string | null
  pausedAt?: string | null
  totalPausedSeconds?: number
  loginTime?: string
  logoutTime?: string
  workedSeconds?: number
}

export function deriveShiftStatus(record: ShiftRecord | null | undefined): ShiftStatus {
  if (!record) return "offline"
  if (record.shiftStatus) return record.shiftStatus
  if (record.logoutAt || record.logoutTime) return "finished"
  if (record.pausedAt) return "paused"
  if (record.loginAt || record.loginTime) return "active"
  return "offline"
}

export function computeWorkedSeconds(record: ShiftRecord | null | undefined): number {
  if (!record?.loginAt) return record?.workedSeconds ?? 0

  const login = new Date(record.loginAt).getTime()
  const end = record.logoutAt ? new Date(record.logoutAt).getTime() : Date.now()
  let paused = record.totalPausedSeconds ?? 0

  if (record.shiftStatus === "paused" && record.pausedAt && !record.logoutAt) {
    paused += Math.floor((Date.now() - new Date(record.pausedAt).getTime()) / 1000)
  }

  return Math.max(0, Math.floor((end - login) / 1000) - paused)
}

export function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":")
}

export function shiftStatusLabel(status: ShiftStatus): string {
  switch (status) {
    case "active":
      return "Checked In (Active)"
    case "paused":
      return "On Break"
    case "finished":
      return "Shift Ended"
    default:
      return "Offline"
  }
}
