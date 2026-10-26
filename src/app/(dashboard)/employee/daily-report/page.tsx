"use client"

import * as React from "react"
import { Send, CheckCircle2, ClipboardList, History, Clock } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { type DailyReport, formatDay, localDateStr } from "@/lib/employeePortal"

const emptyForm = { tasksCompleted: "", tasksInProgress: "", blockers: "", planForTomorrow: "", hoursWorked: "" }

const FIELDS = [
  { key: "tasksCompleted", label: "Tasks Completed Today", placeholder: "List all tasks you completed today...", required: true },
  { key: "tasksInProgress", label: "Tasks In Progress", placeholder: "Tasks that are still ongoing...", required: false },
  { key: "blockers", label: "Blockers / Issues", placeholder: "Any blockers or issues faced...", required: false },
  { key: "planForTomorrow", label: "Tomorrow's Plan", placeholder: "What do you plan to work on tomorrow...", required: false },
] as const

function longDate(date: string) {
  const [y, m, d] = date.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-xs font-semibold text-foreground">
      {children}
      {required && <span className="ml-0.5 text-rose-500">*</span>}
    </label>
  )
}

function ReportSection({ label, value }: { label: string; value?: string }) {
  if (!value) return null
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="whitespace-pre-wrap text-xs text-foreground">{value}</p>
    </div>
  )
}

export default function EmployeeDailyReportPage() {
  const today = localDateStr()
  const [tab, setTab] = React.useState<"today" | "history">("today")
  const [reports, setReports] = React.useState<DailyReport[]>([])
  const [form, setForm] = React.useState(emptyForm)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    try {
      const rows: DailyReport[] = (await api.getEmployeeDailyReports()) || []
      setReports(rows)
      const todays = rows.find((r) => r.date === today)
      if (todays) {
        setForm({
          tasksCompleted: todays.tasksCompleted || todays.summary || "",
          tasksInProgress: todays.tasksInProgress || "",
          blockers: todays.blockers || "",
          planForTomorrow: todays.planForTomorrow || "",
          hoursWorked: todays.hoursWorked != null ? String(todays.hoursWorked) : "",
        })
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [today])

  React.useEffect(() => {
    void load()
  }, [load])

  const todaysReport = reports.find((r) => r.date === today)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.submitEmployeeDailyReport({
        date: today,
        tasksCompleted: form.tasksCompleted,
        tasksInProgress: form.tasksInProgress,
        blockers: form.blockers,
        planForTomorrow: form.planForTomorrow,
        hoursWorked: Number(form.hoursWorked),
      })
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to submit report")
    } finally {
      setSaving(false)
    }
  }

  const tabs = [
    { id: "today", label: "Today's Report", icon: ClipboardList },
    { id: "history", label: "Report History", icon: History, count: reports.length },
  ] as const

  return (
    <div className="space-y-6">
      <EmployeePageHeader title="Daily Work Report" description="Submit and track your daily work reports" />

      <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
            {"count" in t && t.count > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "today" ? (
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-base font-semibold">
              <span>Daily Work Update</span>
              {todaysReport && (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Submitted
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">{longDate(today)}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                {FIELDS.map((f) => (
                  <div key={f.key} className="space-y-1.5">
                    <FieldLabel required={f.required}>{f.label}</FieldLabel>
                    <textarea
                      rows={f.required ? 4 : 3}
                      required={f.required}
                      placeholder={f.placeholder}
                      value={form[f.key]}
                      onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs focus-visible:border-ring focus-visible:outline-hidden"
                    />
                  </div>
                ))}
                <div className="space-y-1.5">
                  <FieldLabel required>Hours Worked</FieldLabel>
                  <Input
                    type="number"
                    required
                    min={0}
                    max={24}
                    step={0.5}
                    placeholder="e.g. 8"
                    value={form.hoursWorked}
                    onChange={(e) => setForm({ ...form, hoursWorked: e.target.value })}
                    className="h-9 max-w-[160px] text-xs"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-border/40 pt-4">
                  <p className="text-[11px] text-muted-foreground">
                    {todaysReport ? "You can update today's report until the day ends." : "Submit before you clock out."}
                  </p>
                  <Button type="submit" size="sm" icon={Send} isLoading={saving}>
                    {todaysReport ? "Update Report" : "Submit Report"}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : loading ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
      ) : reports.length === 0 ? (
        <EmptyState>You haven&apos;t submitted any reports yet.</EmptyState>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id} className="bg-card">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{formatDay(r.date)}</span>
                    {r.date === today && <Badge variant="info">Today</Badge>}
                  </div>
                  {r.hoursWorked != null && (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" /> {r.hoursWorked} hrs
                    </span>
                  )}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ReportSection label="Tasks Completed" value={r.tasksCompleted || r.summary} />
                  <ReportSection label="In Progress" value={r.tasksInProgress} />
                  <ReportSection label="Blockers / Issues" value={r.blockers} />
                  <ReportSection label="Tomorrow's Plan" value={r.planForTomorrow} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
