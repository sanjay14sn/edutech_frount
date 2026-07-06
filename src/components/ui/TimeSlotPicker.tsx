"use client"

import * as React from "react"
import { Clock, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

export type TimeSlot = { start: string; end: string }

function formatTime12h(time24: string) {
  if (!time24) return ""
  const [h, m] = time24.split(":").map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return time24
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`
}

export function parseTimeSlotsFromStrings(slots: string[] = []): TimeSlot[] {
  if (!slots.length) return [{ start: "10:00", end: "12:00" }]
  return slots.map((slot) => {
    const range = slot.match(/(\d{1,2}:\d{2})\s*(?:AM|PM)?\s*[-–to]+\s*(\d{1,2}:\d{2})\s*(?:AM|PM)?/i)
    if (range) {
      return { start: normalizeTime(range[1]), end: normalizeTime(range[2]) }
    }
    const parts = slot.split(/[-–]/).map((p) => p.trim())
    if (parts.length >= 2) {
      return { start: normalizeTime(parts[0]), end: normalizeTime(parts[1]) }
    }
    return { start: "10:00", end: "12:00" }
  })
}

function normalizeTime(raw: string) {
  const t = raw.trim()
  const match12 = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (match12) {
    let h = parseInt(match12[1], 10)
    const m = match12[2]
    const pm = match12[3].toUpperCase() === "PM"
    if (pm && h !== 12) h += 12
    if (!pm && h === 12) h = 0
    return `${String(h).padStart(2, "0")}:${m}`
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/)
  if (match24) {
    return `${String(parseInt(match24[1], 10)).padStart(2, "0")}:${match24[2]}`
  }
  return "10:00"
}

export function timeSlotsToStrings(slots: TimeSlot[]) {
  return slots
    .filter((s) => s.start && s.end)
    .map((s) => `${formatTime12h(s.start)} - ${formatTime12h(s.end)}`)
}

export interface TimeSlotPickerProps {
  value: TimeSlot[]
  onChange: (slots: TimeSlot[]) => void
  disabled?: boolean
  className?: string
}

export function TimeSlotPicker({ value, onChange, disabled, className }: TimeSlotPickerProps) {
  const addSlot = () => {
    onChange([...value, { start: "14:00", end: "16:00" }])
  }

  const removeSlot = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const updateSlot = (index: number, field: "start" | "end", val: string) => {
    onChange(value.map((slot, i) => (i === index ? { ...slot, [field]: val } : slot)))
  }

  return (
    <div className={cn("space-y-2", className)}>
      {value.map((slot, index) => (
        <div key={index} className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="time"
            disabled={disabled}
            value={slot.start}
            onChange={(e) => updateSlot(index, "start", e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-card px-2 text-xs focus-visible:outline-hidden focus-visible:border-ring disabled:opacity-50"
          />
          <span className="text-[10px] font-semibold text-muted-foreground">to</span>
          <input
            type="time"
            disabled={disabled}
            value={slot.end}
            onChange={(e) => updateSlot(index, "end", e.target.value)}
            className="h-9 flex-1 rounded-lg border border-border bg-card px-2 text-xs focus-visible:outline-hidden focus-visible:border-ring disabled:opacity-50"
          />
          {value.length > 1 && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => removeSlot(index)}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        disabled={disabled}
        onClick={addSlot}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
      >
        <Plus className="h-3 w-3" />
        Add time slot
      </button>
    </div>
  )
}
