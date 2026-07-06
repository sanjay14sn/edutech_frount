"use client"

import * as React from "react"
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, ChevronDown, Send, Megaphone, Loader2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"

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

interface Announcement {
  id: string
  title: string
  body: string
  date: string
  type: "info" | "warning"
}

export default function SupportPage() {
  const { addNotification, user, fetchSupportQueueCount } = useStore()
  const isSuperAdmin = user?.role === "super_admin"
  const [tickets, setTickets] = React.useState<SupportTicket[]>([])
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([])
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [responseDrafts, setResponseDrafts] = React.useState<Record<string, string>>({})
  const [updatingTicketId, setUpdatingTicketId] = React.useState<string | null>(null)
  const [expandedTicketId, setExpandedTicketId] = React.useState<string | null>(null)

  const [isComposing, setIsComposing] = React.useState(false)
  const [subject, setSubject] = React.useState("")
  const [category, setCategory] = React.useState("Technical Issue")
  const [priority, setPriority] = React.useState<"low" | "medium" | "high">("medium")
  const [message, setMessage] = React.useState("")

  const loadSupportData = React.useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [ticketsData, announcementsData] = await Promise.all([
        api.getSupportTickets(),
        api.getAnnouncements(),
      ])
      setTickets(ticketsData || [])
      setAnnouncements(announcementsData || [])
      if (user?.role === "super_admin") {
        await fetchSupportQueueCount()
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load support data")
    } finally {
      setLoading(false)
    }
  }, [user?.role, fetchSupportQueueCount])

  React.useEffect(() => {
    loadSupportData()
  }, [loadSupportData])

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !message) {
      alert("Please fill subject and message.")
      return
    }

    try {
      setSubmitting(true)
      const created = await api.createSupportTicket({
        subject,
        category,
        priority,
        message,
      })
      setTickets((prev) => [created, ...prev])
      addNotification({
        title: "Support Ticket Raised",
        description: `Your query "${subject}" has been submitted.`,
        type: "system",
      })
      setSubject("")
      setCategory("Technical Issue")
      setPriority("medium")
      setMessage("")
      setIsComposing(false)
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to submit ticket")
    } finally {
      setSubmitting(false)
    }
  }

  const statusBadge = (status: SupportTicket["status"]) => {
    if (status === "resolved")
      return (
        <Badge variant="success" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Resolved
        </Badge>
      )
    if (status === "in-progress")
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1">
          <Clock className="h-3 w-3" />
          In Progress
        </Badge>
      )
    return (
      <Badge variant="secondary" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Open
      </Badge>
    )
  }

  const priorityBadge = (p: SupportTicket["priority"]) => {
    if (p === "high") return <span className="text-[10px] font-bold text-red-400 uppercase">High</span>
    if (p === "medium") return <span className="text-[10px] font-bold text-amber-400 uppercase">Medium</span>
    return <span className="text-[10px] font-bold text-muted-foreground uppercase">Low</span>
  }

  const handleAdminUpdateTicket = async (
    ticketId: string,
    status: SupportTicket["status"],
    response: string
  ) => {
    setUpdatingTicketId(ticketId)
    try {
      const updated = await api.updateSupportTicket(ticketId, { status, response })
      setTickets((prev) =>
        prev.map((t) => (t.id === ticketId ? { ...t, ...updated, id: updated.id || ticketId } : t))
      )
      addNotification({
        title: "Ticket Updated",
        description: "Support response saved successfully.",
        type: "system",
      })
      void fetchSupportQueueCount()
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update ticket")
    } finally {
      setUpdatingTicketId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-xs uppercase tracking-wider">Loading support desk…</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <span>{isSuperAdmin ? "Support Desk — Admin" : "Support & Queries"}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isSuperAdmin
              ? "Review and respond to support tickets from all institutes on the platform."
              : "Raise support requests to platform admins, track resolutions, and view system announcements."}
          </p>
        </div>
        {!isSuperAdmin && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsComposing(true)}>
            Raise a Query
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isComposing && (
        <Card className="bg-card border-primary/20">
          <CardHeader className="pb-3 border-b border-border/40">
            <CardTitle className="text-base font-extrabold flex items-center gap-1.5">
              <Send className="h-4 w-4 text-primary" />
              New Support Request
            </CardTitle>
            <CardDescription>
              Describe your issue or request. Platform admins typically respond within 24 hours.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              <div className="grid grid-cols-2 gap-3.5">
                <div className="col-span-2 space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Subject</label>
                  <Input
                    placeholder="Brief summary of your issue or request"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-card text-xs h-9.5"
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Category</label>
                  <Select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="bg-card text-xs h-9.5"
                    disabled={submitting}
                  >
                    <option>Technical Issue</option>
                    <option>Module Access</option>
                    <option>Billing & Fees</option>
                    <option>User Management</option>
                    <option>Data & Reports</option>
                    <option>Other</option>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Priority</label>
                  <Select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as SupportTicket["priority"])}
                    className="bg-card text-xs h-9.5"
                    disabled={submitting}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High — Urgent</option>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Detailed Message</label>
                <textarea
                  rows={4}
                  placeholder="Provide full context: steps to reproduce, what you expected, screenshots if possible..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={submitting}
                  className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              <div className="pt-2 border-t border-border/50 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsComposing(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={Send} disabled={submitting}>
                  {submitting ? "Submitting…" : "Submit Ticket"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tickets">
        <TabsList className="bg-secondary/60 border border-border/80 w-auto grid grid-cols-2 mb-4">
          <TabsTrigger value="tickets">
            {isSuperAdmin ? `All Tickets (${tickets.length})` : `My Tickets (${tickets.length})`}
          </TabsTrigger>
          <TabsTrigger value="announcements">Announcements ({announcements.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="mt-0 space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="bg-card">
              <CardContent className="p-0">
                <button
                  type="button"
                  className="w-full text-left p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 hover:bg-muted/20 transition-colors rounded-xl cursor-pointer"
                  onClick={() => setExpandedTicketId(expandedTicketId === ticket.id ? null : ticket.id)}
                >
                  <div className="space-y-0.5 flex-1">
                    <p className="font-bold text-sm text-foreground">{ticket.subject}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isSuperAdmin && ticket.userName ? `${ticket.userName} (${ticket.userRole}) · ` : ""}
                      {ticket.category} · Created {ticket.createdAt}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {priorityBadge(ticket.priority)}
                    {statusBadge(ticket.status)}
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        expandedTicketId === ticket.id ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {expandedTicketId === ticket.id && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/40 pt-3">
                    <div className="bg-secondary/20 p-3 rounded-lg border border-border/30 text-xs text-foreground leading-relaxed">
                      <span className="block font-semibold text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                        {isSuperAdmin ? "User Message" : "Your Message"}
                      </span>
                      {ticket.message}
                    </div>
                    {ticket.response && !isSuperAdmin && (
                      <div className="bg-primary/5 p-3 rounded-lg border border-primary/20 text-xs text-foreground leading-relaxed">
                        <span className="block font-semibold text-[10px] text-primary uppercase tracking-wider mb-1">
                          Admin Response
                        </span>
                        {ticket.response}
                      </div>
                    )}
                    {isSuperAdmin && (
                      <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
                        <span className="block font-semibold text-[10px] text-primary uppercase tracking-wider">
                          Admin Response Panel
                        </span>
                        <textarea
                          rows={3}
                          value={responseDrafts[ticket.id] ?? ticket.response ?? ""}
                          onChange={(e) =>
                            setResponseDrafts((prev) => ({ ...prev, [ticket.id]: e.target.value }))
                          }
                          placeholder="Write response to institute…"
                          className="w-full rounded-lg border border-border bg-card p-3 text-xs resize-none focus:ring-1 focus:ring-primary"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <Select
                            value={ticket.status}
                            onChange={(e) =>
                              setTickets((prev) =>
                                prev.map((t) =>
                                  t.id === ticket.id
                                    ? { ...t, status: e.target.value as SupportTicket["status"] }
                                    : t
                                )
                              )
                            }
                            className="h-8 text-xs sm:w-40"
                          >
                            <option value="open">Open</option>
                            <option value="in-progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </Select>
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Send}
                            disabled={updatingTicketId === ticket.id}
                            onClick={() =>
                              handleAdminUpdateTicket(
                                ticket.id,
                                ticket.status,
                                responseDrafts[ticket.id] ?? ticket.response ?? ""
                              )
                            }
                          >
                            {updatingTicketId === ticket.id ? "Saving…" : "Save Response"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {!isSuperAdmin && !ticket.response && ticket.status === "open" && (
                      <p className="text-[11px] text-muted-foreground italic">
                        Awaiting response from platform admin…
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}

          {tickets.length === 0 && (
            <div className="text-center py-14 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-foreground">No tickets raised yet</p>
              <p className="mt-0.5">Click &quot;Raise a Query&quot; to get help from the platform team.</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="announcements" className="mt-0 space-y-3">
          {announcements.map((ann) => (
            <Card
              key={ann.id}
              className={`bg-card border-l-2 ${
                ann.type === "warning" ? "border-l-amber-500" : "border-l-primary"
              }`}
            >
              <CardContent className="p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Megaphone
                      className={`h-4 w-4 shrink-0 ${
                        ann.type === "warning" ? "text-amber-400" : "text-primary"
                      }`}
                    />
                    <p className="font-bold text-sm text-foreground">{ann.title}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{ann.date}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed pl-6">{ann.body}</p>
              </CardContent>
            </Card>
          ))}

          {announcements.length === 0 && (
            <div className="text-center py-14 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
              <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="font-semibold text-foreground">No announcements</p>
              <p className="mt-0.5">Platform updates will appear here.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
