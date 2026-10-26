"use client"

import * as React from "react"
import { Plus, CalendarDays, UserRound } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { type EmployeeTask, formatDay, localDateStr } from "@/lib/employeePortal"

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In progress" },
  { key: "completed", label: "Completed" },
] as const

const STATUS_LABELS: Record<EmployeeTask["status"], string> = {
  pending: "Pending",
  in_progress: "In progress",
  completed: "Completed",
}

const PRIORITY_STYLES: Record<EmployeeTask["priority"], "destructive" | "warning" | "secondary"> = {
  high: "destructive",
  medium: "warning",
  low: "secondary",
}

const emptyForm = { title: "", description: "", priority: "medium", dueDate: "" }

export default function EmployeeTasksPage() {
  const [tasks, setTasks] = React.useState<EmployeeTask[]>([])
  const [loading, setLoading] = React.useState(true)
  const [filter, setFilter] = React.useState<(typeof FILTERS)[number]["key"]>("all")
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)

  const load = React.useCallback(async () => {
    try {
      setTasks((await api.getEmployeeTasks()) || [])
    } catch (err) {
      console.error(err)
      setTasks([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (task: EmployeeTask, status: string) => {
    try {
      const updated = await api.updateEmployeeTask(task.id, { status })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)))
    } catch (err) {
      alert((err as Error).message || "Failed to update task")
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.createEmployeeTask({ ...form, dueDate: form.dueDate || undefined })
      setOpen(false)
      setForm(emptyForm)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to add task")
    } finally {
      setSaving(false)
    }
  }

  const today = localDateStr()
  const counts = {
    all: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  }
  const visible = filter === "all" ? tasks : tasks.filter((t) => t.status === filter)

  return (
    <div className="space-y-6">
      <EmployeePageHeader
        title="Daily Task"
        description="Tasks assigned to you and your own to-dos"
        actions={
          <Button size="sm" icon={Plus} onClick={() => setOpen(true)}>
            Add task
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer",
              filter === f.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label} <span className="ml-1 opacity-70">{counts[f.key]}</span>
          </button>
        ))}
      </div>

      <Card className="bg-card">
        <CardContent className="p-4 sm:p-6 space-y-2">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <EmptyState>No tasks here.</EmptyState>
          ) : (
            visible.map((task) => {
              const overdue = task.dueDate && task.status !== "completed" && task.dueDate < today
              return (
                <div
                  key={task.id}
                  className="flex flex-col gap-3 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "text-sm font-semibold text-foreground",
                          task.status === "completed" && "line-through text-muted-foreground"
                        )}
                      >
                        {task.title}
                      </p>
                      <Badge variant={PRIORITY_STYLES[task.priority]} className="text-[10px] capitalize">
                        {task.priority}
                      </Badge>
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                      {task.dueDate && (
                        <span className={cn("flex items-center gap-1", overdue && "font-semibold text-rose-600")}>
                          <CalendarDays className="h-3 w-3" />
                          {overdue ? "Overdue · " : "Due "}
                          {formatDay(task.dueDate)}
                        </span>
                      )}
                      {task.assignedByName && (
                        <span className="flex items-center gap-1">
                          <UserRound className="h-3 w-3" />
                          {task.assignedByName === "Self" ? "Added by you" : `Assigned by ${task.assignedByName}`}
                        </span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={task.status}
                    onChange={(e) => updateStatus(task, e.target.value)}
                    className="h-8 w-full text-xs sm:w-36"
                  >
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Add task">
        <form onSubmit={submit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Title</label>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs focus-visible:outline-hidden focus-visible:border-ring"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Priority</label>
              <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="h-9 text-xs">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Due date</label>
              <Input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Add task
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
