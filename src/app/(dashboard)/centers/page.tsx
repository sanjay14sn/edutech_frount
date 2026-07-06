"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2, Globe, ShieldCheck, Activity, Search, Plus,
  MapPin, User, Mail, Edit2, Trash2, Layers, AlertTriangle, X
} from "lucide-react"
import { KPICard } from "@/components/dashboard/KPICard"
import { Card, CardHeader, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { useStore } from "@/store/useStore"
import { type ModuleKey, type TrainingCenter } from "@/store/useStore"
import { api } from "@/lib/api"

export default function CentersPage() {
  const router = useRouter()
  const { addNotification, setOwnerEnabledModules } = useStore()

  const [centers, setCenters] = React.useState<TrainingCenter[]>([])
  const [loading, setLoading] = React.useState(true)
  const [fetchError, setFetchError] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [tenantFilter, setTenantFilter] = React.useState("all")
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // Custom delete modal state
  const [deleteModal, setDeleteModal] = React.useState<{ id: string; name: string } | null>(null)

  React.useEffect(() => {
    loadCenters()
  }, [])

  const loadCenters = async () => {
    setLoading(true)
    setFetchError("")
    setCenters([])
    try {
      const data = await api.getCenters()
      setCenters((data || []).map((c: any) => ({
        ...c,
        id: String(c._id ?? c.id),
        name: c.name || "Unnamed Center",
        tenantName: c.tenantName || "—",
        location: c.location || "—",
        manager: c.manager || "—",
        email: c.email || "—",
        status: c.status || "inactive",
        enabledModules: Array.isArray(c.enabledModules) ? c.enabledModules : [],
      })))
    } catch (err: any) {
      console.error("Failed to load centers:", err)
      setFetchError(err.message || "Failed to load centers")
    } finally {
      setLoading(false)
    }
  }

  const confirmDelete = (id: string, name: string) => {
    setDeleteModal({ id, name })
  }

  const handleDeleteCenter = async () => {
    if (!deleteModal) return
    const { id, name } = deleteModal
    setDeleteModal(null)
    setDeletingId(id)
    try {
      console.log("Deleting center with id:", id)
      await api.deleteCenter(id)
      setCenters(prev => prev.filter(c => c.id !== id))
      addNotification({ title: "Center Deleted", description: `"${name}" removed.`, type: "system" })
    } catch (err) {
      console.error("Delete failed:", err)
      alert("Failed to delete center. Please try again.")
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (id: string, current: TrainingCenter["status"]) => {
    const next = ({ active: "inactive", inactive: "maintenance", maintenance: "active" } as const)[current]
    try {
      await api.updateCenter(id, { status: next })
      setCenters(prev => prev.map(c => c.id === id ? { ...c, status: next } : c))
      addNotification({ title: "Status Updated", description: `Hub status changed to ${next}.`, type: "system" })
    } catch (err) {
      console.error(err)
      alert("Failed to update status")
    }
  }

  const filteredCenters = centers.filter(c => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      (c.name || "").toLowerCase().includes(q) ||
      (c.location || "").toLowerCase().includes(q) ||
      (c.manager || "").toLowerCase().includes(q)
    const matchTenant = tenantFilter === "all" || c.tenantName === tenantFilter
    return matchSearch && matchTenant
  })

  const uniqueTenantNames = Array.from(new Set(centers.map(c => c.tenantName)))
  const activeCount = centers.filter(c => c.status === "active").length
  const maintenanceCount = centers.filter(c => c.status === "maintenance").length

  return (
    <div className="space-y-6">
      {/* Custom Delete Confirmation Modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setDeleteModal(null)}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Delete Center</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteModal.name}"</span>? This action cannot be undone.
                </p>
              </div>
              <button
                onClick={() => setDeleteModal(null)}
                className="ml-auto shrink-0 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setDeleteModal(null)}>
                Cancel
              </Button>
              <button
                onClick={handleDeleteCenter}
                className="inline-flex items-center gap-1.5 rounded-md bg-red-500 hover:bg-red-600 text-white text-xs font-semibold px-3 py-1.5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Center
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <span>Centers & Branches</span>
            <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">
              Super Admin
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Register regional training hubs, configure module permissions, and push access rules to owner portals.
          </p>
        </div>
      </div>

      {/* KPI Stats */}
      {fetchError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {fetchError}
          <Button variant="outline" size="sm" className="ml-auto" onClick={loadCenters}>Retry</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Total Centers" value={centers.length.toString()} subtext="Registered hubs" icon={Globe} delay={0.05} />
        <KPICard title="Active Locations" value={activeCount.toString()} subtext="Operational training hubs" icon={ShieldCheck} delay={0.1} />
        <KPICard title="Under Maintenance" value={maintenanceCount.toString()} subtext="Scheduled hub checks" icon={Activity} delay={0.15} />
      </div>

      {/* Search & Filter Bar */}
      <Card className="bg-card">
        <CardContent className="p-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search centers, locations..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9 bg-card border-border text-xs h-9" />
            </div>
            <div className="w-48">
              <Select value={tenantFilter} onChange={e => setTenantFilter(e.target.value)} className="bg-card border-border text-xs h-9">
                <option value="all">All Institutes</option>
                {uniqueTenantNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push("/centers/new")} className="cursor-pointer">
            Add Center
          </Button>
        </CardContent>
      </Card>

      {/* Center Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredCenters.map((center) => (
          <Card key={center.id} className="bg-card flex flex-col justify-between hover:border-border transition-all duration-200">
            <CardHeader className="pb-3 border-b border-border/40">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">{center.tenantName}</p>
                  <h3 className="text-sm font-extrabold text-foreground">{center.name}</h3>
                </div>
                <button type="button" onClick={() => handleToggleStatus(center.id, center.status)} title="Click to cycle status" className="cursor-pointer transition-transform active:scale-95">
                  <Badge variant={center.status === "active" ? "success" : center.status === "maintenance" ? "warning" : "secondary"}>
                    {center.status}
                  </Badge>
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-3 pt-4 text-xs text-muted-foreground">
              <div className="space-y-1.5">
                <p className="flex items-center gap-2 text-foreground"><MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />{center.location}</p>
                <p className="flex items-center gap-2"><User className="h-4 w-4 shrink-0" />Manager: <strong className="text-foreground">{center.manager}</strong></p>
                <p className="flex items-center gap-2"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{center.email}</span></p>
              </div>

              {/* Module badges */}
              <div className="flex flex-wrap gap-1 pt-1">
                {(center.enabledModules || []).map(mod => (
                  <span key={mod} className="inline-flex items-center rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-semibold border border-primary/20 uppercase tracking-wide">
                    {mod === "crm" ? "CRM" : mod === "fees" ? "Fees" : mod === "jobs" ? "Jobs" : mod.charAt(0).toUpperCase() + mod.slice(1)}
                  </span>
                ))}
              </div>

              <div className="pt-1 border-t border-border/40" />

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" icon={Edit2} onClick={() => router.push(`/centers/${center.id}`)} className="text-xs py-1 px-2 border-border/60 hover:bg-muted">Edit</Button>
                <button
                  onClick={() => confirmDelete(center.id, center.name)}
                  disabled={deletingId === center.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs font-medium px-2 py-1 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deletingId === center.id ? "Deleting..." : "Delete"}
                </button>
                <Button variant="outline" size="sm" icon={Layers}
                  onClick={() => {
                    setOwnerEnabledModules(center.enabledModules)
                    addNotification({ title: "Permissions Applied", description: `Owner portal now shows modules for "${center.name}".`, type: "system" })
                  }}
                  className="text-xs py-1 px-2 border-primary/30 text-primary hover:bg-primary/10">
                  Apply to Owner
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Loading skeleton */}
        {loading && Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card border border-border/40 rounded-xl p-5 space-y-3 animate-pulse">
            <div className="flex justify-between">
              <div className="space-y-1.5">
                <div className="h-2.5 w-24 bg-secondary rounded" />
                <div className="h-3.5 w-36 bg-secondary rounded" />
              </div>
              <div className="h-5 w-16 bg-secondary rounded-full" />
            </div>
            <div className="space-y-2 pt-2">
              <div className="h-2.5 w-full bg-secondary rounded" />
              <div className="h-2.5 w-3/4 bg-secondary rounded" />
              <div className="h-2.5 w-2/3 bg-secondary rounded" />
            </div>
            <div className="flex gap-1 pt-1">
              {[1,2,3].map(j => <div key={j} className="h-4 w-14 bg-secondary rounded" />)}
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && filteredCenters.length === 0 && (
          <div className="col-span-full py-16 text-center border border-dashed border-border rounded-xl">
            <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground">No institutes registered yet</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">Click "Add Center" to register your first training hub.</p>
          </div>
        )}
      </div>
    </div>
  )
}
