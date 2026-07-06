"use client"
import React, { Suspense, useEffect, useState } from "react"
import { ArrowLeft, Save, Send, Calendar, Copy, Users } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

export default function CreateCampaignPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>}>
      <CreateCampaignForm />
    </Suspense>
  )
}

function CreateCampaignForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const editId = searchParams.get("edit")
  const isEditMode = !!editId
  const { addNotification } = useStore()

  const [name, setName] = useState("")
  const [audience, setAudience] = useState("all_leads")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(!!editId)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!editId) return
    setLoading(true)
    api.getCampaignById(editId)
      .then((c: any) => {
        setName(c.name || "")
        setAudience(c.audience || "all_leads")
        setSubject(c.subject || "")
        setBody(c.body || "")
      })
      .catch((err: any) => alert(err.message || "Failed to load campaign"))
      .finally(() => setLoading(false))
  }, [editId])

  useEffect(() => {
    if (!templateId || editId) return
    api.getCampaignTemplates()
      .then((templates: any[]) => {
        const match = templates.find(t => String(t.id || t._id) === templateId)
        if (match) {
          setName(match.name)
          setSubject(match.subject || "")
          setBody(match.body || "")
        }
      })
      .catch(() => {})
  }, [templateId, editId])

  useEffect(() => {
    api.getCampaignAudienceEstimate(audience)
      .then((res: { count: number }) => setAudienceCount(res.count))
      .catch(() => setAudienceCount(null))
  }, [audience])

  const saveCampaign = async (status: "Draft" | "Scheduled" | "Active") => {
    if (!name.trim()) {
      alert("Campaign name is required.")
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        channel: "Email",
        status,
        audience,
        subject,
        body,
        ...(status === "Scheduled" ? { scheduledAt: new Date(Date.now() + 86400000).toISOString() } : {}),
      }

      if (isEditMode && editId) {
        await api.updateCampaign(editId, payload)
        addNotification({
          title: "Campaign Updated",
          description: `"${name}" saved successfully.`,
          type: "admissions",
        })
      } else {
        await api.createCampaign(payload)
        addNotification({
          title: status === "Draft" ? "Draft Saved" : status === "Scheduled" ? "Campaign Scheduled" : "Campaign Sent",
          description: `"${name}" has been ${status === "Draft" ? "saved as draft" : status === "Scheduled" ? "scheduled" : "launched"}.`,
          type: "admissions",
        })
      }
      router.push("/campaigns")
    } catch (err: any) {
      alert(err.message || "Failed to save campaign")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading campaign…</div>
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEditMode ? "Edit Campaign" : "Create Campaign"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isEditMode ? "Update campaign details and resend." : "Design and schedule a new marketing campaign."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Campaign Name</label>
                <Input
                  placeholder="e.g., Summer Admissions 2026"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Target Audience</label>
                <select
                  className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                >
                  <option value="all_leads">All Open Leads</option>
                  <option value="all_students">All Students</option>
                  <option value="active_students">Active Students</option>
                  <option value="defaulters">Fee Defaulters</option>
                  <option value="trainers">All Trainers</option>
                </select>
                {audienceCount != null && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    ~{audienceCount.toLocaleString()} recipients in your institute
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-lg">Message Content</CardTitle>
                <CardDescription>Compose your email message below.</CardDescription>
              </div>
              <Link href="/campaigns/templates">
                <Button variant="outline" size="sm" icon={Copy} className="h-8 text-xs">
                  Load Template
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 space-y-4 flex flex-col">
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject Line</label>
                <Input
                  placeholder="Enter an engaging subject line..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex-1 flex flex-col min-h-[300px]">
                <label className="text-sm font-medium">Message Body</label>
                <textarea
                  className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  placeholder={`Type your email message here...\n\nYou can use variables like {{name}} or {{course}} to personalize.`}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">Supports Markdown & HTML</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-border/50 pt-6">
              <Button variant="outline" icon={Save} disabled={saving} onClick={() => saveCampaign("Draft")}>
                Save Draft
              </Button>
              <div className="flex gap-2">
                <Button variant="secondary" icon={Calendar} disabled={saving} onClick={() => saveCampaign("Scheduled")}>
                  Schedule
                </Button>
                <Button icon={Send} disabled={saving} onClick={() => saveCampaign("Active")}>
                  {saving ? "Saving…" : "Send Now"}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
