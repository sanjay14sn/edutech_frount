"use client"

import * as React from "react"
import { Search, RefreshCw, LogOut, Save, Pencil, Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"
import { useStore } from "@/store/useStore"

type HREmployee = {
  id: string
  employeeCode: string
  name: string
  email?: string
  phone?: string
  department: string
  designation: string
  branch: string
  employmentType: string
  joiningDate: string
  reportingManager?: string
  status: "active" | "exited"
  baseSalary: number
  sourceType: string
  exitDate?: string
  exitReason?: string
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

function formatDateDMY(dateStr?: string) {
  if (!dateStr) return "—"
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`
  }
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const dd = String(d.getDate()).padStart(2, "0")
    const mm = String(d.getMonth() + 1).padStart(2, "0")
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  } catch {
    return dateStr
  }
}

export default function HREmployeesPage() {
  const { addNotification } = useStore()
  const [employees, setEmployees] = React.useState<HREmployee[]>([])
  const [loading, setLoading] = React.useState(true)
  const [q, setQ] = React.useState("")
  const [selected, setSelected] = React.useState<HREmployee | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)
  const [exitOpen, setExitOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    department: "",
    designation: "",
    branch: "",
    employmentType: "Full-Time",
    reportingManager: "",
    baseSalary: "",
    phone: "",
  })
  const [exitReason, setExitReason] = React.useState("")

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getHREmployees()
      setEmployees(data || [])
    } catch (err) {
      console.error(err)
      setEmployees([])
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const filtered = employees.filter((e) => {
    const s = q.toLowerCase()
    if (!s) return true
    return (
      e.name.toLowerCase().includes(s) ||
      e.employeeCode.toLowerCase().includes(s) ||
      e.department.toLowerCase().includes(s) ||
      e.designation.toLowerCase().includes(s)
    )
  })

  const openEdit = (emp: HREmployee) => {
    setSelected(emp)
    setForm({
      department: emp.department,
      designation: emp.designation,
      branch: emp.branch,
      employmentType: emp.employmentType,
      reportingManager: emp.reportingManager || "",
      baseSalary: String(emp.baseSalary || 0),
      phone: emp.phone || "",
    })
    setEditOpen(true)
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    await api.updateHREmployee(selected.id, {
      ...form,
      baseSalary: Number(form.baseSalary) || 0,
    })
    addNotification({ title: "Employee updated", description: selected.name, type: "system" })
    setEditOpen(false)
    await load()
  }

  const confirmExit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected) return
    await api.exitHREmployee(selected.id, { exitReason: exitReason || "Resigned" })
    addNotification({ title: "Exit processed", description: selected.name, type: "system" })
    setExitOpen(false)
    await load()
  }

  const activeCount = employees.filter((e) => e.status === "active").length

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-base font-bold tracking-tight text-foreground">Employees</h2>
          <p className="text-xs text-muted-foreground">
            Synced from Trainers & BDEs · {activeCount} active · {employees.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, code…"
              className="h-9 pl-8 text-xs w-56"
            />
          </div>
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={load}>
            Sync
          </Button>
        </div>
      </div>

      <Card className="bg-card overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-border/50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-4 animate-pulse">
                  <div className="h-10 w-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-40 rounded bg-muted" />
                    <div className="h-2.5 w-56 rounded bg-muted" />
                  </div>
                  <div className="h-8 w-24 rounded-lg bg-muted" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <div className="rounded-full bg-muted/70 p-3 text-muted-foreground">
                <Users className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-foreground">No employees found</p>
              <p className="text-xs text-muted-foreground">Try syncing or clear the search.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {filtered.map((emp) => (
                <li
                  key={emp.id}
                  className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] lg:items-center hover:bg-muted/15 transition-colors"
                >
                  {/* Identity */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        emp.status === "active"
                          ? "bg-sky-500/15 text-sky-700 dark:text-sky-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {initials(emp.name) || "?"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{emp.name}</p>
                        <span className="font-mono text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                          {emp.employeeCode}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {emp.email || "No email"}
                        {emp.phone ? ` · ${emp.phone}` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Role meta */}
                  <div className="min-w-0 space-y-1.5 lg:pl-2">
                    <p className="truncate text-xs font-medium text-foreground">
                      {emp.designation || "—"}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] font-medium px-2 py-0">
                        {emp.department || "No dept"}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0 capitalize">
                        {emp.sourceType}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{emp.employmentType}</span>
                    </div>
                  </div>

                  {/* Status + pay */}
                  <div className="flex items-center gap-4 sm:gap-6">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Status
                      </p>
                      <Badge variant={emp.status === "active" ? "success" : "secondary"}>
                        {emp.status}
                      </Badge>
                    </div>
                    <div className="space-y-0.5 min-w-[5.5rem]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Joined
                      </p>
                      <p className="text-xs font-medium text-foreground tabular-nums">
                        {formatDateDMY(emp.joiningDate)}
                      </p>
                    </div>
                    <div className="space-y-0.5 min-w-[5.5rem]">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                        Base
                      </p>
                      <p className="text-xs font-semibold text-foreground tabular-nums">
                        {formatCurrency(emp.baseSalary)}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 lg:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs"
                      icon={Pencil}
                      onClick={() => openEdit(emp)}
                    >
                      Edit
                    </Button>
                    {emp.status === "active" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/5"
                        icon={LogOut}
                        onClick={() => {
                          setSelected(emp)
                          setExitReason("")
                          setExitOpen(true)
                        }}
                      >
                        Exit
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit employee profile" description={selected?.name}>
        <form onSubmit={saveEdit} className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Department</label>
              <Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Designation</label>
              <Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Branch</label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Employment type</label>
              <Select value={form.employmentType} onChange={(e) => setForm({ ...form, employmentType: e.target.value })} className="h-8 text-xs">
                <option>Full-Time</option>
                <option>Part-Time</option>
                <option>Contract</option>
                <option>Intern</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Reporting manager</label>
              <Input value={form.reportingManager} onChange={(e) => setForm({ ...form, reportingManager: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Base salary</label>
              <Input type="number" value={form.baseSalary} onChange={(e) => setForm({ ...form, baseSalary: e.target.value })} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" icon={Save}>Save</Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={exitOpen} onClose={() => setExitOpen(false)} title="Exit management" description={selected?.name}>
        <form onSubmit={confirmExit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Exit reason</label>
            <Input value={exitReason} onChange={(e) => setExitReason(e.target.value)} placeholder="Resigned / Terminated / …" className="h-8 text-xs" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setExitOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white">
              Confirm exit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
