"use client"

import * as React from "react"
import {
  BarChart3, Award, CreditCard, Target, TrendingUp, Loader2
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { formatCurrency } from "@/lib/utils"
import { api } from "@/lib/api"

type PerformanceHistory = {
  month: string
  monthLabel: string
  target: number
  achieved: number
  achievedCount: number
  revenue: number
  incentive: number
  targetPercent: number
  releaseStatus: "accruing" | "released" | "pending"
}

type PerformancePayload = {
  profile: {
    monthlyTarget: number
    targetType: "revenue" | "leads"
    commissionEnabled?: boolean
    commissionPercentage: number
    joiningDate?: string
  }
  current: {
    achievedCount: number
    targetCount: number
    targetPercent: number
    remaining: number
    revenue: number
    incentive: number
    conversionRate: number
    totalAssigned: number
    convertedLeads: number
  }
  history: PerformanceHistory[]
}

function releaseBadgeVariant(status: PerformanceHistory["releaseStatus"]) {
  if (status === "released") return "success" as const
  if (status === "accruing") return "warning" as const
  return "outline" as const
}

function releaseLabel(status: PerformanceHistory["releaseStatus"]) {
  if (status === "released") return "Released"
  if (status === "accruing") return "Accruing"
  return "Pending"
}

export default function PerformancePage() {
  const { user } = useStore()
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PerformancePayload | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const result = await api.getBdePerformance(12)
        setData(result)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load performance data")
      } finally {
        setLoading(false)
      }
    }
    if (user?.role === "bde") load()
    else setLoading(false)
  }, [user?.role])

  if (user?.role !== "bde") {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <span>Commission & Target Dashboard</span>
        </h1>
        <p className="text-sm text-muted-foreground">
          This dashboard is available for BDE users only.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs uppercase tracking-wider">Loading performance data…</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <span>My Commission & Target Dashboard</span>
        </h1>
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error || "Unable to load performance data"}
        </div>
      </div>
    )
  }

  const { profile, current, history } = data
  const isRevenueTarget = profile.targetType === "revenue"
  const commissionEnabled = profile.commissionEnabled ?? false
  const joinedLabel = profile.joiningDate
    ? new Date(profile.joiningDate + "T12:00:00").toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null
  const remainingLabel = isRevenueTarget
    ? `${formatCurrency(current.remaining)} revenue remaining`
    : `${current.remaining} conversions remaining`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-primary" />
          <span>My Commission & Target Dashboard</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {commissionEnabled
            ? "Review your monthly targets progress, sales commission structures, and unlocked payout history slabs."
            : "Review your monthly targets progress and conversion performance."}
          {joinedLabel && (
            <span className="block mt-1">
              Performance tracking since <strong className="text-foreground">{joinedLabel}</strong>.
            </span>
          )}
        </p>
      </div>

      <div
        className={`grid gap-4 ${
          commissionEnabled ? "md:grid-cols-4" : "md:grid-cols-2"
        }`}
      >
        <Card className="bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Target Achieved</span>
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground">
                {isRevenueTarget
                  ? `${formatCurrency(current.achievedCount)} / ${formatCurrency(current.targetCount)}`
                  : `${current.achievedCount} / ${current.targetCount}`}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">{remainingLabel}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Conversion rate</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground">{current.conversionRate}%</h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Out of {current.totalAssigned} total assigned leads ({current.convertedLeads} converted)
              </p>
            </div>
          </CardContent>
        </Card>

        {commissionEnabled && (
        <>
        <Card className="bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">My Commission Rate</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-foreground">
                {profile.commissionPercentage.toFixed(1)}%
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                {isRevenueTarget ? "Revenue-based target bracket" : "Standard BDE sales commission bracket"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardContent className="p-5 space-y-2">
            <div className="flex justify-between items-center text-muted-foreground">
              <span className="text-[10px] font-bold uppercase tracking-wider">Commissions Unlocked</span>
              <CreditCard className="h-4 w-4 text-pink-500" />
            </div>
            <div>
              <h3 className="text-2xl font-extrabold text-emerald-500">
                {formatCurrency(current.incentive)}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-1">
                Calculated on {formatCurrency(current.revenue)} revenue this month
              </p>
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </div>

      <div className={`grid gap-6 ${commissionEnabled ? "md:grid-cols-3" : ""}`}>
        <Card className={`bg-card ${commissionEnabled ? "md:col-span-2" : ""}`}>
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <BarChart3 className="h-4.5 w-4.5 text-primary" />
              <span>Target Achievement History</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No conversion history yet. Converted leads will appear here by month.
              </p>
            ) : (
              <div className="space-y-4">
                {history.map((row) => {
                  const percent = row.targetPercent
                  const progressLabel = isRevenueTarget
                    ? `${formatCurrency(row.achievedCount)} / ${formatCurrency(row.target)} (${percent}%)`
                    : `${row.achieved} / ${row.target} Converted (${percent}%)`

                  return (
                    <div key={row.month} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-foreground">
                        <span>{row.monthLabel}</span>
                        <span>{progressLabel}</span>
                      </div>
                      <div className="w-full bg-muted h-3 rounded-md overflow-hidden relative">
                        <div
                          className="bg-primary h-full rounded-md transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {commissionEnabled && (
        <Card className="bg-card">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <CreditCard className="h-4.5 w-4.5 text-primary" />
              <span>Incentives Release Ledger</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-xs">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8 px-4">
                Commission ledger entries will appear once you generate conversion revenue.
              </p>
            ) : (
              <div className="divide-y divide-border/60">
                {history.map((row) => (
                  <div
                    key={row.month}
                    className="p-3.5 flex justify-between items-center hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-foreground">{row.monthLabel} Ledger</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Revenue: {formatCurrency(row.revenue)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">{formatCurrency(row.incentive)}</p>
                      <Badge
                        variant={releaseBadgeVariant(row.releaseStatus)}
                        className="text-[9px] mt-1 font-bold"
                      >
                        {releaseLabel(row.releaseStatus)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  )
}
