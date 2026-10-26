"use client"

import * as React from "react"
import { CalendarDays, ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { type Holiday, localDateStr } from "@/lib/employeePortal"

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const HOLIDAY_STYLES = {
  reserved: {
    label: "Reserved Holiday",
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  },
  general: {
    label: "General Holiday",
    dot: "bg-emerald-500",
    chip: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  },
} as const

function holidayKind(h: Holiday) {
  return h.optional ? HOLIDAY_STYLES.reserved : HOLIDAY_STYLES.general
}

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  const dt = new Date(y, m - 1, d)
  return {
    day: String(d).padStart(2, "0"),
    month: dt.toLocaleDateString("en-GB", { month: "short" }),
    weekday: dt.toLocaleDateString("en-GB", { weekday: "long" }),
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function CalendarView({
  year,
  month,
  holidays,
  today,
}: {
  year: number
  month: number
  holidays: Holiday[]
  today: string
}) {
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const byDate = React.useMemo(() => {
    const map = new Map<string, Holiday[]>()
    for (const h of holidays) map.set(h.date, [...(map.get(h.date) || []), h])
    return map
  }, [holidays])

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
              (i === 0 || i === 6) && "text-rose-500/80"
            )}
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const date = day ? `${year}-${pad(month + 1)}-${pad(day)}` : ""
          const dayHolidays = day ? byDate.get(date) || [] : []
          const isToday = date === today
          const weekend = i % 7 === 0 || i % 7 === 6
          return (
            <div
              key={i}
              className={cn(
                "min-h-[84px] border-b border-r border-border/40 p-1.5 sm:min-h-[100px] sm:p-2",
                (i + 1) % 7 === 0 && "border-r-0",
                i >= cells.length - 7 && "border-b-0",
                !day && "bg-muted/20",
                dayHolidays.length > 0 && "bg-primary/[0.03]"
              )}
            >
              {day && (
                <>
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                      isToday
                        ? "bg-primary text-primary-foreground font-bold"
                        : weekend
                          ? "text-rose-500/80"
                          : "text-foreground"
                    )}
                  >
                    {day}
                  </span>
                  <div className="mt-1 space-y-1">
                    {dayHolidays.map((h) => (
                      <div
                        key={h.id}
                        title={h.notes ? `${h.name} · ${h.notes}` : h.name}
                        className={cn(
                          "truncate rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-tight sm:text-[11px]",
                          holidayKind(h).chip
                        )}
                      >
                        {h.name}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ListView({ holidays, today }: { holidays: Holiday[]; today: string }) {
  const nextHoliday = holidays.find((h) => h.date >= today)
  return (
    <div className="space-y-2">
      {holidays.map((h) => {
        const p = parts(h.date)
        const past = h.date < today
        const isNext = nextHoliday?.id === h.id
        const kind = holidayKind(h)
        return (
          <div
            key={h.id}
            className={cn(
              "flex items-center gap-4 rounded-lg border p-3",
              isNext ? "border-primary/40 bg-primary/5" : "border-border/50",
              past && "opacity-60"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-muted/50 leading-none">
              <span className="text-base font-bold text-foreground">{p.day}</span>
              <span className="text-[10px] uppercase text-muted-foreground">{p.month}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">{h.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.weekday}
                {h.notes ? ` · ${h.notes}` : ""}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {isNext && (
                <Badge variant="info" className="gap-1">
                  <CalendarDays className="h-3 w-3" /> Next
                </Badge>
              )}
              <span className={cn("rounded border px-2 py-0.5 text-[10px] font-semibold", kind.chip)}>
                {kind.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function EmployeeHolidaysPage() {
  const now = new Date()
  const [view, setView] = React.useState<"calendar" | "list">("calendar")
  const [cursor, setCursor] = React.useState({ year: now.getFullYear(), month: now.getMonth() })
  const [holidays, setHolidays] = React.useState<Holiday[]>([])
  const [loadedYear, setLoadedYear] = React.useState<number | null>(null)

  React.useEffect(() => {
    let cancelled = false
    api
      .getEmployeeHolidays(String(cursor.year))
      .then((rows) => !cancelled && setHolidays(rows || []))
      .catch(() => !cancelled && setHolidays([]))
      .finally(() => !cancelled && setLoadedYear(cursor.year))
    return () => {
      cancelled = true
    }
  }, [cursor.year])

  const loading = loadedYear !== cursor.year
  const today = localDateStr()
  const monthPrefix = `${cursor.year}-${pad(cursor.month + 1)}`
  const monthHolidays = holidays.filter((h) => h.date.startsWith(monthPrefix))
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })

  const shiftMonth = (delta: number) =>
    setCursor(({ year, month }) => {
      const d = new Date(year, month + delta, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  const shiftYear = (delta: number) => setCursor(({ year, month }) => ({ year: year + delta, month }))
  const goToday = () => setCursor({ year: now.getFullYear(), month: now.getMonth() })

  return (
    <div className="space-y-6">
      <EmployeePageHeader
        title="Reserved Holidays"
        description="Company holiday calendar"
        actions={
          <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
            {(
              [
                { id: "calendar", label: "Calendar", icon: LayoutGrid },
                { id: "list", label: "List", icon: List },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setView(opt.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  view === opt.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            ))}
          </div>
        }
      />

      <Card className="bg-card">
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={view === "calendar" ? "Previous month" : "Previous year"}
                onClick={() => (view === "calendar" ? shiftMonth(-1) : shiftYear(-1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="min-w-[140px] text-center text-base font-bold text-foreground">
                {view === "calendar" ? monthLabel : cursor.year}
              </h2>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                aria-label={view === "calendar" ? "Next month" : "Next year"}
                onClick={() => (view === "calendar" ? shiftMonth(1) : shiftYear(1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToday}>
                Today
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {Object.values(HOLIDAY_STYLES).map((s) => (
                <span key={s.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("h-2.5 w-2.5 rounded-full", s.dot)} />
                  {s.label}
                </span>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : view === "calendar" ? (
            <>
              <CalendarView year={cursor.year} month={cursor.month} holidays={holidays} today={today} />
              {monthHolidays.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    This month
                  </p>
                  {monthHolidays.map((h) => {
                    const p = parts(h.date)
                    return (
                      <div key={h.id} className="flex items-center gap-2 text-xs">
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", holidayKind(h).dot)} />
                        <span className="w-24 shrink-0 font-medium text-foreground">
                          {p.day} {p.month}, {p.weekday.slice(0, 3)}
                        </span>
                        <span className="text-foreground">{h.name}</span>
                        <span className="text-muted-foreground">· {holidayKind(h).label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : holidays.length === 0 ? (
            <EmptyState>No holidays have been published for {cursor.year}.</EmptyState>
          ) : (
            <ListView holidays={holidays} today={today} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
