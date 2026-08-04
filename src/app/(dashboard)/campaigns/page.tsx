"use client"

import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Mail,
  Users,
  CheckCircle2,
  Clock,
  Copy,
  LayoutTemplate,
  RefreshCw,
  Trash2,
  AlertCircle,
  Edit2,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import Link from "next/link"
import { PageFeatureGate } from "@/components/shared/FeatureGate"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

type Campaign = {
  id?: string
  _id?: string
  name: string
  channel: string
  status: "Draft" | "Scheduled" | "Active" | "Completed"
  audience?: string
  recipientCount: number
  openRate?: number
  clickRate?: number
  createdAt?: string
}

const AUDIENCE_LABELS: Record<string, string> = {
  all_leads: "Open Leads",
  all_students: "All Students",
  active_students: "Active Students",
  defaulters: "Fee Defaulters",
  trainers: "Trainers",
}

type CampaignStats = {
  totalCampaigns: number
  totalReached: number
  avgOpenRate: number
  scheduled: number
}

function formatReached(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}K`
  return String(n)
}

function formatDate(value?: string) {
  if (!value) return "—"
  return new Date(value).toISOString().substring(0, 10)
}

export default function CampaignsPage() {
  const { addNotification } = useStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<CampaignStats>({
    totalCampaigns: 0,
    totalReached: 0,
    avgOpenRate: 0,
    scheduled: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const loadData = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const [list, summary] = await Promise.all([
        api.getCampaigns(),
        api.getCampaignStats(),
      ])
      setCampaigns(list || [])
      setStats(summary || { totalCampaigns: 0, totalReached: 0, avgOpenRate: 0, scheduled: 0 })
    } catch (err: any) {
      setError(err.message || "Failed to load campaigns")
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredCampaigns = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return campaigns
    return campaigns.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q) ||
      c.channel.toLowerCase().includes(q)
    )
  }, [campaigns, searchTerm])

  const handleDuplicate = async (id: string) => {
    try {
      await api.duplicateCampaign(id)
      addNotification({ title: "Campaign Duplicated", description: "A draft copy was created.", type: "admissions" })
      loadData()
    } catch (err: any) {
      addNotification({ title: "Duplicate Failed", description: err.message, type: "admissions" })
    }
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete campaign "${name}"?`)) return
    try {
      await api.deleteCampaign(id)
      addNotification({ title: "Campaign Deleted", description: `"${name}" removed.`, type: "admissions" })
      loadData()
    } catch (err: any) {
      addNotification({ title: "Delete Failed", description: err.message, type: "admissions" })
    }
  }

  const handleLaunch = async (id: string, name: string) => {
    try {
      await api.updateCampaign(id, { status: "Active" })
      addNotification({ title: "Campaign Sent", description: `"${name}" launched to audience.`, type: "admissions" })
      loadData()
    } catch (err: any) {
      addNotification({ title: "Send Failed", description: err.message, type: "admissions" })
    }
  }

  const handleComplete = async (id: string, name: string) => {
    try {
      await api.updateCampaign(id, { status: "Completed" })
      addNotification({ title: "Campaign Completed", description: `"${name}" marked as completed.`, type: "admissions" })
      loadData()
    } catch (err: any) {
      addNotification({ title: "Update Failed", description: err.message, type: "admissions" })
    }
  }

  return (
    <PageFeatureGate feature="enableCampaigns">
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage your marketing and communication campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={loadData} disabled={loading}>
            Refresh
          </Button>
          <Link href="/campaigns/templates">
            <Button variant="outline" icon={LayoutTemplate} className="shadow-xs bg-background">
              Templates
            </Button>
          </Link>
          <Link href="/campaigns/create">
            <Button icon={Plus} className="shadow-md">
              Create Campaign
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-500">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
              <h3 className="text-2xl font-bold">{loading ? "…" : stats.totalCampaigns}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Reached</p>
              <h3 className="text-2xl font-bold">{loading ? "…" : formatReached(stats.totalReached)}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Scheduled</p>
              <h3 className="text-2xl font-bold">{loading ? "…" : stats.scheduled}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border/50">
          <div>
            <CardTitle>Recent Campaigns</CardTitle>
            <CardDescription>View and manage all your campaigns across channels.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Campaign Name</th>
                  <th className="px-6 py-4 font-medium">Channel</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Audience</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      Loading campaigns…
                    </td>
                  </tr>
                ) : filteredCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                      {searchTerm ? "No campaigns match your search." : "No campaigns yet. Create your first campaign."}
                    </td>
                  </tr>
                ) : (
                  filteredCampaigns.map((campaign) => {
                    const id = String(campaign.id || campaign._id)
                    return (
                      <tr key={id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-medium text-foreground">{campaign.name}</div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Created: {formatDate(campaign.createdAt)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-blue-500" />
                            <span>{campaign.channel || "Email"}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            variant={
                              campaign.status === "Active" ? "success" :
                              campaign.status === "Completed" ? "default" :
                              campaign.status === "Scheduled" ? "warning" : "secondary"
                            }
                          >
                            {campaign.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{(campaign.recipientCount || 0).toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">
                            {AUDIENCE_LABELS[campaign.audience || ""] || "Recipients"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Link href={`/campaigns/create?edit=${id}`}>
                              <Button variant="ghost" size="icon" title="Edit Campaign">
                                <Edit2 className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </Link>
                            {(campaign.status === "Draft" || campaign.status === "Scheduled") && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Send Now"
                                onClick={() => handleLaunch(id, campaign.name)}
                              >
                                <Send className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            {campaign.status === "Active" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Mark Completed"
                                onClick={() => handleComplete(id, campaign.name)}
                              >
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Duplicate Campaign"
                              onClick={() => handleDuplicate(id)}
                            >
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Delete Campaign"
                              onClick={() => handleDelete(id, campaign.name)}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
    </PageFeatureGate>
  )
}
