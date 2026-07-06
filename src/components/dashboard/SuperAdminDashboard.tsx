"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Building2,
  Users,
  Activity,
  ShieldCheck,
  Zap,
  MapPin,
  Mail,
  User,
  Plus,
  Trash2,
  Edit2,
  Search,
  Settings,
  Layers,
  MessageSquare,
  Megaphone,
  Bell,
  RefreshCw,
  GraduationCap,
  CheckCircle2,
  Send,
  ExternalLink,
  Server,
  Globe,
  Save,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { KPICard } from "./KPICard"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"
import { type ModuleKey, ALL_MODULES } from "@/store/useStore"
import { api } from "@/lib/api"

interface TrainingCenter {
  id: string
  name: string
  tenantName: string
  location: string
  manager: string
  email: string
  status: "active" | "inactive" | "maintenance"
  enabledModules: ModuleKey[]
}

interface SupportTicket {
  id: string
  subject: string
  category: string
  priority: "low" | "medium" | "high"
  status: "open" | "in-progress" | "resolved"
  message: string
  createdAt: string
  response?: string
  userName?: string
  userRole?: string
}

const MODULE_LABELS: Record<ModuleKey, string> = {
  crm: "CRM",
  students: "Students",
  trainers: "Trainers",
  courses: "Courses",
  attendance: "Attendance",
  fees: "Fees",
  jobs: "Jobs",
  analytics: "Analytics",
}

const STATUS_COLORS = ["#10b981", "#f59e0b", "#64748b"]

export function SuperAdminDashboard() {
  const router = useRouter()
  const { addNotification, setOwnerEnabledModules, tenants, fetchSupportQueueCount } = useStore()

  const [activeTab, setActiveTab] = React.useState("overview")
  const [centers, setCenters] = React.useState<TrainingCenter[]>([])
  const [metrics, setMetrics] = React.useState<any>(null)
  const [recentTenants, setRecentTenants] = React.useState<any[]>([])
  const [enrollmentData, setEnrollmentData] = React.useState<any[]>([])
  const [statusBreakdown, setStatusBreakdown] = React.useState<any[]>([])
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [tenantFilter, setTenantFilter] = React.useState("all")
  const [ticketFilter, setTicketFilter] = React.useState("all")

  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [editingCenter, setEditingCenter] = React.useState<TrainingCenter | null>(null)
  const [centerName, setCenterName] = React.useState("")
  const [selectedTenantName, setSelectedTenantName] = React.useState(tenants[0]?.name || "IMS")
  const [location, setLocation] = React.useState("")
  const [manager, setManager] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [status, setStatus] = React.useState<TrainingCenter["status"]>("active")
  const [dialogModules, setDialogModules] = React.useState<ModuleKey[]>([...ALL_MODULES])

  const [selectedTicket, setSelectedTicket] = React.useState<SupportTicket | null>(null)
  const [ticketResponse, setTicketResponse] = React.useState("")
  const [ticketStatus, setTicketStatus] = React.useState<SupportTicket["status"]>("open")
  const [savingTicket, setSavingTicket] = React.useState(false)

  const [broadcastTitle, setBroadcastTitle] = React.useState("")
  const [broadcastBody, setBroadcastBody] = React.useState("")
  const [broadcastTarget, setBroadcastTarget] = React.useState("all")
  const [sendingBroadcast, setSendingBroadcast] = React.useState(false)

  const [maintenanceMode, setMaintenanceMode] = React.useState(false)
  const [apiRateLimit, setApiRateLimit] = React.useState("1000")
  const [sessionTimeout, setSessionTimeout] = React.useState("480")

  const loadAll = React.useCallback(async () => {
    try {
      const [metricsData, centersData, ticketsData] = await Promise.all([
        api.getDashboardMetrics(),
        api.getCenters(),
        api.getSupportTickets().catch(() => []),
      ])

      if (metricsData.metrics) setMetrics(metricsData.metrics)
      if (metricsData.recentTenants) setRecentTenants(metricsData.recentTenants)
      if (metricsData.enrollmentData) setEnrollmentData(metricsData.enrollmentData)
      if (metricsData.statusBreakdown) setStatusBreakdown(metricsData.statusBreakdown)

      setCenters(
        (centersData || []).map((c: any) => ({
          ...c,
          id: String(c._id ?? c.id),
          enabledModules: c.enabledModules || [...ALL_MODULES],
        }))
      )
      setTickets(ticketsData || [])
      void fetchSupportQueueCount()
    } catch (err) {
      console.error("Failed to load super admin data:", err)
    } finally {
      setIsLoading(false)
      setRefreshing(false)
    }
  }, [fetchSupportQueueCount])

  React.useEffect(() => {
    loadAll()
  }, [loadAll])

  const handleRefresh = () => {
    setRefreshing(true)
    loadAll()
  }

  const toggleDialogModule = (mod: ModuleKey) => {
    setDialogModules((prev) =>
      prev.includes(mod) ? prev.filter((m) => m !== mod) : [...prev, mod]
    )
  }

  const openCreateDialog = () => {
    router.push("/centers/new")
  }

  const openEditDialog = (center: TrainingCenter) => {
    router.push(`/centers/${center.id}`)
  }

  const handleDeleteCenter = async (id: string, name: string) => {
    if (!confirm(`Delete center "${name}"? This cannot be undone.`)) return
    try {
      await api.deleteCenter(id)
      setCenters((prev) => prev.filter((c) => c.id !== id))
      addNotification({
        title: "Center Deleted",
        description: `"${name}" has been removed.`,
        type: "system",
      })
    } catch {
      alert("Failed to delete center")
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: TrainingCenter["status"]) => {
    const nextStatusMap: Record<string, TrainingCenter["status"]> = {
      active: "inactive",
      inactive: "maintenance",
      maintenance: "active",
    }
    const nextStatus = nextStatusMap[currentStatus]
    try {
      await api.updateCenter(id, { status: nextStatus })
      setCenters((prev) => prev.map((c) => (c.id === id ? { ...c, status: nextStatus } : c)))
      addNotification({
        title: "Status Updated",
        description: `Center status changed to ${nextStatus}.`,
        type: "system",
      })
    } catch {
      alert("Failed to update status")
    }
  }

  const handleSaveCenter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!centerName || !location || !manager || !email) {
      alert("Please fill in all required fields.")
      return
    }

    const payload = {
      name: centerName,
      tenantName: selectedTenantName,
      location,
      manager,
      email,
      status,
      enabledModules: dialogModules,
    }

    try {
      if (editingCenter) {
        const updated = await api.updateCenter(editingCenter.id, payload)
        setCenters((prev) =>
          prev.map((c) =>
            c.id === editingCenter.id ? { ...updated, id: String(updated._id ?? updated.id) } : c
          )
        )
        addNotification({ title: "Center Updated", description: `"${centerName}" saved.`, type: "system" })
      } else {
        const created = await api.createCenter(payload)
        setCenters([{ ...created, id: String(created._id ?? created.id) }, ...centers])
        addNotification({ title: "Center Created", description: `"${centerName}" registered.`, type: "system" })
      }
      setIsDialogOpen(false)
    } catch {
      alert("Failed to save center")
    }
  }

  const openTicketPanel = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setTicketResponse(ticket.response || "")
    setTicketStatus(ticket.status)
  }

  const handleSaveTicket = async () => {
    if (!selectedTicket) return
    setSavingTicket(true)
    try {
      const updated = await api.updateSupportTicket(selectedTicket.id, {
        status: ticketStatus,
        response: ticketResponse,
      })
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? { ...t, ...updated, id: updated.id || selectedTicket.id } : t))
      )
      addNotification({
        title: "Ticket Updated",
        description: `"${selectedTicket.subject}" marked as ${ticketStatus}.`,
        type: "system",
      })
      setSelectedTicket(null)
      void fetchSupportQueueCount()
    } catch (err: any) {
      alert(err.message || "Failed to update ticket")
    } finally {
      setSavingTicket(false)
    }
  }

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!broadcastTitle.trim() || !broadcastBody.trim()) {
      alert("Title and message are required.")
      return
    }
    setSendingBroadcast(true)
    try {
      const targetRoles =
        broadcastTarget === "all"
          ? undefined
          : broadcastTarget === "owners"
            ? (["owner"] as const)
            : broadcastTarget === "trainers"
              ? (["trainer"] as const)
              : (["bde"] as const)

      await api.createNotification({
        title: broadcastTitle.trim(),
        description: broadcastBody.trim(),
        type: "system",
        ...(targetRoles ? { targetRoles: [...targetRoles] } : {}),
      })
      addNotification({
        title: "Broadcast Sent",
        description: `"${broadcastTitle}" delivered platform-wide.`,
        type: "system",
      })
      setBroadcastTitle("")
      setBroadcastBody("")
    } catch (err: any) {
      alert(err.message || "Failed to send broadcast")
    } finally {
      setSendingBroadcast(false)
    }
  }

  const filteredCenters = centers.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q) ||
      c.manager.toLowerCase().includes(q)
    const matchesTenant = tenantFilter === "all" || c.tenantName === tenantFilter
    return matchesSearch && matchesTenant
  })

  const filteredTickets = tickets.filter((t) => {
    if (ticketFilter === "all") return true
    return t.status === ticketFilter
  })

  const uniqueTenants = Array.from(new Set(centers.map((c) => c.tenantName).filter(Boolean)))

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading control center…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-amber-500" />
            <span>Super Admin Control Center</span>
            <Badge variant="outline" className="text-amber-500 border-amber-500/20 bg-amber-500/5">
              Platform Root
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage tenants, centers, support queue, broadcasts, and platform-wide settings from one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
          <Link href="/centers/new">
            <Button variant="primary" size="sm" icon={Plus}>
              Register Center
            </Button>
          </Link>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-card border border-border p-1 rounded-xl">
          <TabsTrigger value="overview" className="text-xs gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="centers" className="text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            Centers ({centers.length})
          </TabsTrigger>
          <TabsTrigger value="support" className="text-xs gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            Support ({(metrics?.openTickets ?? 0) + (metrics?.inProgressTickets ?? 0)})
          </TabsTrigger>
          <TabsTrigger value="broadcast" className="text-xs gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Broadcast
          </TabsTrigger>
          <TabsTrigger value="platform" className="text-xs gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Platform
          </TabsTrigger>
        </TabsList>

        {/* ── OVERVIEW ── */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KPICard
              title="Active Centers"
              value={String(metrics?.activeCentersCount ?? 0)}
              subtext={`${metrics?.totalCenters ?? 0} total registered`}
              icon={Building2}
              delay={0.05}
            />
            <KPICard
              title="Platform Students"
              value={(metrics?.totalStudents ?? 0).toLocaleString()}
              subtext="Across all tenants"
              icon={Users}
              delay={0.1}
            />
            <KPICard
              title="Trainers"
              value={String(metrics?.totalTrainers ?? 0)}
              subtext={`${metrics?.totalOwners ?? 0} owners · ${metrics?.totalBdes ?? 0} BDEs`}
              icon={GraduationCap}
              delay={0.15}
            />
            <KPICard
              title="Open Tickets"
              value={String((metrics?.openTickets ?? 0) + (metrics?.inProgressTickets ?? 0))}
              subtext={`${metrics?.openTickets ?? 0} open · ${metrics?.inProgressTickets ?? 0} in progress`}
              icon={MessageSquare}
              delay={0.2}
            />
            <KPICard
              title="API Uptime"
              value={`${metrics?.uptime ?? 99.9}%`}
              subtext="Last 30 days"
              icon={Server}
              delay={0.25}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Tenant Distribution</CardTitle>
                <CardDescription>Centers and estimated students per institute.</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                {enrollmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={enrollmentData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="tenant" stroke="var(--muted-foreground)" fontSize={10} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={10} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--card)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                        }}
                      />
                      <Bar dataKey="centers" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Centers" />
                      <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} name="Students" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No tenant data yet. Register your first center.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm">Center Status Breakdown</CardTitle>
                <CardDescription>Operational health across all hubs.</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center">
                {statusBreakdown.some((s) => s.count > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown.filter((s) => s.count > 0)}
                        dataKey="count"
                        nameKey="status"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {statusBreakdown.map((_, i) => (
                          <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No centers registered.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Recent Tenant Registrations</CardTitle>
                <CardDescription>Latest centers onboarded to the platform.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setActiveTab("centers")}>
                Manage All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                      <th className="py-2.5 pr-4">Center</th>
                      <th className="py-2.5 pr-4">Institute</th>
                      <th className="py-2.5 pr-4">Location</th>
                      <th className="py-2.5 pr-4">Plan</th>
                      <th className="py-2.5 pr-4">Modules</th>
                      <th className="py-2.5 pr-4">Status</th>
                      <th className="py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {recentTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-muted/20">
                        <td className="py-3 font-semibold text-foreground">{tenant.name}</td>
                        <td className="py-3 text-muted-foreground">{tenant.tenantName || "—"}</td>
                        <td className="py-3 text-muted-foreground">{tenant.location || "—"}</td>
                        <td className="py-3">
                          <Badge variant="outline" className="capitalize text-[10px]">
                            {tenant.plan}
                          </Badge>
                        </td>
                        <td className="py-3 text-muted-foreground">{tenant.modulesCount ?? 0} modules</td>
                        <td className="py-3">
                          <Badge
                            variant={
                              tenant.status === "active"
                                ? "success"
                                : tenant.status === "maintenance"
                                  ? "warning"
                                  : "secondary"
                            }
                          >
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px]"
                            onClick={() => router.push(`/centers/${tenant.id}`)}
                          >
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {recentTenants.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted-foreground">
                          No centers registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Manage Centers", icon: Building2, tab: "centers", desc: "CRUD, modules, status" },
              { label: "Support Queue", icon: MessageSquare, tab: "support", desc: "Respond to tickets" },
              { label: "Send Broadcast", icon: Megaphone, tab: "broadcast", desc: "Platform notifications" },
              { label: "Platform Settings", icon: Settings, tab: "platform", desc: "System controls" },
            ].map((action) => (
              <button
                key={action.tab}
                type="button"
                onClick={() => setActiveTab(action.tab)}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <action.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{action.label}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </TabsContent>

        {/* ── CENTERS ── */}
        <TabsContent value="centers" className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card border border-border rounded-xl p-4">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search centers…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={tenantFilter} onChange={(e) => setTenantFilter(e.target.value)} className="h-9 text-xs w-48">
                <option value="all">All Institutes</option>
                {uniqueTenants.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex gap-2">
              <Link href="/centers">
                <Button variant="outline" size="sm" icon={ExternalLink}>
                  Full View
                </Button>
              </Link>
              <Button variant="primary" size="sm" icon={Plus} onClick={openCreateDialog}>
                Add Center
              </Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCenters.map((center) => (
              <Card key={center.id} className="bg-card flex flex-col">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        {center.tenantName}
                      </p>
                      <CardTitle className="text-sm mt-0.5">{center.name}</CardTitle>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(center.id, center.status)}
                      className="cursor-pointer"
                      title="Click to cycle status"
                    >
                      <Badge
                        variant={
                          center.status === "active"
                            ? "success"
                            : center.status === "maintenance"
                              ? "warning"
                              : "secondary"
                        }
                      >
                        {center.status}
                      </Badge>
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs flex-1 flex flex-col">
                  <div className="space-y-1.5 text-muted-foreground">
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {center.location}
                    </p>
                    <p className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      {center.manager}
                    </p>
                    <p className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      {center.email}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(center.enabledModules || []).map((mod) => (
                      <span
                        key={mod}
                        className="inline-flex rounded bg-primary/10 text-primary px-1.5 py-0.5 text-[9px] font-semibold border border-primary/20 uppercase"
                      >
                        {MODULE_LABELS[mod]}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-2 mt-auto border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Edit2}
                      className="text-[10px] h-7"
                      onClick={() => openEditDialog(center)}
                    >
                      Configure
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Layers}
                      className="text-[10px] h-7 text-primary border-primary/30"
                      onClick={() => {
                        setOwnerEnabledModules(center.enabledModules || [...ALL_MODULES])
                        addNotification({
                          title: "Modules Applied",
                          description: `Preview modules for "${center.name}" applied.`,
                          type: "system",
                        })
                      }}
                    >
                      Modules
                    </Button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCenter(center.id, center.name)}
                      className="inline-flex items-center gap-1 rounded-md border border-red-500/20 text-red-400 hover:bg-red-500/10 text-[10px] font-medium px-2 py-1 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredCenters.length === 0 && (
              <div className="col-span-full py-16 text-center border border-dashed border-border rounded-xl">
                <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No centers found</p>
                <Button variant="primary" size="sm" icon={Plus} className="mt-4" onClick={openCreateDialog}>
                  Register First Center
                </Button>
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── SUPPORT ── */}
        <TabsContent value="support" className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Support Ticket Queue</h2>
              <p className="text-xs text-muted-foreground">
                Respond to institute requests. Only super admins can update ticket status.
              </p>
            </div>
            <div className="flex gap-2">
              <Select value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value)} className="h-9 text-xs w-40">
                <option value="all">All Tickets</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
              </Select>
              <Link href="/support">
                <Button variant="outline" size="sm" icon={ExternalLink}>
                  Full Desk
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-2 space-y-2 max-h-[520px] overflow-y-auto">
              {filteredTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => openTicketPanel(ticket)}
                  className={`w-full text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                    selectedTicket?.id === ticket.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-foreground line-clamp-1">{ticket.subject}</p>
                    <Badge
                      variant={
                        ticket.status === "resolved"
                          ? "success"
                          : ticket.status === "in-progress"
                            ? "warning"
                            : "secondary"
                      }
                      className="shrink-0 text-[9px]"
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {ticket.userName || "User"} · {ticket.userRole || "—"} · {ticket.category}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{ticket.createdAt}</p>
                </button>
              ))}
              {filteredTickets.length === 0 && (
                <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
                  No tickets in this filter.
                </div>
              )}
            </div>

            <Card className="lg:col-span-3 bg-card">
              {selectedTicket ? (
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-border/40 pb-4">
                    <div>
                      <h3 className="text-sm font-bold text-foreground">{selectedTicket.subject}</h3>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        From {selectedTicket.userName} ({selectedTicket.userRole}) · Priority:{" "}
                        <span className="uppercase font-semibold">{selectedTicket.priority}</span>
                      </p>
                    </div>
                    <Badge
                      variant={
                        selectedTicket.priority === "high"
                          ? "destructive"
                          : selectedTicket.priority === "medium"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {selectedTicket.priority}
                    </Badge>
                  </div>

                  <div className="bg-secondary/20 rounded-lg p-3 text-xs leading-relaxed border border-border/30">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                      Original Message
                    </span>
                    {selectedTicket.message}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Admin Response</label>
                    <textarea
                      rows={4}
                      value={ticketResponse}
                      onChange={(e) => setTicketResponse(e.target.value)}
                      placeholder="Write your response to the institute…"
                      className="w-full rounded-lg border border-border bg-card p-3 text-xs focus:ring-1 focus:ring-primary resize-none"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="space-y-1 flex-1">
                      <label className="text-xs font-semibold text-muted-foreground">Status</label>
                      <Select
                        value={ticketStatus}
                        onChange={(e) => setTicketStatus(e.target.value as SupportTicket["status"])}
                        className="h-9 text-xs"
                      >
                        <option value="open">Open</option>
                        <option value="in-progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                      </Select>
                    </div>
                    <div className="flex gap-2 sm:pt-5">
                      <Button variant="outline" size="sm" onClick={() => setSelectedTicket(null)}>
                        Cancel
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        onClick={handleSaveTicket}
                        disabled={savingTicket}
                      >
                        {savingTicket ? "Saving…" : "Save Response"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <CardContent className="p-12 text-center text-xs text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-semibold text-foreground">Select a ticket</p>
                  <p className="mt-1">Choose a ticket from the queue to respond.</p>
                </CardContent>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── BROADCAST ── */}
        <TabsContent value="broadcast" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-primary" />
                  Platform Broadcast
                </CardTitle>
                <CardDescription>
                  Send in-app notifications to all users or specific roles across every tenant.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleBroadcast} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Target Audience</label>
                    <Select
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="h-9 text-xs"
                    >
                      <option value="all">All Users (Platform-wide)</option>
                      <option value="owners">Institute Owners Only</option>
                      <option value="trainers">Trainers Only</option>
                      <option value="bdes">BDE Staff Only</option>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Notification Title</label>
                    <Input
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      placeholder="e.g. Scheduled Maintenance Tonight"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Message Body</label>
                    <textarea
                      rows={5}
                      value={broadcastBody}
                      onChange={(e) => setBroadcastBody(e.target.value)}
                      placeholder="Write the announcement message…"
                      className="w-full rounded-lg border border-border bg-card p-3 text-xs resize-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <Button type="submit" variant="primary" size="sm" icon={Send} disabled={sendingBroadcast}>
                    {sendingBroadcast ? "Sending…" : "Send Broadcast"}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Broadcast Guidelines
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                {[
                  "Broadcasts appear in the notification bell for targeted roles immediately.",
                  "Use platform-wide broadcasts sparingly — prefer role-specific messages.",
                  "For billing or module access issues, respond via Support Desk instead.",
                  "Maintenance announcements should include date, time, and expected duration.",
                ].map((tip, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/20 border border-border/30">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── PLATFORM ── */}
        <TabsContent value="platform" className="mt-6 space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  System Controls
                </CardTitle>
                <CardDescription>Platform-wide operational settings.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div>
                    <p className="font-bold text-foreground">Maintenance Mode</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Block non-admin logins during platform updates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMaintenanceMode(!maintenanceMode)
                      addNotification({
                        title: maintenanceMode ? "Maintenance Off" : "Maintenance On",
                        description: maintenanceMode
                          ? "Platform is live for all users."
                          : "Only super admins can log in.",
                        type: "system",
                      })
                    }}
                    className={`relative h-6 w-11 rounded-full transition-colors cursor-pointer ${
                      maintenanceMode ? "bg-amber-500" : "bg-muted"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        maintenanceMode ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">API Rate Limit (req/min)</label>
                    <Input
                      value={apiRateLimit}
                      onChange={(e) => setApiRateLimit(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Session Timeout (min)</label>
                    <Input
                      value={sessionTimeout}
                      onChange={(e) => setSessionTimeout(e.target.value)}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  icon={Save}
                  onClick={() =>
                    addNotification({
                      title: "Platform Settings Saved",
                      description: "System controls updated successfully.",
                      type: "system",
                    })
                  }
                >
                  Save System Controls
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  Module Defaults
                </CardTitle>
                <CardDescription>Default modules enabled for newly registered centers.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_MODULES.map((mod) => (
                    <div
                      key={mod}
                      className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/10 text-xs"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span className="font-medium">{MODULE_LABELS[mod]}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground mt-3">
                  Customize per center from the Centers tab or{" "}
                  <Link href="/centers" className="text-primary underline">
                    Manage Centers
                  </Link>{" "}
                  page.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-card lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-500" />
                  Quick Links
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: "Manage Centers", href: "/centers", icon: Building2 },
                    { label: "Register Center", href: "/centers/new", icon: Plus },
                    { label: "Support Desk", href: "/support", icon: MessageSquare },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="flex items-center gap-2 rounded-lg border border-border p-3 text-xs font-medium hover:bg-muted/40 transition-colors"
                    >
                      <link.icon className="h-4 w-4 text-primary" />
                      {link.label}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Center quick-edit dialog (legacy inline create) */}
      <Dialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={editingCenter ? "Edit Center" : "Register Center"}
      >
        <form onSubmit={handleSaveCenter} className="space-y-4 p-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Center Name</label>
              <Input value={centerName} onChange={(e) => setCenterName(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Institute / Tenant</label>
              <Input
                value={selectedTenantName}
                onChange={(e) => setSelectedTenantName(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Status</label>
              <Select value={status} onChange={(e) => setStatus(e.target.value as TrainingCenter["status"])} className="h-9 text-xs">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-semibold text-muted-foreground">Location</label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Manager</label>
              <Input value={manager} onChange={(e) => setManager(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="h-9 text-xs" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground">Enabled Modules</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MODULES.map((mod) => (
                <button
                  key={mod}
                  type="button"
                  onClick={() => toggleDialogModule(mod)}
                  className={`px-2 py-1 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                    dialogModules.includes(mod)
                      ? "bg-primary/10 text-primary border-primary/30"
                      : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  {MODULE_LABELS[mod]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Center
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
