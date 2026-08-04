"use client"

import * as React from "react"
import { RefreshCw, Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"
import { useStore } from "@/store/useStore"

export default function HRSalaryStructuresPage() {
  const { addNotification } = useStore()
  const [employees, setEmployees] = React.useState<any[]>([])
  const [structures, setStructures] = React.useState<any[]>([])
  const [employeeId, setEmployeeId] = React.useState("")
  const [form, setForm] = React.useState({
    basic: "",
    hra: "",
    allowances: "",
    incentives: "",
    bonuses: "",
    pf: "",
    esi: "",
    professionalTax: "",
    tds: "",
    otherDeductions: "",
  })

  const load = React.useCallback(async () => {
    const [emps, structs] = await Promise.all([api.getHREmployees(), api.getHRSalaryStructures()])
    const active = (emps || []).filter((e: any) => e.status === "active")
    setEmployees(active)
    setStructures(structs || [])
    if (!employeeId && active[0]) setEmployeeId(active[0].id)
  }, [employeeId])

  React.useEffect(() => {
    void load()
  }, [])

  React.useEffect(() => {
    const existing = structures.find((s) => s.employeeId === employeeId)
    const emp = employees.find((e) => e.id === employeeId)
    if (existing) {
      setForm({
        basic: String(existing.basic || 0),
        hra: String(existing.hra || 0),
        allowances: String(existing.allowances || 0),
        incentives: String(existing.incentives || 0),
        bonuses: String(existing.bonuses || 0),
        pf: String(existing.pf || 0),
        esi: String(existing.esi || 0),
        professionalTax: String(existing.professionalTax || 0),
        tds: String(existing.tds || 0),
        otherDeductions: String(existing.otherDeductions || 0),
      })
    } else if (emp) {
      // Default structure = full employee CTC as Basic (same figure as Employees)
      setForm({
        basic: String(emp.baseSalary || 0),
        hra: "0",
        allowances: "0",
        incentives: "0",
        bonuses: "0",
        pf: "0",
        esi: "0",
        professionalTax: "0",
        tds: "0",
        otherDeductions: "0",
      })
    }
  }, [employeeId, structures, employees])

  const earnings =
    Number(form.basic || 0) +
    Number(form.hra || 0) +
    Number(form.allowances || 0) +
    Number(form.incentives || 0) +
    Number(form.bonuses || 0)
  const deductions =
    Number(form.pf || 0) +
    Number(form.esi || 0) +
    Number(form.professionalTax || 0) +
    Number(form.tds || 0) +
    Number(form.otherDeductions || 0)

  const save = async () => {
    if (!employeeId) return
    await api.upsertHRSalaryStructure({
      employeeId,
      basic: Number(form.basic) || 0,
      hra: Number(form.hra) || 0,
      allowances: Number(form.allowances) || 0,
      incentives: Number(form.incentives) || 0,
      bonuses: Number(form.bonuses) || 0,
      pf: Number(form.pf) || 0,
      esi: Number(form.esi) || 0,
      professionalTax: Number(form.professionalTax) || 0,
      tds: Number(form.tds) || 0,
      otherDeductions: Number(form.otherDeductions) || 0,
      effectiveFrom: new Date().toISOString().slice(0, 10),
    })
    addNotification({ title: "Salary structure saved", description: "", type: "system" })
    const structs = await api.getHRSalaryStructures()
    setStructures(structs || [])
  }

  const fields: Array<{ key: keyof typeof form; label: string }> = [
    { key: "basic", label: "Basic" },
    { key: "hra", label: "HRA" },
    { key: "allowances", label: "Allowances" },
    { key: "incentives", label: "Incentives" },
    { key: "bonuses", label: "Bonuses" },
    { key: "pf", label: "PF" },
    { key: "esi", label: "ESI" },
    { key: "professionalTax", label: "Professional Tax" },
    { key: "tds", label: "TDS" },
    { key: "otherDeductions", label: "Other deductions" },
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
          <h2 className="text-sm font-extrabold">Salary Structures</h2>
          <p className="text-[11px] text-muted-foreground">Basic, HRA, allowances, PF/ESI/PT/TDS components</p>
        </div>
        <div className="flex gap-2">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-8 text-xs w-56">
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.designation})
              </option>
            ))}
          </Select>
          <Button size="sm" icon={Save} className="h-8 text-xs" onClick={save}>
            Save structure
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">Components</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-3 text-xs">
            {fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="font-semibold text-muted-foreground">{f.label}</label>
                <Input
                  type="number"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">Summary</CardTitle>
            <CardDescription>
              Gross becomes the employee CTC on Employees &amp; Payroll
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between"><span>Gross earnings</span><strong>{formatCurrency(earnings)}</strong></div>
            <div className="flex justify-between text-rose-500"><span>Deductions</span><strong>-{formatCurrency(deductions)}</strong></div>
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-bold">Net</span>
              <strong>{formatCurrency(earnings - deductions)}</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
