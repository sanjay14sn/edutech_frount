import type { BDE, Lead, LeadStage } from "@/store/useStore"

export const BDE_LEADS_PAGE_SIZE = 10

export const LEAD_STAGES: {
  value: LeadStage | "all"
  label: string
  color: "default" | "secondary" | "success" | "warning" | "destructive" | "info" | "outline"
}[] = [
  { value: "all", label: "All Statuses", color: "outline" },
  { value: "new", label: "New Lead", color: "default" },
  { value: "contacted", label: "Contacted", color: "info" },
  { value: "interested", label: "Interested", color: "warning" },
  { value: "demo_scheduled", label: "Demo Scheduled", color: "outline" },
  { value: "follow_up", label: "Follow-up", color: "secondary" },
  { value: "requested_as_student", label: "Requested as Student", color: "warning" },
  { value: "converted", label: "Converted", color: "success" },
  { value: "lost", label: "Lost", color: "destructive" },
]

export type BdeLeadDateField = "created" | "follow_up"

export function getLeadStageMeta(stage: LeadStage) {
  return LEAD_STAGES.find((item) => item.value === stage) || {
    value: stage,
    label: stage.replace(/_/g, " "),
    color: "default" as const,
  }
}

export function leadBelongsToBde(lead: Lead, bde: BDE) {
  if (lead.assignedBdeId && String(lead.assignedBdeId) === String(bde.id)) {
    return true
  }
  const counsellor = (lead.counsellor || "").trim().toLowerCase()
  const bdeName = (bde.name || "").trim().toLowerCase()
  return counsellor.length > 0 && counsellor === bdeName
}

export function leadIsUnassigned(lead: Lead, bdes: BDE[]) {
  return !bdes.some((bde) => leadBelongsToBde(lead, bde))
}

export function normalizeLeadRecord(lead: Lead & { _id?: string }) {
  return { ...lead, id: lead.id || lead._id || "" } as Lead
}

export function getLeadDateValue(lead: Lead, field: BdeLeadDateField): string {
  if (field === "follow_up") {
    return lead.nextFollowUpDate || ""
  }
  return lead.createdDate || lead.createdAt || ""
}

function parseLeadDate(value?: string): Date | null {
  if (!value) return null
  const normalized = value.includes("T") ? value : `${value}T12:00:00`
  const parsed = new Date(normalized)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function leadMatchesDateRange(
  lead: Lead,
  field: BdeLeadDateField,
  fromDate: string,
  toDate: string
) {
  const raw = getLeadDateValue(lead, field)
  const parsed = parseLeadDate(raw)
  if (!parsed) return false

  const day = parsed.toISOString().slice(0, 10)
  if (fromDate && day < fromDate) return false
  if (toDate && day > toDate) return false
  return true
}

export function sortLeadsByDate(leads: Lead[], field: BdeLeadDateField, direction: "asc" | "desc" = "desc") {
  return [...leads].sort((a, b) => {
    const aTime = parseLeadDate(getLeadDateValue(a, field))?.getTime() ?? 0
    const bTime = parseLeadDate(getLeadDateValue(b, field))?.getTime() ?? 0
    return direction === "desc" ? bTime - aTime : aTime - bTime
  })
}

export function getLeadsForBde(leads: Lead[], bde: BDE) {
  return leads.filter((lead) => leadBelongsToBde(lead, bde))
}

export function getBdeLeadStats(leads: Lead[], bde: BDE) {
  const assigned = getLeadsForBde(leads, bde)
  return {
    total: assigned.length,
    active: assigned.filter((lead) => lead.stage !== "converted" && lead.stage !== "lost").length,
    converted: assigned.filter((lead) => lead.stage === "converted").length,
    lost: assigned.filter((lead) => lead.stage === "lost").length,
    byStage: LEAD_STAGES.filter((stage) => stage.value !== "all").reduce(
      (acc, stage) => {
        acc[stage.value as LeadStage] = assigned.filter((lead) => lead.stage === stage.value).length
        return acc
      },
      {} as Record<LeadStage, number>
    ),
  }
}

export function filterBdeLeads(options: {
  leads: Lead[]
  bde: BDE
  stageFilter: LeadStage | "all"
  search: string
  dateField: BdeLeadDateField
  fromDate: string
  toDate: string
  sortDirection?: "asc" | "desc"
}) {
  const query = options.search.trim().toLowerCase()

  const filtered = options.leads
    .filter((lead) => leadBelongsToBde(lead, options.bde))
    .filter((lead) => options.stageFilter === "all" || lead.stage === options.stageFilter)
    .filter((lead) => {
      if (!query) return true
      return [lead.name, lead.email, lead.phone, lead.course, lead.city, lead.source]
        .some((field) => String(field || "").toLowerCase().includes(query))
    })
    .filter((lead) => {
      if (!options.fromDate && !options.toDate) return true
      return leadMatchesDateRange(lead, options.dateField, options.fromDate, options.toDate)
    })

  return sortLeadsByDate(filtered, options.dateField, options.sortDirection ?? "desc")
}

export function paginateItems<T>(items: T[], page: number, pageSize = BDE_LEADS_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    totalItems: items.length,
    pageSize,
    startIndex: items.length === 0 ? 0 : start + 1,
    endIndex: Math.min(start + pageSize, items.length),
  }
}
