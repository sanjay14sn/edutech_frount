"use client"

import * as React from "react"
import { motion } from "framer-motion"
import {
  Calendar, Phone, MessageSquare, Save, Search
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Select } from "@/components/ui/Select"
import { useStore, Lead, FollowUp } from "@/store/useStore"
import { formatDate } from "@/lib/utils"
import { api } from "@/lib/api"

type FollowUpTask = FollowUp & { synthetic?: boolean }

export default function FollowupsPage() {
  const { addNotification, user, activeTenant, setLeads } = useStore()

  const currentBdeId = user?.id || ""
  const currentBdeName = user?.name || "BDE"

  const [leads, setLocalLeads] = React.useState<Lead[]>([])
  const [followUpTasks, setFollowUpTasks] = React.useState<FollowUpTask[]>([])
  const [loading, setLoading] = React.useState(true)

  const [searchQuery, setSearchQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<"today" | "overdue" | "scheduled" | "completed">("today")

  const [isLogOpen, setIsLogOpen] = React.useState(false)
  const [selectedLead, setSelectedLead] = React.useState<Lead | null>(null)
  const [selectedFollowup, setSelectedFollowup] = React.useState<FollowUpTask | null>(null)
  const [submitting, setSubmitting] = React.useState(false)

  const [callStatus, setCallStatus] = React.useState<"connected" | "no_answer" | "busy" | "switched_off">("connected")
  const [notes, setNotes] = React.useState("")
  const [nextFollowupDate, setNextFollowupDate] = React.useState(
    new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0]
  )

  const loadFollowUpData = React.useCallback(async () => {
    try {
      setLoading(true)
      const [leadsData, followupsData] = await Promise.all([
        api.getLeads(),
        api.getFollowUps(),
      ])
      const normalizedLeads = (leadsData || []).map((l: any) => ({
        ...l,
        id: l.id || l._id,
      }))
      setLocalLeads(normalizedLeads)
      setLeads(normalizedLeads)
      setFollowUpTasks(
        (followupsData || []).map((f: any) => ({
          ...f,
          id: f.id || f._id,
        }))
      )
    } catch (err) {
      console.error("Failed to load follow-ups:", err)
    } finally {
      setLoading(false)
    }
  }, [setLeads])

  React.useEffect(() => {
    loadFollowUpData()
  }, [loadFollowUpData])

  const todayStr = new Date().toISOString().split("T")[0]

  const findLead = React.useCallback(
    (leadId: string) => leads.find((l) => String(l.id) === String(leadId)),
    [leads]
  )

  const filteredFollowups = React.useMemo(() => {
    return followUpTasks.filter((f) => {
      const lead = findLead(f.leadId)
      if (!lead) return false

      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.course.toLowerCase().includes(searchQuery.toLowerCase())
      if (!matchesSearch) return false

      const date = (f.nextFollowupDate || todayStr).substring(0, 10)

      if (statusFilter === "today") {
        return date === todayStr && f.status === "pending"
      }
      if (statusFilter === "overdue") {
        return date < todayStr && f.status === "pending"
      }
      if (statusFilter === "scheduled") {
        return date > todayStr && f.status === "pending"
      }
      if (statusFilter === "completed") {
        return f.status === "completed"
      }
      return true
    })
  }, [followUpTasks, findLead, searchQuery, statusFilter, todayStr])

  const handleLogOutcome = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedLead) return

    try {
      setSubmitting(true)
      const newNote = {
        id: `note-${Date.now()}`,
        text: `Call Status: ${callStatus.replace("_", " ").toUpperCase()}. Comment: ${notes}`,
        date: todayStr,
      }
      const updatedNotes = [newNote, ...(selectedLead.notes || [])]
      const newStage = callStatus === "connected" ? "contacted" : selectedLead.stage

      await api.updateLead(selectedLead.id, {
        notes: updatedNotes,
        stage: newStage,
        nextFollowUpDate: nextFollowupDate,
      })

      if (selectedFollowup && !String(selectedFollowup.id).startsWith("lead-")) {
        await api.updateFollowUp(String(selectedFollowup.id), {
          status: "completed",
          notes: `Call Outcome: ${callStatus.replace("_", " ")}. ${notes}`.trim(),
        })
      }

      await api.createFollowUp({
        leadId: selectedLead.id,
        notes: notes.trim() || `Call Outcome: ${callStatus.replace("_", " ")}`,
        nextFollowupDate,
        followupDate: todayStr,
      })

      await api.logCall({
        leadId: selectedLead.id,
        leadName: selectedLead.name,
        outcome: callStatus,
        notes: notes.trim() || `Call Outcome: ${callStatus.replace("_", " ")}`,
      })

      addNotification({
        title: "Call Logged Successfully",
        description: `Timeline update saved for ${selectedLead.name}.`,
        type: "admissions",
      })

      setIsLogOpen(false)
      setNotes("")
      setSelectedLead(null)
      setSelectedFollowup(null)
      await loadFollowUpData()
    } catch (err: any) {
      alert(err.message || "Failed to save follow-up log")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDial = (lead: Lead) => {
    window.open(`tel:${lead.phone}`, "_self")
  }

  const triggerWhatsApp = (phone: string, name: string) => {
    const text = encodeURIComponent(
      `Hi ${name}, this is ${currentBdeName} from ${activeTenant?.name || "our institute"}. Let me know a convenient time to connect!`
    )
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${text}`, "_blank")
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Phone className="h-6 w-6 text-primary" />
          <span>Daily Follow-ups Planner</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Organize your calling logs, configure whatsapp reminders, and schedule next contact timings for your warm pipelines.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-between bg-card p-4 rounded-xl border border-border">
        <div className="flex border border-border p-0.5 rounded-lg bg-muted/20 text-xs font-semibold flex-wrap">
          {(["today", "overdue", "scheduled", "completed"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-md cursor-pointer capitalize ${
                statusFilter === tab ? "bg-card text-foreground" : "text-muted-foreground"
              }`}
            >
              {tab === "today" ? "Today's Pending" : tab === "scheduled" ? "Future Scheduled" : tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search candidate or program..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-8.5 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="md:col-span-3 text-center py-12 text-xs text-muted-foreground">Loading follow-ups...</div>
        ) : filteredFollowups.length === 0 ? (
          <div className="md:col-span-3 text-center py-12 bg-card rounded-2xl border border-border text-muted-foreground italic text-xs">
            No scheduled follow-up tasks found for this selection.
          </div>
        ) : (
          filteredFollowups.map((f) => {
            const lead = findLead(f.leadId)
            if (!lead) return null

            const date = (f.nextFollowupDate || todayStr).substring(0, 10)
            const isOverdue = date < todayStr && f.status === "pending"

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card border border-border rounded-xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow space-y-3"
              >
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-xs text-foreground">{lead.name}</h3>
                      <p className="text-[10px] text-muted-foreground leading-normal">{lead.course}</p>
                    </div>
                    <Badge
                      variant={
                        f.status === "completed" ? "success" : isOverdue ? "destructive" : "info"
                      }
                      className="text-[9px] uppercase font-bold"
                    >
                      {f.status === "completed" ? "completed" : isOverdue ? "overdue" : lead.stage.replace("_", " ")}
                    </Badge>
                  </div>

                  <p className="text-[11px] text-muted-foreground leading-relaxed bg-muted/40 p-2.5 rounded-lg border border-border/30">
                    {f.notes || "No comments noted."}
                  </p>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Date:{" "}
                    <span className="font-semibold text-foreground">{formatDate(f.nextFollowupDate || todayStr)}</span>
                  </span>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10"
                      onClick={() => triggerWhatsApp(lead.phone, lead.name)}
                      title="Send WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-primary border-primary/20 hover:bg-primary/10"
                      onClick={() => handleDial(lead)}
                      title="Trigger Call Dialer"
                    >
                      <Phone className="h-3.5 w-3.5" />
                    </Button>
                    {f.status === "pending" && (
                      <Button
                        variant="primary"
                        size="sm"
                        className="text-[10px] h-7"
                        onClick={() => {
                          setSelectedLead(lead)
                          setSelectedFollowup(f)
                          setIsLogOpen(true)
                        }}
                      >
                        Log outcome
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })
        )}
      </div>

      <Dialog
        isOpen={isLogOpen}
        onClose={() => setIsLogOpen(false)}
        title={selectedLead ? `Log Call Outcome: ${selectedLead.name}` : "Log Call Outcome"}
        description="Save summary notes from your call discussion."
      >
        {selectedLead && (
          <form onSubmit={handleLogOutcome} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Call Status / Outcome</label>
              <Select
                value={callStatus}
                onChange={(e) => setCallStatus(e.target.value as typeof callStatus)}
                className="bg-card text-xs h-9.5"
                disabled={submitting}
              >
                <option value="connected">Connected & Discussed</option>
                <option value="no_answer">No Answer / Missed Call</option>
                <option value="busy">Line Busy / Callback Requested</option>
                <option value="switched_off">Switched Off / Not Reachable</option>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Discussion Notes / Remarks</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Informed about the upcoming batch schedules and batch timings..."
                className="w-full bg-card border border-border rounded-lg p-2.5 text-xs focus-visible:outline-hidden"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Schedule Next Callback Timing</label>
              <Input
                type="date"
                value={nextFollowupDate}
                onChange={(e) => setNextFollowupDate(e.target.value)}
                className="bg-card text-xs h-9.5"
                disabled={submitting}
              />
            </div>

            <div className="pt-3 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsLogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" icon={Save} disabled={submitting}>
                {submitting ? "Saving..." : "Save Log details"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}
