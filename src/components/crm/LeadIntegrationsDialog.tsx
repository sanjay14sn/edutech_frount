"use client"

import * as React from "react"
import { Copy, Check, Plus, RefreshCw, Link2, Trash2, Eye, Power } from "lucide-react"
import { Dialog } from "@/components/ui/Dialog"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { api, getBackendOrigin } from "@/lib/api"

export type LeadIntegration = {
  id: string
  name: string
  source: string
  apiKey: string
  apiKeyFull?: string
  isActive: boolean
  defaultCourse?: string
  assignedBdeId?: string
  counsellor?: string
  requestCount?: number
  lastUsedAt?: string | null
  createdAt?: string
}

const SOURCE_OPTIONS = [
  "Website",
  "Facebook",
  "Instagram",
  "Justdial",
  "Google",
  "WhatsApp",
  "Email",
  "Custom",
]

function webhookUrl() {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/webhooks/leads`
  }
  return `${getBackendOrigin()}/api/webhooks/leads`
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export default function LeadIntegrationsDialog({
  isOpen,
  onClose,
  bdes = [],
  courses = [],
}: {
  isOpen: boolean
  onClose: () => void
  bdes?: Array<{ id?: string; _id?: string; name: string }>
  courses?: Array<{ id?: string; _id?: string; name: string }>
}) {
  const [items, setItems] = React.useState<LeadIntegration[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")
  const [copied, setCopied] = React.useState<string>("")
  const [revealedKeys, setRevealedKeys] = React.useState<Record<string, string>>({})

  const [name, setName] = React.useState("")
  const [source, setSource] = React.useState("Website")
  const [customSource, setCustomSource] = React.useState("")
  const [defaultCourse, setDefaultCourse] = React.useState("General Enquiry")
  const [assignedBdeId, setAssignedBdeId] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [newKeyNotice, setNewKeyNotice] = React.useState("")

  const url = webhookUrl()

  const load = React.useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const data = await api.getLeadIntegrations()
      setItems(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err?.message || "Failed to load integrations")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (isOpen) void load()
  }, [isOpen, load])

  React.useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(""), 1500)
    return () => clearTimeout(t)
  }, [copied])

  async function handleCopy(label: string, text: string) {
    const ok = await copyText(text)
    if (ok) setCopied(label)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const resolvedSource = source === "Custom" ? customSource.trim() : source
    if (!name.trim() || !resolvedSource) {
      setError("Name and source are required")
      return
    }
    setCreating(true)
    setError("")
    try {
      const bde = bdes.find(
        (b) => String(b.id || b._id) === assignedBdeId
      )
      const res = await api.createLeadIntegration({
        name: name.trim(),
        source: resolvedSource,
        defaultCourse: defaultCourse.trim() || "General Enquiry",
        assignedBdeId: assignedBdeId || undefined,
        counsellor: bde?.name,
      })
      const integration = res.integration as LeadIntegration
      if (integration?.apiKeyFull || integration?.apiKey) {
        const full = integration.apiKeyFull || integration.apiKey
        setRevealedKeys((prev) => ({ ...prev, [integration.id]: full }))
        setNewKeyNotice(full)
      }
      setName("")
      setSource("Website")
      setCustomSource("")
      setAssignedBdeId("")
      await load()
    } catch (err: any) {
      setError(err?.message || "Failed to create integration")
    } finally {
      setCreating(false)
    }
  }

  async function handleToggleActive(item: LeadIntegration) {
    try {
      await api.updateLeadIntegration(item.id, { isActive: !item.isActive })
      await load()
    } catch (err: any) {
      setError(err?.message || "Failed to update integration")
    }
  }

  async function handleRotate(item: LeadIntegration) {
    if (!confirm(`Rotate API key for "${item.name}"? Old key will stop working.`)) return
    try {
      const res = await api.rotateLeadIntegrationKey(item.id)
      const integration = res.integration as LeadIntegration
      const full = integration.apiKeyFull || integration.apiKey
      setRevealedKeys((prev) => ({ ...prev, [item.id]: full }))
      setNewKeyNotice(full)
      await load()
    } catch (err: any) {
      setError(err?.message || "Failed to rotate key")
    }
  }

  async function handleReveal(item: LeadIntegration) {
    try {
      const res = await api.revealLeadIntegrationKey(item.id)
      const integration = res.integration as LeadIntegration
      const full = integration.apiKeyFull || integration.apiKey
      setRevealedKeys((prev) => ({ ...prev, [item.id]: full }))
    } catch (err: any) {
      setError(err?.message || "Failed to reveal key")
    }
  }

  async function handleDelete(item: LeadIntegration) {
    if (!confirm(`Disable integration "${item.name}"?`)) return
    try {
      await api.deleteLeadIntegration(item.id, false)
      await load()
    } catch (err: any) {
      setError(err?.message || "Failed to disable integration")
    }
  }

  const curlExample = `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: YOUR_API_KEY" \\
  -d '{"name":"Rahul","phone":"9876543210","email":"rahul@example.com","course":"abacus"}'`

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Lead Webhook Integrations"
      description="One webhook URL for all channels. Source is determined by each API key."
      className="max-w-3xl max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-5 text-xs">
        {error ? (
          <p className="text-rose-600 bg-rose-50 dark:bg-rose-950/40 rounded-lg px-3 py-2">{error}</p>
        ) : null}

        {newKeyNotice ? (
          <div className="rounded-lg border border-teal-500/40 bg-teal-500/10 px-3 py-2 space-y-1">
            <p className="font-semibold text-teal-700 dark:text-teal-300">New API key (copy now)</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-[11px]">{newKeyNotice}</code>
              <Button
                size="sm"
                variant="outline"
                icon={copied === "newKey" ? Check : Copy}
                onClick={() => void handleCopy("newKey", newKeyNotice)}
              >
                Copy
              </Button>
            </div>
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Webhook URL</label>
          <div className="flex items-center gap-2">
            <Input value={url} readOnly className="text-xs h-9 font-mono" />
            <Button
              size="sm"
              variant="outline"
              icon={copied === "url" ? Check : Copy}
              onClick={() => void handleCopy("url", url)}
            >
              Copy
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Send <code className="text-[10px]">X-API-Key</code> with every request. Source is taken from the integration, not the body.
          </p>
        </div>

        <form onSubmit={handleCreate} className="rounded-lg border border-border p-3 space-y-3 bg-muted/20">
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Create integration
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Facebook Lead Ads"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">Source</label>
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="h-9 text-xs"
              >
                {SOURCE_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </div>
            {source === "Custom" && (
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[10px] font-semibold text-muted-foreground">Custom source</label>
                <Input
                  value={customSource}
                  onChange={(e) => setCustomSource(e.target.value)}
                  placeholder="Referral Partner"
                  className="h-9 text-xs"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">Default course</label>
              <Select
                value={defaultCourse}
                onChange={(e) => setDefaultCourse(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="General Enquiry">General Enquiry</option>
                {courses.map((c) => (
                  <option key={c.id || c._id} value={c.name}>{c.name}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-muted-foreground">Assign BDE (optional)</label>
              <Select
                value={assignedBdeId}
                onChange={(e) => setAssignedBdeId(e.target.value)}
                className="h-9 text-xs"
              >
                <option value="">Unassigned</option>
                {bdes.map((b) => (
                  <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="sm" variant="primary" icon={Plus} disabled={creating}>
              {creating ? "Creating…" : "Create & generate key"}
            </Button>
          </div>
        </form>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Your integrations
            </p>
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-muted-foreground py-6 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center">No integrations yet. Create one above.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border text-[10px] uppercase text-muted-foreground">
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5">Source</th>
                    <th className="p-2.5">API Key</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {items.map((item) => {
                    const keyShown = revealedKeys[item.id] || item.apiKey
                    return (
                      <tr key={item.id}>
                        <td className="p-2.5">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.requestCount || 0} requests
                            {item.defaultCourse ? ` · ${item.defaultCourse}` : ""}
                          </p>
                        </td>
                        <td className="p-2.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold">
                            {item.source}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <code className="text-[10px] break-all">{keyShown}</code>
                        </td>
                        <td className="p-2.5">
                          <span
                            className={`text-[10px] font-semibold ${
                              item.isActive ? "text-teal-600" : "text-muted-foreground"
                            }`}
                          >
                            {item.isActive ? "Active" : "Disabled"}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex justify-end gap-1">
                            <button
                              type="button"
                              title="Copy key"
                              className="p-1.5 rounded border border-border hover:bg-muted"
                              onClick={() => void handleCopy(`key-${item.id}`, keyShown)}
                            >
                              {copied === `key-${item.id}` ? (
                                <Check className="h-3.5 w-3.5 text-teal-600" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              type="button"
                              title="Reveal full key"
                              className="p-1.5 rounded border border-border hover:bg-muted"
                              onClick={() => void handleReveal(item)}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Rotate key"
                              className="p-1.5 rounded border border-border hover:bg-muted"
                              onClick={() => void handleRotate(item)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title={item.isActive ? "Disable" : "Enable"}
                              className="p-1.5 rounded border border-border hover:bg-muted"
                              onClick={() => void handleToggleActive(item)}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Disable"
                              className="p-1.5 rounded border border-border hover:bg-muted text-rose-600"
                              onClick={() => void handleDelete(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase text-muted-foreground">Example request</label>
          <pre className="rounded-lg border border-border bg-muted/40 p-3 text-[10px] overflow-x-auto whitespace-pre-wrap">
            {curlExample}
          </pre>
          <Button
            size="sm"
            variant="outline"
            icon={copied === "curl" ? Check : Copy}
            onClick={() => void handleCopy("curl", curlExample)}
          >
            Copy example
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
