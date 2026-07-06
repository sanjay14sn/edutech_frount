"use client"

import * as React from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function parseIsoDate(value?: string) {
  if (!value) return null
  const [y, m, d] = value.split("-").map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toIsoDate(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function formatDisplayDate(value?: string) {
  const date = parseIsoDate(value)
  if (!date) return ""
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  min?: string
  max?: string
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
  id?: string
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  placeholder = "Select date",
  disabled,
  required,
  className,
  id,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const selected = parseIsoDate(value)
  const [viewMonth, setViewMonth] = React.useState(() => selected?.getMonth() ?? new Date().getMonth())
  const [viewYear, setViewYear] = React.useState(() => selected?.getFullYear() ?? new Date().getFullYear())

  React.useEffect(() => {
    if (selected) {
      setViewMonth(selected.getMonth())
      setViewYear(selected.getFullYear())
    }
  }, [value])

  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  const minDate = parseIsoDate(min)
  const maxDate = parseIsoDate(max)

  const isDisabledDay = (date: Date) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    return false
  }

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const cells: (Date | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(viewYear, viewMonth, d))

  const goMonth = (delta: number) => {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y -= 1 }
    if (m > 11) { m = 0; y += 1 }
    setViewMonth(m)
    setViewYear(y)
  }

  const todayIso = toIsoDate(new Date())

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-2 rounded-lg border border-border bg-card px-3 text-left text-sm transition-colors",
          "hover:border-ring/60 focus-visible:outline-hidden focus-visible:border-ring",
          disabled && "cursor-not-allowed opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{value ? formatDisplayDate(value) : placeholder}</span>
      </button>
      {required && (
        <input
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          value={value}
          required={required}
          onChange={() => {}}
        />
      )}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-[280px] rounded-xl border border-border bg-popover p-3 shadow-lg animate-scale-in">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              className="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-bold text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              className="rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5">
            {WEEKDAYS.map((day) => (
              <div key={day} className="py-1 text-center text-[10px] font-bold text-muted-foreground">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} className="h-8" />
              const iso = toIsoDate(date)
              const isSelected = value === iso
              const isToday = iso === todayIso
              const disabledDay = isDisabledDay(date)
              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabledDay}
                  onClick={() => {
                    onChange(iso)
                    setOpen(false)
                  }}
                  className={cn(
                    "h-8 rounded-md text-xs font-medium transition-colors cursor-pointer",
                    isSelected && "bg-primary text-primary-foreground",
                    !isSelected && isToday && "border border-primary/40 text-primary",
                    !isSelected && !isToday && !disabledDay && "hover:bg-muted text-foreground",
                    disabledDay && "opacity-30 cursor-not-allowed"
                  )}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2">
            <button
              type="button"
              onClick={() => {
                onChange(todayIso)
                setOpen(false)
              }}
              className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[10px] font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
