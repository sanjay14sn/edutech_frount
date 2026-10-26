"use client"

import * as React from "react"
import { Save, ArrowLeft, Plus, Trash2, Wand2, CheckCircle2, AlertTriangle } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { api } from "@/lib/api"
import { cn, formatCurrency } from "@/lib/utils"
import { useStore } from "@/store/useStore"

type Mode = "fixed" | "ctc" | "basic" | "gross" | "balance"
type Kind = "earning" | "deduction"

type BuiltinKey =
  | "basic"
  | "hra"
  | "allowances"
  | "incentives"
  | "bonuses"
  | "pf"
  | "esi"
  | "professionalTax"
  | "tds"
  | "otherDeductions"

type Line = {
  id: string
  key?: BuiltinKey
  label: string
  kind: Kind
  mode: Mode
  value: string
}

const BUILTINS: { key: BuiltinKey; label: string; kind: Kind }[] = [
  { key: "basic", label: "Basic", kind: "earning" },
  { key: "hra", label: "HRA", kind: "earning" },
  { key: "allowances", label: "Allowances", kind: "earning" },
  { key: "incentives", label: "Incentives", kind: "earning" },
  { key: "bonuses", label: "Bonuses", kind: "earning" },
  { key: "pf", label: "PF", kind: "deduction" },
  { key: "esi", label: "ESI", kind: "deduction" },
  { key: "professionalTax", label: "Professional Tax", kind: "deduction" },
  { key: "tds", label: "TDS", kind: "deduction" },
  { key: "otherDeductions", label: "Other deductions", kind: "deduction" },
]

const MODE_LABELS: Record<Mode, string> = {
  fixed: "₹ Fixed",
  ctc: "% of CTC",
  basic: "% of Basic",
  gross: "% of Gross",
  balance: "Balance of CTC",
}

function modesFor(line: Line): Mode[] {
  if (line.key === "basic") return ["fixed", "ctc"]
  if (line.kind === "earning") return ["fixed", "ctc", "basic", "balance"]
  return ["fixed", "ctc", "basic", "gross"]
}

const STANDARD_TEMPLATE: Partial<Record<BuiltinKey, { mode: Mode; value: number }>> = {
  basic: { mode: "ctc", value: 50 },
  hra: { mode: "basic", value: 40 },
  allowances: { mode: "balance", value: 0 },
  incentives: { mode: "fixed", value: 0 },
  bonuses: { mode: "fixed", value: 0 },
  pf: { mode: "basic", value: 12 },
  esi: { mode: "fixed", value: 0 },
  professionalTax: { mode: "fixed", value: 200 },
  tds: { mode: "fixed", value: 0 },
  otherDeductions: { mode: "fixed", value: 0 },
}

const num = (v: string | number | undefined) => Number(v) || 0

function compute(lines: Line[], ctc: number) {
  const amounts = new Map<string, number>()
  const pctOf = (base: number, v: string) => Math.round((base * num(v)) / 100)

  const basicLine = lines.find((l) => l.key === "basic")
  const basic = basicLine ? (basicLine.mode === "ctc" ? pctOf(ctc, basicLine.value) : Math.round(num(basicLine.value))) : 0
  if (basicLine) amounts.set(basicLine.id, basic)

  const earnings = lines.filter((l) => l.kind === "earning" && l.key !== "basic")
  for (const l of earnings) {
    if (l.mode === "balance") continue
    amounts.set(
      l.id,
      l.mode === "ctc" ? pctOf(ctc, l.value) : l.mode === "basic" ? pctOf(basic, l.value) : Math.round(num(l.value))
    )
  }
  let assignedBalance = false
  const fixedEarnings = [...amounts.values()].reduce((s, v) => s + v, 0)
  for (const l of earnings) {
    if (l.mode !== "balance") continue
    amounts.set(l.id, assignedBalance ? 0 : Math.max(0, ctc - fixedEarnings))
    assignedBalance = true
  }

  const gross = lines.filter((l) => l.kind === "earning").reduce((s, l) => s + (amounts.get(l.id) || 0), 0)

  for (const l of lines.filter((x) => x.kind === "deduction")) {
    const base = l.mode === "ctc" ? ctc : l.mode === "basic" ? basic : l.mode === "gross" ? gross : 0
    amounts.set(l.id, l.mode === "fixed" ? Math.round(num(l.value)) : pctOf(base, l.value))
  }

  const deductions = lines.filter((l) => l.kind === "deduction").reduce((s, l) => s + (amounts.get(l.id) || 0), 0)
  return { amounts, basic, gross, deductions, net: gross - deductions }
}

function linesFromStructure(existing: any | undefined, fallbackBasic: number): Line[] {
  const builtins: Line[] = BUILTINS.map((b) => {
    const rule = existing?.rules?.[b.key]
    if (rule?.mode) {
      return { id: b.key, key: b.key, label: b.label, kind: b.kind, mode: rule.mode, value: String(rule.value ?? 0) }
    }
    const amount = existing ? existing[b.key] || 0 : b.key === "basic" ? fallbackBasic : 0
    return { id: b.key, key: b.key, label: b.label, kind: b.kind, mode: "fixed", value: String(amount) }
  })
  const customs: Line[] = (existing?.customComponents || []).map((c: any, i: number) => ({
    id: `custom-${i}-${c.name}`,
    label: c.name,
    kind: c.kind === "deduction" ? "deduction" : "earning",
    mode: c.mode || "fixed",
    value: String(c.mode && c.mode !== "fixed" ? c.value ?? 0 : c.amount ?? c.value ?? 0),
  }))
  return [...builtins, ...customs]
}

export default function HRSalaryStructuresPage() {
  const { addNotification } = useStore()
  const [employees, setEmployees] = React.useState<any[]>([])
  const [structures, setStructures] = React.useState<any[]>([])
  const [employeeId, setEmployeeId] = React.useState("")
  const [ctcInput, setCtcInput] = React.useState("0")
  const [lines, setLines] = React.useState<Line[]>(() => linesFromStructure(undefined, 0))
  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  const load = React.useCallback(async () => {
    const [emps, structs] = await Promise.all([api.getHREmployees(), api.getHRSalaryStructures()])
    const active = (emps || []).filter((e: any) => e.status === "active")
    setEmployees(active)
    setStructures(structs || [])
    setEmployeeId((cur) => cur || active[0]?.id || "")
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  React.useEffect(() => {
    const existing = structures.find((s) => s.employeeId === employeeId)
    const emp = employees.find((e) => e.id === employeeId)
    if (!existing && !emp) return
    const fallback = emp?.baseSalary || 0
    const next = linesFromStructure(existing, fallback)
    setLines(next)
    const storedGross = existing
      ? BUILTINS.filter((b) => b.kind === "earning").reduce((s, b) => s + (existing[b.key] || 0), 0) +
        (existing.customComponents || [])
          .filter((c: any) => c.kind === "earning")
          .reduce((s: number, c: any) => s + (c.amount || 0), 0)
      : 0
    setCtcInput(String(existing?.ctc || storedGross || fallback))
    setDirty(false)
  }, [employeeId, structures, employees])

  const ctc = num(ctcInput)
  const totals = compute(lines, ctc)
  const ctcGap = ctc - totals.gross

  const updateLine = (id: string, patch: Partial<Line>) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.id !== id) return l
        const next = { ...l, ...patch }
        if (patch.mode && patch.mode !== l.mode) {
          next.value = patch.mode === "fixed" ? String(totals.amounts.get(l.id) || 0) : patch.mode === "balance" ? "0" : ""
        }
        return next
      })
    )
    setDirty(true)
  }

  const addCustom = (kind: Kind) => {
    setLines((prev) => [
      ...prev,
      {
        id: `custom-${Date.now().toString(36)}`,
        label: "",
        kind,
        mode: "fixed",
        value: "0",
      },
    ])
    setDirty(true)
  }

  const removeLine = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id))
    setDirty(true)
  }

  const applyTemplate = () => {
    setLines((prev) =>
      prev.map((l) => {
        const t = l.key ? STANDARD_TEMPLATE[l.key] : undefined
        return t ? { ...l, mode: t.mode, value: String(t.value) } : l
      })
    )
    setDirty(true)
  }

  const save = async () => {
    if (!employeeId) return
    const unnamed = lines.find((l) => !l.key && !l.label.trim())
    if (unnamed) {
      alert("Give every custom component a name before saving.")
      return
    }
    try {
      setSaving(true)
      const payload: Record<string, unknown> = {
        employeeId,
        ctc,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        rules: Object.fromEntries(
          lines.filter((l) => l.key).map((l) => [l.key, { mode: l.mode, value: num(l.value) }])
        ),
        customComponents: lines
          .filter((l) => !l.key)
          .map((l) => ({
            name: l.label.trim(),
            kind: l.kind,
            mode: l.mode,
            value: num(l.value),
            amount: totals.amounts.get(l.id) || 0,
          })),
      }
      for (const l of lines) {
        if (l.key) payload[l.key] = totals.amounts.get(l.id) || 0
      }
      await api.upsertHRSalaryStructure(payload)
      addNotification({
        title: "Salary structure saved",
        description: `Gross ${formatCurrency(totals.gross)} · Net ${formatCurrency(totals.net)}`,
        type: "system",
      })
      const structs = await api.getHRSalaryStructures()
      setStructures(structs || [])
    } catch (err: any) {
      alert(err.message || "Failed to save salary structure")
    } finally {
      setSaving(false)
    }
  }

  const renderSection = (kind: Kind) => {
    const sectionLines = lines.filter((l) => l.kind === kind)
    const total = kind === "earning" ? totals.gross : totals.deductions
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p
            className={cn(
              "text-[11px] font-bold uppercase tracking-wide",
              kind === "earning" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
            )}
          >
            {kind === "earning" ? "Earnings" : "Deductions"}
          </p>
          <span className="text-xs font-bold tabular-nums text-foreground">
            {kind === "deduction" ? "-" : ""}
            {formatCurrency(total)}
          </span>
        </div>
        <div className="hidden sm:grid grid-cols-[1fr_8.5rem_7rem_6.5rem_2rem] gap-2 px-1 text-[10px] font-semibold uppercase text-muted-foreground">
          <span>Component</span>
          <span>Calculated as</span>
          <span>Value</span>
          <span className="text-right">Amount</span>
          <span />
        </div>
        <div className="space-y-2">
          {sectionLines.map((l) => {
            const amount = totals.amounts.get(l.id) || 0
            const isPercent = l.mode === "ctc" || l.mode === "basic" || l.mode === "gross"
            return (
              <div
                key={l.id}
                className="grid grid-cols-2 gap-2 rounded-lg border border-border/50 bg-muted/10 p-2 sm:grid-cols-[1fr_8.5rem_7rem_6.5rem_2rem] sm:items-center sm:border-0 sm:bg-transparent sm:p-0 sm:px-1"
              >
                <div className="col-span-2 sm:col-span-1">
                  {l.key ? (
                    <span className="text-xs font-semibold text-foreground">{l.label}</span>
                  ) : (
                    <Input
                      placeholder={kind === "earning" ? "e.g. Travel allowance" : "e.g. Loan EMI"}
                      value={l.label}
                      onChange={(e) => updateLine(l.id, { label: e.target.value })}
                      className="h-8 text-xs"
                    />
                  )}
                </div>
                <Select
                  value={l.mode}
                  onChange={(e) => updateLine(l.id, { mode: e.target.value as Mode })}
                  className="h-8 text-xs pr-7"
                >
                  {modesFor(l).map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </Select>
                {l.mode === "balance" ? (
                  <div className="flex h-8 items-center rounded-lg border border-dashed border-border px-2 text-[11px] text-muted-foreground">
                    Auto
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={isPercent ? "0.01" : "1"}
                      value={l.value}
                      onChange={(e) => updateLine(l.id, { value: e.target.value })}
                      className={cn("h-8 text-xs", isPercent ? "pr-6" : "pl-5")}
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground",
                        isPercent ? "right-2" : "left-2"
                      )}
                    >
                      {isPercent ? "%" : "₹"}
                    </span>
                  </div>
                )}
                <span
                  className={cn(
                    "text-right text-xs font-bold tabular-nums",
                    kind === "deduction" && amount > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"
                  )}
                >
                  {kind === "deduction" && amount > 0 ? "-" : ""}
                  {formatCurrency(amount)}
                </span>
                {l.key ? (
                  <span />
                ) : (
                  <button
                    type="button"
                    aria-label={`Remove ${l.label || "component"}`}
                    onClick={() => removeLine(l.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={Plus}
          className="h-7 text-[11px]"
          onClick={() => addCustom(kind)}
        >
          Add {kind === "earning" ? "earning" : "deduction"}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold">Salary Structures</h2>
            {dirty && (
              <Badge variant="warning" className="text-[10px] px-2 py-0">
                Unsaved
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Set each component as a fixed amount or a % of CTC / Basic / Gross — totals update live
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className="h-8 text-xs w-56">
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.designation})
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" icon={Wand2} className="h-8 text-xs" onClick={applyTemplate}>
            Standard template
          </Button>
          <Button size="sm" icon={Save} className="h-8 text-xs" onClick={save} disabled={saving || !employeeId}>
            {saving ? "Saving…" : "Save structure"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 bg-card">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <CardTitle className="text-sm font-extrabold">Components</CardTitle>
                <CardDescription>Percentages recalculate automatically when CTC or Basic changes</CardDescription>
              </div>
              <div className="w-44 space-y-1">
                <label className="text-[11px] font-semibold text-muted-foreground">Monthly CTC</label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    value={ctcInput}
                    onChange={(e) => {
                      setCtcInput(e.target.value)
                      setDirty(true)
                    }}
                    className="h-9 pl-5 text-sm font-bold"
                  />
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    ₹
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderSection("earning")}
            <div className="border-t border-border/60" />
            {renderSection("deduction")}
          </CardContent>
        </Card>

        <Card className="bg-card h-fit lg:sticky lg:top-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-extrabold">Summary</CardTitle>
            <CardDescription>Gross becomes the employee CTC on Employees &amp; Payroll</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Monthly CTC</span>
              <strong className="tabular-nums">{formatCurrency(ctc)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Gross earnings</span>
              <strong className="tabular-nums">{formatCurrency(totals.gross)}</strong>
            </div>
            <div className="flex justify-between text-rose-500">
              <span>Deductions</span>
              <strong className="tabular-nums">-{formatCurrency(totals.deductions)}</strong>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-sm">
              <span className="font-bold">Net take-home</span>
              <strong className="tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totals.net)}
              </strong>
            </div>

            {totals.gross > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted/50">
                  <div
                    className="h-full bg-emerald-500"
                    style={{ width: `${Math.max(0, (totals.net / totals.gross) * 100)}%` }}
                  />
                  <div
                    className="h-full bg-rose-500"
                    style={{ width: `${Math.min(100, (totals.deductions / totals.gross) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Take-home {Math.round((totals.net / totals.gross) * 100)}%</span>
                  <span>Deductions {Math.round((totals.deductions / totals.gross) * 100)}%</span>
                </div>
              </div>
            )}

            {ctc > 0 &&
              (ctcGap === 0 ? (
                <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Gross matches the monthly CTC.
                </div>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2 text-[11px] text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Gross is {formatCurrency(Math.abs(ctcGap))} {ctcGap > 0 ? "below" : "above"} CTC. Set an
                    earning to <strong>Balance of CTC</strong> to fill the gap automatically.
                  </span>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
