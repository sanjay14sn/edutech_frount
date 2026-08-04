"use client"

import * as React from "react"
import { Download, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { api } from "@/lib/api"

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function HRReportsPage() {
  const [month, setMonth] = React.useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  })
  const [bundle, setBundle] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(false)

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.getHRReports(month)
      setBundle(data)
    } finally {
      setLoading(false)
    }
  }, [month])

  React.useEffect(() => {
    void load()
  }, [load])

  const exportAttendance = () => {
    const rows = [["date", "name", "type", "status", "entityId"]]
    ;(bundle?.attendance || []).forEach((a: any) => {
      rows.push([a.date, a.name || "", a.type, a.status, a.entityId])
    })
    downloadCsv(`attendance-${month}.csv`, rows)
  }

  const exportLeave = () => {
    const rows = [["employee", "type", "start", "end", "days", "status"]]
    ;(bundle?.leave || []).forEach((l: any) => {
      rows.push([l.employeeName, l.leaveType, l.startDate, l.endDate, String(l.days), l.status])
    })
    downloadCsv(`leave-${month.slice(0, 4)}.csv`, rows)
  }

  const exportPayroll = () => {
    const rows = [["employeeId", "month", "base", "net", "status"]]
    ;(bundle?.payroll || []).forEach((p: any) => {
      rows.push([p.employeeId, p.month, String(p.baseSalary), String(p.netPayout), p.status])
    })
    downloadCsv(`payroll-${month}.csv`, rows)
  }

  const exportEmployees = () => {
    const rows = [["code", "name", "department", "designation", "status", "baseSalary"]]
    ;(bundle?.employees || []).forEach((e: any) => {
      rows.push([e.employeeCode, e.name, e.department, e.designation, e.status, String(e.baseSalary)])
    })
    downloadCsv(`employees.csv`, rows)
  }

  const reports = [
    { title: "Attendance Report", desc: `Staff attendance for ${month}`, action: exportAttendance },
    { title: "Leave Report", desc: "Leave requests for the year", action: exportLeave },
    { title: "Salary / Payroll Report", desc: `Payroll rows for ${month}`, action: exportPayroll },
    { title: "Employee Report", desc: "Full staff directory export", action: exportEmployees },
    { title: "Payroll Summary", desc: "Same as salary report (department-wise coming later)", action: exportPayroll },
    { title: "PF / ESI / TDS Report", desc: "Exports salary structure statutory fields when configured — use Salary Structures", action: exportPayroll },
  ]

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
          <h2 className="text-sm font-extrabold">HR Reports</h2>
          <p className="text-[11px] text-muted-foreground">CSV exports for attendance, leave, payroll, and employees</p>
        </div>
        <div className="flex gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="h-8 text-xs w-40" />
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load} disabled={loading}>
            Load
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {reports.map((r) => (
          <Card key={r.title} className="bg-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-extrabold">{r.title}</CardTitle>
              <CardDescription>{r.desc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" variant="outline" icon={Download} className="h-8 text-xs" onClick={r.action} disabled={!bundle}>
                Download CSV
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
