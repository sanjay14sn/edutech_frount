"use client"

import * as React from "react"
import { Save, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"

type LeaveBasis = "yearly" | "monthly"

export default function HRSettingsPage() {
  const { addNotification } = useStore()
  const [policy, setPolicy] = React.useState({
    basis: "yearly" as LeaveBasis,
    casualDays: 12,
    sickDays: 10,
    earnedDays: 15,
    carryForwardEarned: true,
  })
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    void (async () => {
      try {
        const data = await api.getHRLeavePolicy()
        setPolicy({
          basis: data.basis === "monthly" ? "monthly" : "yearly",
          casualDays: data.casualDays ?? 12,
          sickDays: data.sickDays ?? 10,
          earnedDays: data.earnedDays ?? 15,
          carryForwardEarned: Boolean(data.carryForwardEarned),
        })
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    try {
      setSaving(true)
      await api.updateHRLeavePolicy(policy)
      addNotification({
        title: "Leave policy saved",
        description: policy.basis === "monthly" ? "Monthly basis" : "Yearly basis",
        type: "system",
      })
    } catch (err: any) {
      alert(err.message || "Failed to save policy")
    } finally {
      setSaving(false)
    }
  }

  const periodLabel = policy.basis === "monthly" ? "per month" : "per year"
  const annualPreview = (days: number) =>
    policy.basis === "monthly" ? days * 12 : days

  return (
    <div className="space-y-4">
      <div>
        <Link
          href="/hr"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
        >
          <ArrowLeft className="h-3 w-3" />
          All modules
        </Link>
        <h2 className="text-sm font-extrabold">HR Settings</h2>
        <p className="text-[11px] text-muted-foreground">
          Leave policy defaults · payroll defaults expand later
        </p>
      </div>

      <Card className="bg-card max-w-xl">
        <CardHeader>
          <CardTitle className="text-sm font-extrabold">Leave policy</CardTitle>
          <CardDescription>
            Entitlement used when creating leave balances — choose monthly or yearly basis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          {loading ? (
            <p className="text-muted-foreground">Loading…</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="font-semibold text-muted-foreground">Accrual basis</label>
                <div className="inline-flex rounded-lg border border-border/70 bg-muted/40 p-0.5">
                  {([
                    { value: "monthly" as const, label: "Monthly basis" },
                    { value: "yearly" as const, label: "Yearly basis" },
                  ]).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPolicy({ ...policy, basis: opt.value })}
                      className={cn(
                        "rounded-md px-3.5 py-1.5 text-xs font-semibold transition-colors",
                        policy.basis === opt.value
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {policy.basis === "monthly"
                    ? "Day counts below are credited each month (annual balance = × 12)."
                    : "Day counts below are the full annual entitlement."}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">
                    Casual days <span className="font-normal">({periodLabel})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={policy.casualDays}
                    onChange={(e) =>
                      setPolicy({ ...policy, casualDays: Number(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {annualPreview(policy.casualDays)} / year
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">
                    Sick days <span className="font-normal">({periodLabel})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={policy.sickDays}
                    onChange={(e) =>
                      setPolicy({ ...policy, sickDays: Number(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {annualPreview(policy.sickDays)} / year
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-muted-foreground">
                    Earned days <span className="font-normal">({periodLabel})</span>
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={policy.earnedDays}
                    onChange={(e) =>
                      setPolicy({ ...policy, earnedDays: Number(e.target.value) || 0 })
                    }
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    ≈ {annualPreview(policy.earnedDays)} / year
                  </p>
                </div>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={policy.carryForwardEarned}
                  onChange={(e) =>
                    setPolicy({ ...policy, carryForwardEarned: e.target.checked })
                  }
                />
                Allow earned leave carry-forward
              </label>

              <Button size="sm" icon={Save} onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save policy"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
