"use client"

import * as React from "react"
import {
  HardDrive,
  Database,
  Sparkles,
  Cloud,
  RefreshCw,
  Search,
  Building2,
  FileStack,
} from "lucide-react"
import { KPICard } from "@/components/dashboard/KPICard"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type InstitutionUsage = {
  tenantId: string
  tenantName: string
  centerCount: number
  centerNames: string[]
  status: string
  cloudinary: {
    bytes: number
    bytesLabel: string
    files: number
    lastUploadAt: string | null
  }
  mongo: {
    bytes: number
    bytesLabel: string
    documents: number
  }
  ai: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
    requests: number
    lastUsedAt: string | null
  }
}

type PlatformUsageResponse = {
  institutions: InstitutionUsage[]
  totals: {
    cloudinaryBytes: number
    cloudinaryBytesLabel: string
    cloudinaryFiles: number
    mongoBytes: number
    mongoBytesLabel: string
    mongoDocuments: number
    aiTotalTokens: number
    aiRequests: number
  }
  cloudinaryAccount?: {
    configured: boolean
    storageBytes?: number
    storageLabel?: string
    bandwidthBytes?: number
    bandwidthLabel?: string
    resources?: number
    derivedResources?: number
  }
  generatedAt?: string
}

function formatTokens(value: number) {
  return new Intl.NumberFormat("en-IN").format(value || 0)
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function StoragePage() {
  const { user, addNotification } = useStore()
  const role = user?.role || "owner"

  const [data, setData] = React.useState<PlatformUsageResponse | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [refreshing, setRefreshing] = React.useState(false)

  const loadUsage = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    setFetchError("")
    try {
      const response = (await api.getPlatformUsage()) as PlatformUsageResponse
      setData(response)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load usage data"
      setFetchError(message)
      addNotification({
        title: "Usage load failed",
        description: message,
        type: "system",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [addNotification])

  React.useEffect(() => {
    if (role === "super_admin") {
      loadUsage()
    }
  }, [role, loadUsage])

  const institutions = data?.institutions ?? []
  const totals = data?.totals
  const cloudinaryAccount = data?.cloudinaryAccount

  const filtered = institutions.filter((row) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      row.tenantName.toLowerCase().includes(q) ||
      row.tenantId.toLowerCase().includes(q) ||
      row.centerNames.some((name) => name.toLowerCase().includes(q))
    )
  })

  if (role !== "super_admin") {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Storage &amp; Tokens is available to Super Admin only.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Storage &amp; Tokens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cloudinary storage, MongoDB footprint, and AI token usage across all institutions.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => loadUsage(true)}
          disabled={loading || refreshing}
          className="gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {fetchError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="py-4 text-sm text-destructive">{fetchError}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Cloudinary (Tracked)"
          value={totals?.cloudinaryBytesLabel ?? "—"}
          subtext={`${totals?.cloudinaryFiles ?? 0} files uploaded via app`}
          icon={Cloud}
          delay={0}
        />
        <KPICard
          title="MongoDB (Estimated)"
          value={totals?.mongoBytesLabel ?? "—"}
          subtext={`${formatTokens(totals?.mongoDocuments ?? 0)} documents`}
          icon={Database}
          delay={0.05}
        />
        <KPICard
          title="AI Tokens"
          value={formatTokens(totals?.aiTotalTokens ?? 0)}
          subtext={`${formatTokens(totals?.aiRequests ?? 0)} Gemini requests`}
          icon={Sparkles}
          delay={0.1}
        />
        <KPICard
          title="Institutions"
          value={institutions.length}
          subtext="Active tenants on platform"
          icon={Building2}
          delay={0.15}
        />
      </div>

      {cloudinaryAccount?.configured && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <HardDrive className="h-4 w-4" />
              Cloudinary Account
            </CardTitle>
            <CardDescription>Live account-level usage from Cloudinary API</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Storage</p>
              <p className="mt-1 text-lg font-bold">{cloudinaryAccount.storageLabel ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bandwidth</p>
              <p className="mt-1 text-lg font-bold">{cloudinaryAccount.bandwidthLabel ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resources</p>
              <p className="mt-1 text-lg font-bold">{formatTokens(cloudinaryAccount.resources ?? 0)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Derived</p>
              <p className="mt-1 text-lg font-bold">{formatTokens(cloudinaryAccount.derivedResources ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Per Institution
              </CardTitle>
              <CardDescription>
                Usage breakdown by tenant
                {data?.generatedAt ? ` · Updated ${formatDate(data.generatedAt)}` : ""}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search institution or center..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-sm text-muted-foreground">Loading usage data...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">No institutions match your search.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left">
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Institution</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Centers</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Cloudinary</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">MongoDB</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">AI Tokens</th>
                    <th className="px-4 py-3 font-semibold text-muted-foreground">Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const lastActivity = [row.cloudinary.lastUploadAt, row.ai.lastUsedAt]
                      .filter(Boolean)
                      .map((d) => new Date(d as string))
                      .sort((a, b) => b.getTime() - a.getTime())[0]

                    return (
                      <tr key={row.tenantId} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.tenantName}</div>
                          <div className="text-xs text-muted-foreground">{row.tenantId}</div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "mt-1.5 text-[10px]",
                              row.status === "active"
                                ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                                : "border-amber-500/30 text-amber-600 dark:text-amber-400"
                            )}
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.centerCount}</div>
                          <div className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {row.centerNames.join(", ") || "—"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.cloudinary.bytesLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.cloudinary.files} file{row.cloudinary.files === 1 ? "" : "s"}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.mongo.bytesLabel}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTokens(row.mongo.documents)} docs
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{formatTokens(row.ai.totalTokens)}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatTokens(row.ai.requests)} req · in {formatTokens(row.ai.promptTokens)} / out{" "}
                            {formatTokens(row.ai.completionTokens)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {lastActivity ? formatDate(lastActivity.toISOString()) : "—"}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
