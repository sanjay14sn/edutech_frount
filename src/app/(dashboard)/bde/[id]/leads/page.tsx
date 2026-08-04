"use client"

import * as React from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
  ArrowLeft,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Users,
  Mail,
  Phone,
  CalendarRange,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { useStore, type BDE, type Lead, type LeadStage } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api } from "@/lib/api"
import {
  BDE_LEADS_PAGE_SIZE,
  LEAD_STAGES,
  type BdeLeadDateField,
  filterBdeLeads,
  getBdeLeadStats,
  getLeadStageMeta,
  normalizeLeadRecord,
  paginateItems,
} from "@/lib/bdeLeads"

export default function BdeAssignedLeadsPage() {
  const params = useParams()
  const bdeId = String(params.id || "")
  const { setBdes, setLeads } = useStore()

  const [bde, setBde] = React.useState<BDE | null>(null)
  const [allLeads, setAllLeads] = React.useState<Lead[]>([])
  const [loading, setLoading] = React.useState(true)

  const [stageFilter, setStageFilter] = React.useState<LeadStage | "all">("all")
  const [search, setSearch] = React.useState("")
  const [dateField, setDateField] = React.useState<BdeLeadDateField>("created")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [sortDirection, setSortDirection] = React.useState<"asc" | "desc">("desc")
  const [page, setPage] = React.useState(1)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [bdesData, leadsData] = await Promise.all([
          api.getBdes(),
          api.getLeads().catch(() => []),
        ])
        setBdes(bdesData)
        const normalizedLeads = (leadsData || []).map((lead: Lead & { _id?: string }) =>
          normalizeLeadRecord(lead)
        )
        setLeads(normalizedLeads)
        setAllLeads(normalizedLeads)
        const match = (bdesData as BDE[]).find((item) => String(item.id) === bdeId) || null
        setBde(match)
      } catch (error) {
        console.error("Failed to load BDE assigned leads:", error)
      } finally {
        setLoading(false)
      }
    }
    if (bdeId) void load()
  }, [bdeId, setBdes, setLeads])

  React.useEffect(() => {
    setPage(1)
  }, [stageFilter, search, fromDate, toDate, dateField, sortDirection])

  const assignedLeads = React.useMemo(() => {
    if (!bde) return []
    return filterBdeLeads({
      leads: allLeads,
      bde,
      stageFilter,
      search,
      dateField,
      fromDate,
      toDate,
      sortDirection,
    })
  }, [allLeads, bde, stageFilter, search, dateField, fromDate, toDate, sortDirection])

  const pagination = React.useMemo(
    () => paginateItems(assignedLeads, page, BDE_LEADS_PAGE_SIZE),
    [assignedLeads, page]
  )

  const leadStats = React.useMemo(
    () => (bde ? getBdeLeadStats(allLeads, bde) : null),
    [allLeads, bde]
  )

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Loading assigned leads...
      </div>
    )
  }

  if (!bde) {
    return (
      <div className="space-y-4">
        <Link href="/bde">
          <Button variant="ghost" size="sm" icon={ArrowLeft}>
            Back to BDE Directory
          </Button>
        </Link>
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            BDE profile not found.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link href="/bde">
            <Button variant="ghost" size="sm" icon={ArrowLeft} className="mb-2 h-8 px-2">
              BDE Directory
            </Button>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            {bde.name} — Assigned Leads
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {bde.employeeId} • {bde.email} • {bde.phone}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Total Assigned</p>
            <p className="text-2xl font-bold text-foreground mt-1">{leadStats?.total ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Active Pipeline</p>
            <p className="text-2xl font-bold text-sky-500 mt-1">{leadStats?.active ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Converted</p>
            <p className="text-2xl font-bold text-emerald-500 mt-1">{leadStats?.converted ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardContent className="p-4 text-center">
            <p className="text-[10px] uppercase font-semibold text-muted-foreground">Filtered Results</p>
            <p className="text-2xl font-bold text-foreground mt-1">{assignedLeads.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3 border-b border-border/40 space-y-3">
          <div>
            <CardTitle className="text-base">Lead Pipeline</CardTitle>
            <CardDescription>
              Filter by status, search, and date range. Showing {BDE_LEADS_PAGE_SIZE} leads per page.
            </CardDescription>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LEAD_STAGES.filter((stage) => stage.value !== "all").map((stage) => {
              const count = leadStats?.byStage[stage.value as LeadStage] ?? 0
              if (count === 0) return null
              const active = stageFilter === stage.value
              return (
                <button
                  key={stage.value}
                  type="button"
                  onClick={() =>
                    setStageFilter((current) =>
                      current === stage.value ? "all" : (stage.value as LeadStage)
                    )
                  }
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-colors cursor-pointer ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>{stage.label}</span>
                  <span className="opacity-70">({count})</span>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_160px_160px_160px]">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search lead name, email, phone, course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-9 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              />
            </div>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as LeadStage | "all")}
              className="h-9 text-xs"
            >
              {LEAD_STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </Select>
            <Select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as BdeLeadDateField)}
              className="h-9 text-xs"
            >
              <option value="created">Created Date</option>
              <option value="follow_up">Follow-up Date</option>
            </Select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="From date"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="To date"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select
              value={sortDirection}
              onChange={(e) => setSortDirection(e.target.value as "asc" | "desc")}
              className="h-8 text-xs w-[180px]"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </Select>
            {(fromDate || toDate || search || stageFilter !== "all") && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setSearch("")
                  setStageFilter("all")
                  setFromDate("")
                  setToDate("")
                  setDateField("created")
                  setSortDirection("desc")
                }}
              >
                Clear filters
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {pagination.totalItems === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground italic">
              {leadStats?.total === 0
                ? "No leads assigned to this BDE yet."
                : "No leads match the selected filters."}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/30 text-muted-foreground uppercase font-semibold">
                      <th className="p-4">Lead</th>
                      <th className="p-4">Course</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Value</th>
                      <th className="p-4">Follow-up</th>
                      <th className="p-4">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {pagination.items.map((lead) => {
                      const stageMeta = getLeadStageMeta(lead.stage)
                      return (
                        <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                          <td className="p-4">
                            <p className="font-semibold text-foreground">{lead.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              {lead.email}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              {lead.phone}
                            </p>
                          </td>
                          <td className="p-4 text-foreground">{lead.course || "—"}</td>
                          <td className="p-4">
                            <Badge variant={stageMeta.color}>{stageMeta.label}</Badge>
                          </td>
                          <td className="p-4 font-semibold text-foreground">
                            {formatCurrency(lead.value || 0)}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {lead.nextFollowUpDate ? (
                              <span className="inline-flex items-center gap-1">
                                <CalendarRange className="h-3 w-3 shrink-0" />
                                {formatDate(lead.nextFollowUpDate)}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {formatDate(lead.createdDate || lead.createdAt || "")}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 px-4 py-3">
                <p className="text-xs text-muted-foreground">
                  Showing {pagination.startIndex}-{pagination.endIndex} of {pagination.totalItems} leads
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={ChevronLeft}
                    className="h-8 text-xs"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs font-medium text-foreground px-2">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
