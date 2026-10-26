"use client"

import * as React from "react"
import { Plus, Sun, Thermometer, Award } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { KPICard } from "@/components/dashboard/KPICard"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import {
  type LeaveRequest,
  LEAVE_TYPE_LABELS,
  formatDay,
  localDateStr,
  statusBadgeVariant,
} from "@/lib/employeePortal"

type Balance = { year: number; casual: number; sick: number; earned: number }

const emptyForm = { leaveType: "casual", startDate: "", endDate: "", reason: "" }

export default function EmployeeLeavePage() {
  const [balance, setBalance] = React.useState<Balance | null>(null)
  const [requests, setRequests] = React.useState<LeaveRequest[]>([])
  const [loading, setLoading] = React.useState(true)
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)

  const load = React.useCallback(async () => {
    try {
      const data = await api.getEmployeeLeave()
      setBalance(data?.balance || null)
      setRequests(data?.requests || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void load()
    if (new URLSearchParams(window.location.search).get("apply") === "1") setOpen(true)
  }, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      await api.applyEmployeeLeave(form)
      setOpen(false)
      setForm(emptyForm)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to apply for leave")
    } finally {
      setSaving(false)
    }
  }

  const cancel = async (id: string) => {
    if (!confirm("Cancel this leave request?")) return
    try {
      await api.cancelEmployeeLeave(id)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to cancel")
    }
  }

  return (
    <div className="space-y-6">
      <EmployeePageHeader
        title="Leave Management"
        description={balance ? `Leave balance for ${balance.year}` : "Your leave balance and requests"}
        actions={
          <Button size="sm" icon={Plus} onClick={() => setOpen(true)}>
            Apply leave
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Casual" value={balance?.casual ?? 0} subtext="Days available" icon={Sun} />
        <KPICard title="Sick" value={balance?.sick ?? 0} subtext="Days available" icon={Thermometer} />
        <KPICard title="Earned" value={balance?.earned ?? 0} subtext="Days available" icon={Award} />
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">My leave requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : requests.length === 0 ? (
            <EmptyState>You haven&apos;t applied for leave yet.</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-3 font-semibold">Type</th>
                    <th className="py-2 pr-3 font-semibold">From</th>
                    <th className="py-2 pr-3 font-semibold">To</th>
                    <th className="py-2 pr-3 font-semibold">Days</th>
                    <th className="py-2 pr-3 font-semibold">Reason</th>
                    <th className="py-2 pr-3 font-semibold">Status</th>
                    <th className="py-2 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} className="border-b border-border/30 last:border-0">
                      <td className="py-2.5 pr-3 font-medium text-foreground">{LEAVE_TYPE_LABELS[r.leaveType]}</td>
                      <td className="py-2.5 pr-3">{formatDay(r.startDate)}</td>
                      <td className="py-2.5 pr-3">{formatDay(r.endDate)}</td>
                      <td className="py-2.5 pr-3 tabular-nums">{r.days}</td>
                      <td className="py-2.5 pr-3 max-w-[16rem] truncate text-muted-foreground">{r.reason || "—"}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={statusBadgeVariant(r.status)}>{r.status}</Badge>
                      </td>
                      <td className="py-2.5 text-right">
                        {r.status === "Pending" && (
                          <button
                            onClick={() => cancel(r.id)}
                            className="text-[11px] font-medium text-rose-600 hover:underline cursor-pointer"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Apply for leave">
        <form onSubmit={submit} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Leave type</label>
            <Select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="h-9 text-xs">
              {Object.entries(LEAVE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label} ({balance?.[value as keyof Omit<Balance, "year">] ?? 0} left)
                </option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">From</label>
              <Input
                type="date"
                required
                min={localDateStr()}
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="font-semibold text-muted-foreground">To</label>
              <Input
                type="date"
                required
                min={form.startDate || localDateStr()}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Reason</label>
            <Input
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={saving}>
              Submit request
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
