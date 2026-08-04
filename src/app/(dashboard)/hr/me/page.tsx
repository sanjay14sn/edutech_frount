"use client"

import * as React from "react"
import { RefreshCw, Download, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/store/useStore"

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

export default function HRSelfServicePage() {
  const { addNotification } = useStore()
  const [data, setData] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [leaveOpen, setLeaveOpen] = React.useState(false)
  const [claimOpen, setClaimOpen] = React.useState(false)
  const [leaveForm, setLeaveForm] = React.useState({
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  })
  const [claimForm, setClaimForm] = React.useState({
    title: "",
    amount: "",
    category: "Travel",
  })

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const me = await api.getHRMe()
      setData(me)
    } catch (err) {
      console.error(err)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  const applyLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.employee) return
    try {
      await api.createHRLeaveRequest({
        employeeId: data.employee.id,
        employeeName: data.employee.name,
        ...leaveForm,
      })
      addNotification({ title: "Leave applied", description: "Pending manager approval", type: "system" })
      setLeaveOpen(false)
      await load()
    } catch (err: any) {
      alert(err.message || "Failed")
    }
  }

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.employee) return
    await api.createHRClaim({
      employeeId: data.employee.id,
      employeeName: data.employee.name,
      title: claimForm.title,
      amount: Number(claimForm.amount) || 0,
      category: claimForm.category,
      status: "Pending Approval",
      date: new Date().toISOString().slice(0, 10),
    })
    addNotification({ title: "Expense submitted", description: claimForm.title, type: "fees" })
    setClaimOpen(false)
    await load()
  }

  if (loading) {
    return <p className="text-xs text-muted-foreground py-10 text-center">Loading self-service…</p>
  }

  if (!data?.employee) {
    return (
      <Card className="bg-card">
        <CardContent className="py-10 text-center text-xs text-muted-foreground">
          No HR profile is linked to your login. Ask an admin to sync employees from Trainers/BDEs.
        </CardContent>
      </Card>
    )
  }

  const emp = data.employee

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-sm font-extrabold">Employee Self-Service</h2>
          <p className="text-[11px] text-muted-foreground">Profile, leave, payslips, expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
            Refresh
          </Button>
          <Button size="sm" className="h-8 text-xs" onClick={() => setLeaveOpen(true)}>
            Apply leave
          </Button>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => setClaimOpen(true)}>
            Submit expense
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">{emp.name}</CardTitle>
            <CardDescription>
              {emp.employeeCode} · {emp.designation} · {emp.department}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs space-y-1 text-muted-foreground">
            <p>Joined: <span className="text-foreground">{formatDateDMY(emp.joiningDate)}</span></p>
            <p>Branch: <span className="text-foreground">{emp.branch}</span></p>
            <p>Type: <span className="text-foreground">{emp.employmentType}</span></p>
            <p>Manager: <span className="text-foreground">{emp.reportingManager}</span></p>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">Leave balance</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="font-bold text-foreground">{data.leaveBalance?.casual ?? 0}</p>
              <p className="text-muted-foreground">Casual</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="font-bold text-foreground">{data.leaveBalance?.sick ?? 0}</p>
              <p className="text-muted-foreground">Sick</p>
            </div>
            <div className="rounded-lg bg-muted/30 p-2">
              <p className="font-bold text-foreground">{data.leaveBalance?.earned ?? 0}</p>
              <p className="text-muted-foreground">Earned</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-2">
            <p className="text-muted-foreground">View history below for payslips, claims, and documents.</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-extrabold">Salary history / payslips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          {(data.payroll || []).length === 0 ? (
            <p className="text-muted-foreground py-4 text-center">No payroll records yet</p>
          ) : (
            data.payroll.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
                <div>
                  <p className="font-semibold">{p.month}</p>
                  <p className="text-muted-foreground">{formatCurrency(p.netPayout)}</p>
                </div>
                <Badge>{p.status}</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">My leave requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {(data.leaveRequests || []).map((r: any) => (
              <div key={r.id} className="flex justify-between gap-2 border-b border-border/30 pb-2">
                <span>
                  {r.leaveType} · {r.startDate} → {r.endDate}
                </span>
                <Badge variant="outline">{r.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">My expenses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {(data.claims || []).map((c: any) => (
              <div key={c.id} className="flex justify-between gap-2 border-b border-border/30 pb-2">
                <span>
                  {c.title} · {formatCurrency(c.amount)}
                </span>
                <Badge variant="outline">{c.status}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog isOpen={leaveOpen} onClose={() => setLeaveOpen(false)} title="Apply leave">
        <form onSubmit={applyLeave} className="space-y-3 text-xs">
          <Select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} className="h-8 text-xs">
            <option value="casual">Casual</option>
            <option value="sick">Sick</option>
            <option value="earned">Earned</option>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" required value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} className="h-8 text-xs" />
            <Input type="date" required value={leaveForm.endDate} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} className="h-8 text-xs" />
          </div>
          <Input placeholder="Reason" value={leaveForm.reason} onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })} className="h-8 text-xs" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLeaveOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Submit</Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={claimOpen} onClose={() => setClaimOpen(false)} title="Submit expense">
        <form onSubmit={submitClaim} className="space-y-3 text-xs">
          <Input required placeholder="Title" value={claimForm.title} onChange={(e) => setClaimForm({ ...claimForm, title: e.target.value })} className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={claimForm.category} onChange={(e) => setClaimForm({ ...claimForm, category: e.target.value })} className="h-8 text-xs">
              <option>Travel</option>
              <option>Food</option>
              <option>Fuel</option>
              <option>Office</option>
              <option>Others</option>
            </Select>
            <Input required type="number" placeholder="Amount" value={claimForm.amount} onChange={(e) => setClaimForm({ ...claimForm, amount: e.target.value })} className="h-8 text-xs" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setClaimOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm">Submit</Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
