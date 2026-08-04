"use client"

import * as React from "react"
import { RefreshCw, FileText, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/store/useStore"

function structureTotals(structure: any) {
  const gross =
    (structure.basic || 0) +
    (structure.hra || 0) +
    (structure.allowances || 0) +
    (structure.incentives || 0) +
    (structure.bonuses || 0)
  const deductions =
    (structure.pf || 0) +
    (structure.esi || 0) +
    (structure.professionalTax || 0) +
    (structure.tds || 0) +
    (structure.otherDeductions || 0)
  return { gross, deductions, net: gross - deductions }
}

export default function HRPayrollPage() {
  const { addNotification } = useStore()
  const [month, setMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [overview, setOverview] = React.useState<any>(null)
  const [structures, setStructures] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [payslip, setPayslip] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(async () => {
    try {
      setLoading(true)
      const [ov, structs, emps] = await Promise.all([
        api.getHROverview(month),
        api.getHRSalaryStructures(),
        api.getHREmployees(),
      ])
      setOverview(ov)
      setStructures(structs || [])
      setEmployees(emps || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [month])

  React.useEffect(() => {
    void load()
  }, [load])

  const payroll = overview?.payroll || []
  const activeEmployees = employees.filter((e) => e.status === "active")
  const activeSourceIds = new Set(activeEmployees.map((e) => String(e.sourceId)))
  const payrollRows = payroll.filter((row: any) => activeSourceIds.has(String(row.employeeId)))

  const resolvePay = (row: any) => {
    const hrEmp = activeEmployees.find((e) => String(e.sourceId) === String(row.employeeId))
    const structure = structures.find((s) => s.employeeId === hrEmp?.id)
    const attendanceDed = (row.lateArrivalDeduction || 0) + (row.unpaidLeaveDeduction || 0)
    // Variable month add-ons only (not structure incentives — those are already in gross)
    const variableAdd = (row.overtimeAdd || 0) + (row.commissionAdd || 0)

    if (structure) {
      const totals = structureTotals(structure)
      return {
        hrEmp,
        structure,
        // Show monthly CTC / gross from structure — same as Employees + Salary Structures
        base: totals.gross,
        deductions: totals.deductions + attendanceDed,
        additions: variableAdd,
        net: totals.net - attendanceDed + variableAdd,
        label: hrEmp?.designation || hrEmp?.sourceType || "Staff",
        name: hrEmp?.name || "Employee",
      }
    }

    const base = hrEmp?.baseSalary ?? row.baseSalary ?? 0
    return {
      hrEmp,
      structure: null,
      base,
      deductions: attendanceDed,
      additions: variableAdd,
      net: base - attendanceDed + variableAdd,
      label: hrEmp?.designation || hrEmp?.sourceType || "Staff",
      name: hrEmp?.name || "Employee",
    }
  }

  const submit = async (row: any) => {
    const pay = resolvePay(row)
    if (!pay.hrEmp) return
    await api.submitHRPayroll({
      employeeId: pay.hrEmp.sourceId,
      employeeType: pay.hrEmp.sourceType === "trainer" ? "trainer" : "bde",
      month,
      baseSalary: pay.base,
      lateArrivalDeduction: row.lateArrivalDeduction || 0,
      unpaidLeaveDeduction: row.unpaidLeaveDeduction || 0,
      overtimeAdd: row.overtimeAdd || 0,
      commissionAdd: row.commissionAdd || 0,
      incentiveAdd: 0,
      grossPayout: pay.base + pay.additions,
      netPayout: pay.net,
    })
    addNotification({ title: "Payroll submitted", description: pay.name, type: "system" })
    await load()
  }

  const advance = async (id: string, status: string, title: string) => {
    if (String(id).startsWith("draft-")) return
    await api.updateHRPayrollStatus(id, {
      status,
      timelineEntry: {
        title,
        date: new Date().toISOString().slice(0, 10),
        description: title,
      },
    })
    await load()
  }

  const exportBank = () => {
    const released = payrollRows.filter((p: any) => p.status === "Released")
    const lines = ["employeeId,name,netPayout,month,status"]
    released.forEach((p: any) => {
      const pay = resolvePay(p)
      lines.push(`${p.employeeId},"${pay.name}",${p.netPayout},${p.month},${p.status}`)
    })
    const blob = new Blob([lines.join("\n")], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bank-transfer-${month}.csv`
    a.click()
    URL.revokeObjectURL(url)
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
          <h2 className="text-sm font-extrabold">Payroll Processing</h2>
          <p className="text-[11px] text-muted-foreground">
            Draft → Pending → Approved → Released · pay from salary structure (or employee base)
          </p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 text-xs w-40" />
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={exportBank}>
            Bank CSV
          </Button>
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <p className="p-8 text-center text-xs text-muted-foreground">Loading payroll…</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-secondary/20 text-[10px] uppercase text-muted-foreground font-bold">
                <tr>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Gross / CTC</th>
                  <th className="p-3 text-left">Deductions</th>
                  <th className="p-3 text-left">Additions</th>
                  <th className="p-3 text-left">Net</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {payrollRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-xs text-muted-foreground">
                      No active employees for payroll. Sync staff under Employees first.
                    </td>
                  </tr>
                ) : (
                  payrollRows.map((row: any) => {
                    const pay = resolvePay(row)
                    const displayNet = row.status === "Draft" ? pay.net : row.netPayout
                    return (
                      <tr key={row.id || row.employeeId}>
                        <td className="p-3">
                          <p className="font-semibold">{pay.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {pay.label}
                            {pay.structure ? " · structure" : ""}
                          </p>
                        </td>
                        <td className="p-3 font-mono">{formatCurrency(pay.base)}</td>
                        <td className="p-3 text-rose-500 font-mono">-{formatCurrency(pay.deductions)}</td>
                        <td className="p-3 text-emerald-500 font-mono">+{formatCurrency(pay.additions)}</td>
                        <td className="p-3 font-bold font-mono">{formatCurrency(displayNet)}</td>
                        <td className="p-3">
                          <Badge
                            variant={
                              row.status === "Released"
                                ? "success"
                                : row.status === "Draft"
                                  ? "secondary"
                                  : "warning"
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right space-x-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            icon={FileText}
                            onClick={() =>
                              setPayslip({
                                name: pay.name,
                                row: { ...row, netPayout: displayNet },
                                structure: pay.structure,
                                pay,
                              })
                            }
                          >
                            Payslip
                          </Button>
                          {row.status === "Draft" && (
                            <Button size="sm" className="h-7 text-[10px]" onClick={() => submit(row)}>
                              Submit
                            </Button>
                          )}
                          {row.status === "Pending Approval" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[10px]"
                              onClick={() => advance(row.id, "Approved", "Approved")}
                            >
                              Approve
                            </Button>
                          )}
                          {row.status === "Approved" && (
                            <Button
                              size="sm"
                              className="h-7 text-[10px]"
                              onClick={() => advance(row.id, "Released", "Released")}
                            >
                              Release
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={Boolean(payslip)} onClose={() => setPayslip(null)} title="Payslip" description={payslip?.name}>
        {payslip && (
          <div className="space-y-3 text-xs print:text-black" id="payslip-print">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <p className="font-bold text-sm">{payslip.name}</p>
              <p className="text-muted-foreground">Month: {month}</p>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>Gross / CTC: {formatCurrency(payslip.pay.base)}</div>
                <div>Basic: {formatCurrency(payslip.structure?.basic ?? payslip.pay.base)}</div>
                <div>HRA: {formatCurrency(payslip.structure?.hra || 0)}</div>
                <div>Allowances: {formatCurrency(payslip.structure?.allowances || 0)}</div>
                <div>PF: {formatCurrency(payslip.structure?.pf || 0)}</div>
                <div>
                  Late / leave:{" "}
                  {formatCurrency(
                    (payslip.row.lateArrivalDeduction || 0) + (payslip.row.unpaidLeaveDeduction || 0)
                  )}
                </div>
                <div className="font-bold">Net: {formatCurrency(payslip.row.netPayout)}</div>
              </div>
              <Badge>{payslip.row.status}</Badge>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                Print
              </Button>
              <Button size="sm" onClick={() => setPayslip(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
