"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { 
  BookOpen, Plus, Save, Clock, CheckSquare, Trash2, 
  Search, Filter, CheckCircle2, AlertCircle, FileText, UserPlus
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { useStore, BDETask, BDE } from "@/store/useStore"
import { formatDate } from "@/lib/utils"

export default function TasksPage() {
  const { bdeTasks, bdes, addBdeTask, updateBdeTask, deleteBdeTask, addNotification, user } = useStore()

  // Selected state
  const currentBdeId = user?.id || "bde-1"
  const isOwner = user?.role === "owner" || user?.role === "super_admin"

  // Filter tasks based on role
  const visibleTasks = React.useMemo(() => {
    if (isOwner) return bdeTasks
    return bdeTasks.filter(t => t.bdeId === currentBdeId)
  }, [bdeTasks, isOwner, currentBdeId])

  // Search & Filter State
  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")

  // Add Task Modal State (Accessible to owner/superadmin or BDE self-tasking)
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  // Form States
  const [taskTitle, setTaskTitle] = React.useState("")
  const [taskDesc, setTaskDesc] = React.useState("")
  const [taskBdeId, setTaskBdeId] = React.useState(currentBdeId)
  const [taskDueDate, setTaskDueDate] = React.useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0] // default +1 day
  )

  const filteredTasks = visibleTasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || t.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Handle task status toggle
  const handleToggleTask = (taskId: string, currentStatus: BDETask["status"]) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed"
    updateBdeTask(taskId, nextStatus)
    addNotification({
      title: "Task Status Updated",
      description: `Task status changed to ${nextStatus}.`,
      type: "system"
    })
  }

  // Handle Submit Form
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle || !taskDesc) {
      alert("Please fill all required fields.")
      return
    }

    const newTaskItem: BDETask = {
      id: `tsk-${Date.now()}`,
      bdeId: taskBdeId,
      title: taskTitle,
      description: taskDesc,
      status: "pending",
      dueDate: taskDueDate
    }

    addBdeTask(newTaskItem)
    setIsAddOpen(false)

    // Reset Form
    setTaskTitle("")
    setTaskDesc("")
    setTaskDueDate(new Date(Date.now() + 86400000).toISOString().split("T")[0])

    addNotification({
      title: "New BDE Task Assigned",
      description: `Task '${taskTitle}' was successfully created.`,
      type: "system"
    })
  }

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-primary" />
            <span>Tasks & Schedules Planner</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Log representative targets progress milestones, schedule follow-up rosters, and mark completed jobs.
          </p>
        </div>
        <Button 
          variant="primary" 
          size="sm" 
          icon={Plus} 
          onClick={() => setIsAddOpen(true)}
        >
          Add Task
        </Button>
      </div>

      {/* Filter Controls Bar */}
      <div className="grid gap-3 sm:grid-cols-3 bg-card p-4 rounded-xl border border-border">
        <div className="relative">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search task title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8.5 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8.5 text-xs bg-card">
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="delayed">Delayed</option>
          </Select>
        </div>
      </div>

      {/* Task Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTasks.length === 0 ? (
          <div className="md:col-span-3 text-center py-12 bg-card rounded-2xl border border-border text-muted-foreground italic text-xs">
            No active schedules found matching your parameters.
          </div>
        ) : (
          filteredTasks.map((task) => {
            const assignedBde = bdes.find(b => b.id === task.bdeId)
            
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow space-y-3 relative overflow-hidden"
              >
                {task.status === "completed" && (
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xs pointer-events-none" />
                )}
                
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.status === "completed"}
                      onChange={() => handleToggleTask(task.id, task.status)}
                      className="mt-1 h-4 w-4 rounded-sm border-border text-primary cursor-pointer"
                    />
                    <div className="space-y-1">
                      <h3 className={`font-bold text-xs ${
                        task.status === "completed" ? "line-through text-muted-foreground font-semibold" : "text-foreground"
                      }`}>
                        {task.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <div className="space-y-0.5">
                    {isOwner && assignedBde && (
                      <span className="text-[9px] text-primary font-bold block">
                        Assigned To: {assignedBde.name}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground block">
                      Due: <span className="font-semibold text-foreground">{formatDate(task.dueDate)}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Badge variant={
                      task.status === "completed" ? "success" : task.status === "delayed" ? "destructive" : "warning"
                    } className="text-[9px] uppercase font-bold">
                      {task.status}
                    </Badge>
                    {isOwner && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-6 w-6 text-red-500 hover:bg-red-500/10 border-none"
                        onClick={() => deleteBdeTask(task.id)}
                        title="Delete Task"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Add Task Dialog Modal */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Schedule & Assign Target Task"
        description="Configure target description and select BDE assignee."
      >
        <form onSubmit={handleAddTask} className="space-y-4 pt-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Task Title *</label>
            <Input
              placeholder="Calling list follow-up"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              className="bg-card text-xs h-9.5"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Task Description *</label>
            <textarea
              placeholder="Call remaining 15 leads on Chicago Fullstack batch roster..."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              rows={3}
              className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus-visible:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Assignee BDE *</label>
              <Select
                value={taskBdeId}
                onChange={(e) => setTaskBdeId(e.target.value)}
                className="bg-card text-xs h-9.5"
              >
                {bdes.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Due Date *</label>
              <Input
                type="date"
                value={taskDueDate}
                onChange={(e) => setTaskDueDate(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={Save}>
              Save Task
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
