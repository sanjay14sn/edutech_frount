"use client"

import * as React from "react"
import { RefreshCw, Check, X, ArrowLeft, Pencil, Save } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { Skeleton } from "@/components/ui/Skeleton"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"

export default function HRLeavePage() {
  const { user, addNotification } = useStore()
  const isAdmin = user?.role === "owner" || user?.role === "super_admin"
  const [balances, setBalances] = React.useState<any[]>([])
  const [requests, setRequests] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [applyOpen, setApplyOpen] = React.useState(false)
  const [editBalance, setEditBalance] = React.useState<any>(null)
  const [balanceForm, setBalanceForm] = React.useState({ casual: "0", sick: "0", earned: "0" })
  const [savingBalance, setSavingBalance] = React.useState(false)
  const [form, setForm] = React.useState({
    employeeId: "",
    leaveType: "casual",
    startDate: "",
    endDate: "",
    reason: "",
  })

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const [bal, req] = await Promise.all([api.getHRLeaveBalances(), api.getHRLeaveRequests()])
      setBalances(bal || [])
      setRequests(req || [])
      if (isAdmin) {
        const emps = await api.getHREmployees()
        setEmployees((emps || []).filter((e: any) => e.status === "active"))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [isAdmin])

  React.useEffect(() => {
    void load()
  }, [load])

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault()
    const emp = employees.find((x) => x.id === form.employeeId)
    try {
      await api.createHRLeaveRequest({
        ...form,
        employeeName: emp?.name || user?.name || "Staff",
      })
      addNotification({ title: "Leave request submitted", description: "Pending approval", type: "system" })
      setApplyOpen(false)
      await load()
    } catch (err: any) {
      alert(err.message || "Failed to submit leave")
    }
  }

  const openBalanceEdit = (row: any) => {
    setEditBalance(row)
    setBalanceForm({
      casual: String(row.casual ?? 0),
      sick: String(row.sick ?? 0),
      earned: String(row.earned ?? 0),
    })
  }

  const saveBalance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editBalance) return
    try {
      setSavingBalance(true)
      await api.updateHRLeaveBalance(editBalance.id, {
        casual: Number(balanceForm.casual) || 0,
        sick: Number(balanceForm.sick) || 0,
        earned: Number(balanceForm.earned) || 0,
      })
      addNotification({
        title: "Leave balance updated",
        description: editBalance.employeeName,
        type: "system",
      })
      setEditBalance(null)
      await load()
    } catch (err: any) {
      alert(err.message || "Failed to update leave balance")
    } finally {
      setSavingBalance(false)
    }
  }

  const review = async (id: string, status: "Approved" | "Rejected") => {
    await api.reviewHRLeaveRequest(id, status)
    addNotification({ title: `Leave ${status}`, description: "", type: "system" })
    await load()
  }

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
          <h2 className="text-sm font-extrabold">Leave Management</h2>
          <p className="text-[11px] text-muted-foreground">Casual · Sick · Earned balances and approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            className={cn("h-8 text-xs", loading && "[&_svg]:animate-spin")}
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                setForm({
                  employeeId: employees[0]?.id || "",
                  leaveType: "casual",
                  startDate: "",
                  endDate: "",
                  reason: "",
                })
                setApplyOpen(true)
              }}
            >
              Apply leave
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-extrabold">Leave balances</CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-secondary/20 text-[10px] uppercase text-muted-foreground font-bold">
              <tr>
                <th className="p-3 text-left">Employee</th>
                <th className="p-3 text-left">Casual</th>
                <th className="p-3 text-left">Sick</th>
                <th className="p-3 text-left">Earned</th>
                {isAdmin && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading &&
                Array.from({ length: Math.max(balances.length, 4) }).map((_, i) => (
                  <tr key={`sk-${i}`}>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-6 w-6 rounded-full" />
                        <Skeleton className="h-3.5 w-28" />
                      </div>
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-3.5 w-8" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-3.5 w-8" />
                    </td>
                    <td className="p-3">
                      <Skeleton className="h-3.5 w-8" />
                    </td>
                    {isAdmin && (
                      <td className="p-3">
                        <Skeleton className="ml-auto h-7 w-14 rounded-lg" />
                      </td>
                    )}
                  </tr>
                ))}
              {!loading && balances.map((b) => (
                <tr key={b.id}>
                  <td className="p-3 font-semibold">{b.employeeName}</td>
                  <td className="p-3">{b.casual}</td>
                  <td className="p-3">{b.sick}</td>
                  <td className="p-3">{b.earned}</td>
                  {isAdmin && (
                    <td className="p-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        icon={Pencil}
                        onClick={() => openBalanceEdit(b)}
                      >
                        Edit
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {!loading && balances.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-6 text-center text-muted-foreground">
                    No balances yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-extrabold">Leave requests</CardTitle>
          <CardDescription>Approve or reject pending requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading &&
            Array.from({ length: Math.max(Math.min(requests.length, 4), 2) }).map((_, i) => (
              <div
                key={`sk-req-${i}`}
                className="flex items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <div className="space-y-1.5">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
            ))}
          {!loading && requests.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-xs">
              <div>
                <p className="font-semibold text-foreground">
                  {r.employeeName} · {r.leaveType} · {r.days} day(s)
                </p>
                <p className="text-muted-foreground">
                  {r.startDate} → {r.endDate}
                  {r.reason ? ` · ${r.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    r.status === "Approved" ? "success" : r.status === "Rejected" ? "destructive" : "warning"
                  }
                >
                  {r.status}
                </Badge>
                {isAdmin && r.status === "Pending" && (
                  <>
                    <Button size="sm" variant="outline" className="h-7 text-[10px]" icon={Check} onClick={() => review(r.id, "Approved")}>
                      Approve
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] text-rose-500" icon={X} onClick={() => review(r.id, "Rejected")}>
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {!loading && requests.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-6">No leave requests</p>
          )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={Boolean(editBalance)}
        onClose={() => setEditBalance(null)}
        title="Edit leave balance"
        description={editBalance?.employeeName}
      >
        <form onSubmit={saveBalance} className="space-y-3 text-xs">
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Casual</label>
              <Input
                type="number"
                min={0}
                value={balanceForm.casual}
                onChange={(e) => setBalanceForm({ ...balanceForm, casual: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Sick</label>
              <Input
                type="number"
                min={0}
                value={balanceForm.sick}
                onChange={(e) => setBalanceForm({ ...balanceForm, sick: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Earned</label>
              <Input
                type="number"
                min={0}
                value={balanceForm.earned}
                onChange={(e) => setBalanceForm({ ...balanceForm, earned: e.target.value })}
                className="h-8 text-xs"
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setEditBalance(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" icon={Save} disabled={savingBalance}>
              {savingBalance ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog isOpen={applyOpen} onClose={() => setApplyOpen(false)} title="Apply leave" description="Create a leave request for staff">
        <form onSubmit={submitLeave} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Employee</label>
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="h-8 text-xs" required>
              <option value="">Select</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Type</label>
              <Select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="h-8 text-xs">
                <option value="casual">Casual</option>
                <option value="sick">Sick</option>
                <option value="earned">Earned</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Reason</label>
              <Input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">Start</label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="h-8 text-xs" required />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">End</label>
              <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="h-8 text-xs" required />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setApplyOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Submit
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
