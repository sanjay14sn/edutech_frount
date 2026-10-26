"use client"

import * as React from "react"
import { Printer, Eye } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { type EmployeeProfile, type Payslip, formatMonth, statusBadgeVariant } from "@/lib/employeePortal"

function lineItems(p: Payslip) {
  return {
    earnings: [
      ["Base salary", p.baseSalary],
      ["Overtime", p.overtimeAdd],
      ["Commission", p.commissionAdd],
      ["Incentive", p.incentiveAdd],
    ].filter(([, v]) => Number(v) > 0) as [string, number][],
    deductions: [
      ["Late arrival", p.lateArrivalDeduction],
      ["Unpaid leave", p.unpaidLeaveDeduction],
    ].filter(([, v]) => Number(v) > 0) as [string, number][],
  }
}

function esc(value?: string) {
  return (value ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
}

function printPayslip(p: Payslip, emp: EmployeeProfile | null) {
  const { earnings, deductions } = lineItems(p)
  const rows = (items: [string, number][]) =>
    items.map(([k, v]) => `<tr><td>${k}</td><td style="text-align:right">${formatCurrency(v)}</td></tr>`).join("") ||
    `<tr><td colspan="2" style="color:#888">None</td></tr>`
  const win = window.open("", "_blank", "width=720,height=900")
  if (!win) return
  win.document.write(`<!doctype html><html><head><title>Payslip ${p.month}</title>
<style>body{font-family:system-ui,sans-serif;padding:32px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:12px 0}
td{padding:6px 0;border-bottom:1px solid #eee;font-size:14px}.meta{color:#555;font-size:13px}.net{font-size:20px;font-weight:700;margin-top:16px}</style>
</head><body>
<h1>Payslip — ${formatMonth(p.month)}</h1>
<p class="meta">${esc(emp?.name)} · ${esc(emp?.employeeCode)} · ${esc(emp?.designation)}, ${esc(emp?.department)}</p>
<h3>Earnings</h3><table>${rows(earnings)}</table>
<h3>Deductions</h3><table>${rows(deductions)}</table>
<p>Gross: <b>${formatCurrency(p.grossPayout)}</b></p>
<p class="net">Net pay: ${formatCurrency(p.netPayout)}</p>
</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = React.useState<Payslip[]>([])
  const [employee, setEmployee] = React.useState<EmployeeProfile | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [selected, setSelected] = React.useState<Payslip | null>(null)

  React.useEffect(() => {
    Promise.all([api.getEmployeePayslips(), api.getEmployeeSummary()])
      .then(([rows, summary]) => {
        setPayslips(rows || [])
        setEmployee(summary?.employee || null)
      })
      .catch(() => setPayslips([]))
      .finally(() => setLoading(false))
  }, [])

  const items = selected ? lineItems(selected) : null

  return (
    <div className="space-y-6">
      <EmployeePageHeader title="Pay Slips" description="Approved and released salary statements" />

      <Card className="bg-card">
        <CardContent className="p-4 sm:p-6 space-y-2">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : payslips.length === 0 ? (
            <EmptyState>No payslips have been released yet.</EmptyState>
          ) : (
            payslips.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-foreground">{formatMonth(p.month)}</p>
                  <p className="text-xs text-muted-foreground">Net pay {formatCurrency(p.netPayout)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusBadgeVariant(p.status)}>{p.status}</Badge>
                  <Button variant="outline" size="sm" icon={Eye} onClick={() => setSelected(p)}>
                    View
                  </Button>
                  <Button variant="outline" size="sm" icon={Printer} onClick={() => printPayslip(p, employee)}>
                    Print
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Payslip — ${formatMonth(selected.month)}` : ""}
      >
        {selected && items && (
          <div className="space-y-4 text-xs">
            <div>
              <p className="mb-1 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Earnings</p>
              {items.earnings.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border/30 py-1.5">
                  <span>{k}</span>
                  <span className="tabular-nums">{formatCurrency(v)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Deductions</p>
              {items.deductions.length === 0 ? (
                <p className="text-muted-foreground py-1.5">None</p>
              ) : (
                items.deductions.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-border/30 py-1.5">
                    <span>{k}</span>
                    <span className="tabular-nums text-rose-600">− {formatCurrency(v)}</span>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm font-semibold">
              <span>Net pay</span>
              <span className="tabular-nums">{formatCurrency(selected.netPayout)}</span>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
