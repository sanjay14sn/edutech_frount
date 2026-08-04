"use client"

import * as React from "react"
import { Plus, RefreshCw, ArrowLeft } from "lucide-react"
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

const CATEGORIES = ["Travel", "Food", "Fuel", "Office", "Internet", "Hardware", "Others"] as const

export default function HRExpensesPage() {
  const { user, addNotification } = useStore()
  const isAdmin = user?.role === "owner" || user?.role === "super_admin"
  const [claims, setClaims] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [open, setOpen] = React.useState(false)
  const [form, setForm] = React.useState({
    employeeId: "",
    title: "",
    amount: "",
    category: "Travel" as (typeof CATEGORIES)[number],
    billUrl: "",
  })

  const load = React.useCallback(async () => {
    const data = await api.getHRClaims()
    setClaims(data || [])
    if (isAdmin) {
      const emps = await api.getHREmployees()
      setEmployees((emps || []).filter((e: any) => e.status === "active"))
    }
  }, [isAdmin])

  React.useEffect(() => {
    void load()
  }, [load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    const emp = employees.find((x) => x.id === form.employeeId)
    await api.createHRClaim({
      employeeId: form.employeeId,
      employeeName: emp?.name || user?.name || "Staff",
      title: form.title,
      amount: Number(form.amount) || 0,
      category: form.category,
      billUrl: form.billUrl || undefined,
      status: "Pending Approval",
      date: new Date().toISOString().slice(0, 10),
    })
    addNotification({ title: "Claim submitted", description: form.title, type: "fees" })
    setOpen(false)
    await load()
  }

  const updateStatus = async (id: string, status: string) => {
    await api.updateHRClaimStatus(id, status)
    await load()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-sm font-extrabold">Expenses & Reimbursements</h2>
          <p className="text-[11px] text-muted-foreground">Travel, food, fuel, office · receipt link · approval workflow</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
            Refresh
          </Button>
          {isAdmin && (
            <Button
              size="sm"
              icon={Plus}
              className="h-8 text-xs"
              onClick={() => {
                setForm({
                  employeeId: employees[0]?.id || "",
                  title: "",
                  amount: "",
                  category: "Travel",
                  billUrl: "",
                })
                setOpen(true)
              }}
            >
              Add claim
            </Button>
          )}
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="divide-y divide-border/40 p-0">
          {claims.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">No claims yet</p>
          ) : (
            claims.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs">
                <div>
                  <p className="font-semibold text-foreground">{c.title}</p>
                  <p className="text-muted-foreground">
                    {c.employeeName} · {c.category} · {c.date}
                    {c.billUrl ? (
                      <>
                        {" · "}
                        <a href={c.billUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                          Receipt
                        </a>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold">{formatCurrency(c.amount)}</span>
                  <Badge>{c.status}</Badge>
                  {isAdmin && c.status === "Pending Approval" && (
                    <>
                      <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => updateStatus(c.id, "Approved")}>
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-[10px] text-rose-500" onClick={() => updateStatus(c.id, "Rejected")}>
                        Reject
                      </Button>
                    </>
                  )}
                  {isAdmin && c.status === "Approved" && (
                    <Button size="sm" className="h-7 text-[10px]" onClick={() => updateStatus(c.id, "Released")}>
                      Disburse
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="New expense claim">
        <form onSubmit={create} className="space-y-3 text-xs">
          <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="h-8 text-xs" required>
            <option value="">Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <Input required placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-8 text-xs" />
          <div className="grid grid-cols-2 gap-2">
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="h-8 text-xs">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Input required type="number" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="h-8 text-xs" />
          </div>
          <Input placeholder="Receipt URL (optional)" value={form.billUrl} onChange={(e) => setForm({ ...form, billUrl: e.target.value })} className="h-8 text-xs" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
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
