"use client"
import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, X, Users, GitPullRequest, CreditCard, Compass, Loader2 } from "lucide-react"
import { api } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

interface GlobalSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

interface SearchItem {
  id: string
  type: "lead" | "student" | "fee" | "page"
  title: string
  subtitle: string
  badge?: string
  href: string
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [leads, setLeads] = React.useState<any[]>([])
  const [students, setStudents] = React.useState<any[]>([])
  const [selectedIndex, setSelectedIndex] = React.useState(0)

  // Fetch search source data when modal opens
  React.useEffect(() => {
    if (!isOpen) return
    let active = true

    async function fetchData() {
      try {
        setLoading(true)
        const [leadsData, studentsData] = await Promise.all([
          api.getLeads().catch(() => []),
          api.getStudents().catch(() => []),
        ])
        if (active) {
          setLeads(leadsData || [])
          setStudents(studentsData || [])
        }
      } catch (err) {
        console.error("Global search fetch error:", err)
      } finally {
        if (active) setLoading(false)
      }
    }

    void fetchData()
    return () => {
      active = false
    }
  }, [isOpen])

  // Clear query on close
  React.useEffect(() => {
    if (!isOpen) {
      setQuery("")
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Hardcoded quick-link pages
  const pageItems: SearchItem[] = [
    { id: "p1", type: "page", title: "Leads CRM", subtitle: "Manage sales pipeline & conversions", href: "/crm" },
    { id: "p2", type: "page", title: "Student Registry", subtitle: "View enrolled students and profiles", href: "/students" },
    { id: "p3", type: "page", title: "Fees & Billing", subtitle: "Track invoices, payments & outstanding dues", href: "/fees" },
    { id: "p4", type: "page", title: "Campaigns Manager", subtitle: "Create and execute email & outreach campaigns", href: "/campaigns" },
    { id: "p5", type: "page", title: "Staff Attendance", subtitle: "Mark and review daily present/absent logs", href: "/hr/attendance" },
    { id: "p6", type: "page", title: "Settings & Profile", subtitle: "System settings and workspace preferences", href: "/settings" },
  ]

  // Filter items based on query
  const filteredItems = React.useMemo(() => {
    const q = query.toLowerCase().trim()
    const results: SearchItem[] = []

    // 1. Pages matching search
    const matchedPages = pageItems.filter(
      (p) => p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
    )
    results.push(...matchedPages)

    if (q.length > 0) {
      // 2. Leads matching search
      const matchedLeads = leads
        .filter(
          (l) =>
            l.name?.toLowerCase().includes(q) ||
            l.email?.toLowerCase().includes(q) ||
            l.phone?.toLowerCase().includes(q) ||
            l.course?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .map((l) => ({
          id: `l-${l.id || l._id}`,
          type: "lead" as const,
          title: l.name || "Unnamed Lead",
          subtitle: `${l.course || "No course"} · ${l.email || l.phone || "No contact"}`,
          badge: l.stage ? l.stage.replace("_", " ") : "lead",
          href: `/crm?search=${encodeURIComponent(l.name || "")}`,
        }))

      // 3. Students matching search
      const matchedStudents = students
        .filter(
          (s) =>
            s.name?.toLowerCase().includes(q) ||
            s.email?.toLowerCase().includes(q) ||
            s.phone?.toLowerCase().includes(q) ||
            s.enrollmentNo?.toLowerCase().includes(q)
        )
        .slice(0, 5)
        .map((s) => ({
          id: `s-${s.id || s._id}`,
          type: "student" as const,
          title: s.name || "Unnamed Student",
          subtitle: `${s.enrollmentNo || "No Enrollment"} · ${s.email || s.phone || "No contact"}`,
          badge: "student",
          href: `/students?search=${encodeURIComponent(s.name || "")}`,
        }))

      // 4. Fees matching search (outstanding dues)
      const matchedFees = students
        .filter((s) => {
          const unpaid = (s.feesTotal || 0) - (s.feesPaid || 0)
          return (
            unpaid > 0 &&
            (s.name?.toLowerCase().includes(q) ||
              s.email?.toLowerCase().includes(q) ||
              s.enrollmentNo?.toLowerCase().includes(q))
          )
        })
        .slice(0, 5)
        .map((s) => {
          const due = (s.feesTotal || 0) - (s.feesPaid || 0)
          return {
            id: `f-${s.id || s._id}`,
            type: "fee" as const,
            title: `${s.name} (Fees Due)`,
            subtitle: `Due: ${formatCurrency(due)} (Paid: ${formatCurrency(s.feesPaid || 0)})`,
            badge: "unpaid",
            href: `/fees?search=${encodeURIComponent(s.name || "")}`,
          }
        })

      results.push(...matchedLeads, ...matchedStudents, ...matchedFees)
    }

    return results
  }, [query, leads, students])

  // Reset index when list changes
  React.useEffect(() => {
    setSelectedIndex(0)
  }, [filteredItems])

  // Handle Keyboard Navigation
  React.useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredItems.length)
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % filteredItems.length)
      } else if (e.key === "Enter") {
        e.preventDefault()
        const selected = filteredItems[selectedIndex]
        if (selected) {
          router.push(selected.href)
          onClose()
        }
      } else if (e.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, filteredItems, selectedIndex, router, onClose])

  if (!isOpen) return null

  const getIcon = (type: SearchItem["type"]) => {
    switch (type) {
      case "lead":
        return <GitPullRequest className="h-4 w-4 text-sky-500" />
      case "student":
        return <Users className="h-4 w-4 text-emerald-500" />
      case "fee":
        return <CreditCard className="h-4 w-4 text-rose-500" />
      default:
        return <Compass className="h-4 w-4 text-amber-500" />
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-xl rounded-xl border border-border/80 bg-background/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Input header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
          <Search className="h-5 w-5 text-muted-foreground shrink-0" />
          <input
            autoFocus
            type="text"
            placeholder="Search leads, students, fees or pages..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-hidden"
          />
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
          ) : (
            <button
              onClick={onClose}
              className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[320px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No results found for "{query}"
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filteredItems.map((item, idx) => {
                const isSelected = idx === selectedIndex
                return (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        router.push(item.href)
                        onClose()
                      }}
                      className={
                        isSelected
                          ? "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left bg-muted text-foreground transition-all cursor-pointer border border-border"
                          : "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-all cursor-pointer border border-transparent"
                      }
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 border border-border/40">
                        {getIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {item.title}
                          </p>
                          {item.badge && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground bg-muted/70 px-1.5 py-0.5 rounded-sm capitalize">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 bg-muted/30 border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>
              <kbd className="font-mono bg-muted border border-border/80 rounded px-1.5 py-0.5 shadow-2xs mr-1">↑↓</kbd>
              Navigate
            </span>
            <span>
              <kbd className="font-mono bg-muted border border-border/80 rounded px-1.5 py-0.5 shadow-2xs mr-1">Enter</kbd>
              Select
            </span>
          </div>
          <span>
            <kbd className="font-mono bg-muted border border-border/80 rounded px-1.5 py-0.5 shadow-2xs mr-1">Esc</kbd>
            Close
          </span>
        </div>
      </div>
    </div>
  )
}
