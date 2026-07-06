"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useParams } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Trash2,
  Layers,
  ShieldAlert,
  ChevronRight,
  Globe,
  Mail,
  Phone,
  MapPin,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import {
  type CenterConfig,
  type ConfigTabId,
  DEFAULT_CENTER_CONFIG,
  centerFromApi,
  centerToPayload,
} from "@/lib/centerConfig"
import { CenterConfigTabs } from "@/components/centers/CenterConfigTabs"

const STATUS_STYLES: Record<CenterConfig["status"], string> = {
  active: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  inactive: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20",
  maintenance: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
}

export default function EditCenterPage() {
  const router = useRouter()
  const params = useParams()
  const centerId = params.id as string

  const { addNotification, setOwnerEnabledModules } = useStore()
  const [config, setConfig] = React.useState<CenterConfig>(DEFAULT_CENTER_CONFIG)
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<ConfigTabId>("general")
  const [loadError, setLoadError] = React.useState("")
  const [isDirty, setIsDirty] = React.useState(false)

  const updateConfig = React.useCallback((patch: Partial<CenterConfig>) => {
    setIsDirty(true)
    setConfig((prev) => ({ ...prev, ...patch }))
  }, [])

  React.useEffect(() => {
    const fetchCenter = async () => {
      try {
        setLoadError("")
        const data = await api.getCenterById(centerId)
        if (data) {
          setConfig(centerFromApi(data as Record<string, unknown>))
        }
      } catch (err: unknown) {
        setLoadError(err instanceof Error ? err.message : "Failed to load center")
      } finally {
        setIsLoading(false)
      }
    }
    fetchCenter()
  }, [centerId])

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!config.name || !config.location || !config.manager || !config.email) {
      alert("Please complete all required fields under General.")
      setActiveTab("general")
      return
    }
    if (config.enabledModules.length === 0) {
      alert("Enable at least one module.")
      setActiveTab("modules")
      return
    }

    setIsSaving(true)
    try {
      await api.updateCenter(centerId, centerToPayload(config))
      setIsDirty(false)
      addNotification({
        title: "Settings saved",
        description: `Configuration for ${config.name} has been updated.`,
        type: "system",
      })
      router.push("/centers")
    } catch {
      alert("Failed to save configuration.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Permanently delete "${config.name}"? This cannot be undone.`)) return
    try {
      await api.deleteCenter(centerId)
      router.push("/centers")
    } catch {
      alert("Failed to delete center.")
    }
  }

  const handleApplyToOwner = () => {
    setOwnerEnabledModules(config.enabledModules)
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `centerPolicy:${config.tenantName}`,
        JSON.stringify({
          enabledModules: config.enabledModules,
          minAttendancePercent: config.minAttendancePercent,
          lowAttendanceThreshold: config.lowAttendanceThreshold,
          currency: config.currency,
          brandColor: config.brandColor,
          allowStudentPortal: config.allowStudentPortal,
          allowLeadCsvImport: config.allowLeadCsvImport,
          allowBdeDirectConvert: config.allowBdeDirectConvert,
          enableCampaigns: config.enableCampaigns,
          enableHrModule: config.enableHrModule,
          feeReminderAutoSend: config.feeReminderAutoSend,
        })
      )
    }
    addNotification({
      title: "Policy applied",
      description: "Owner portal preview updated with current modules and policies.",
      type: "system",
    })
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Loading center settings…</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center gap-4 px-4">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h2 className="text-lg font-semibold">Center not found</h2>
        <p className="text-sm text-muted-foreground max-w-md">{loadError}</p>
        <Button variant="outline" onClick={() => router.push("/centers")}>Back to centers</Button>
      </div>
    )
  }

  return (
    <div className="pb-28">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
        <Link href="/centers" className="hover:text-foreground transition-colors">Centers</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium truncate max-w-[200px]">{config.name}</span>
        <ChevronRight className="h-3.5 w-3.5" />
        <span>Settings</span>
      </nav>

      {/* Hero header */}
      <div className="rounded-2xl border border-border/80 bg-card overflow-hidden mb-6 shadow-xs">
        <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${config.brandColor}, ${config.secondaryBrandColor})` }} />
        <div className="p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/80 text-lg font-bold shadow-xs"
                style={{ backgroundColor: `${config.brandColor}18`, color: config.brandColor }}
              >
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="" className="h-10 w-10 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                ) : (
                  config.name.slice(0, 2).toUpperCase()
                )}
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
                    {config.name}
                  </h1>
                  <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize", STATUS_STYLES[config.status])}>
                    {config.status}
                  </span>
                  {isDirty && (
                    <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-600">
                      Unsaved changes
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{config.tenantName} · Training center configuration</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" />{config.city || config.location}</span>
                  <span className="inline-flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" />{config.timezone}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" />{config.operatingHoursStart} – {config.operatingHoursEnd}</span>
                  <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" />{config.email}</span>
                  {config.phone && <span className="inline-flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{config.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button type="button" variant="outline" size="sm" icon={Layers} onClick={handleApplyToOwner}>
                Apply to owner
              </Button>
              <Button type="button" variant="outline" size="sm" icon={Trash2} onClick={handleDelete} className="text-destructive border-destructive/20 hover:bg-destructive/5">
                Delete
              </Button>
            </div>
          </div>

          {/* Metric strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-border/60">
            {[
              { label: "Modules", value: `${config.enabledModules.length}/${8}` },
              { label: "Currency", value: config.currency },
              { label: "Attendance min.", value: `${config.minAttendancePercent}%` },
              { label: "Gateway", value: config.paymentGateway },
            ].map((item) => (
              <div key={item.label} className="rounded-lg bg-muted/40 px-4 py-3 border border-border/50">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5 capitalize">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Settings shell */}
      <form onSubmit={handleSave}>
        <div className="rounded-2xl border border-border/80 bg-card shadow-xs overflow-hidden">
          <CenterConfigTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            config={config}
            updateConfig={updateConfig}
          />
        </div>

        {/* Sticky action bar — Stripe / Vercel pattern */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/90 backdrop-blur-md md:left-[var(--sidebar-width,0px)]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <button
              type="button"
              onClick={() => router.push("/centers")}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to centers
            </button>
            <div className="flex items-center gap-2 sm:ml-auto">
              <Button type="button" variant="outline" size="sm" onClick={() => router.push("/centers")}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={Save} disabled={isSaving}>
                {isSaving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
