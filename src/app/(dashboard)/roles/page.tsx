"use client"

import * as React from "react"
import {
  ShieldCheck,
  Plus,
  Copy,
  Trash2,
  Save,
  ChevronRight,
  AlertTriangle,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { FormField } from "@/components/ui/FormField"
import { Select } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import {
  type AppRole,
  type RolePermissions,
  normalizePermissions,
  emptyPermissions,
} from "@/lib/rolePermissions"
import { RolePermissionsEditor } from "@/components/roles/RolePermissionsEditor"
import { cn } from "@/lib/utils"

function permissionsEqual(a: RolePermissions, b: RolePermissions) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export default function RolesPage() {
  const { user, addNotification } = useStore()
  const role = user?.role || "owner"
  const isSuperAdmin = role === "super_admin"

  const [roles, setRoles] = React.useState<AppRole[]>([])
  const [centers, setCenters] = React.useState<Array<{ id: string; name: string; tenantName: string }>>([])
  const [selectedTenantId, setSelectedTenantId] = React.useState<string>("")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [draftPermissions, setDraftPermissions] = React.useState<RolePermissions>(emptyPermissions())
  const [draftName, setDraftName] = React.useState("")
  const [draftDescription, setDraftDescription] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [newName, setNewName] = React.useState("")
  const [newDescription, setNewDescription] = React.useState("")
  const [cloneFromId, setCloneFromId] = React.useState("")

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null
  const isDirty =
    selectedRole &&
    (draftName !== selectedRole.name ||
      draftDescription !== selectedRole.description ||
      !permissionsEqual(draftPermissions, selectedRole.permissions))

  const activeTenantId = isSuperAdmin ? selectedTenantId : user?.tenantId || ""
  const instituteLabel = React.useMemo(() => {
    if (!activeTenantId) return "No institute selected"
    const center = centers.find((c) => c.tenantName === activeTenantId)
    return center ? `${center.name} (${activeTenantId})` : activeTenantId
  }, [activeTenantId, centers])

  const loadRoles = React.useCallback(async () => {
    if (!activeTenantId) {
      setRoles([])
      setSelectedId(null)
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const data = (await api.getRoles(activeTenantId)) as AppRole[]
      setRoles(data)
      setSelectedId((prev) => {
        if (prev && data.some((r) => r.id === prev)) return prev
        return data[0]?.id ?? null
      })
    } catch (err) {
      addNotification({
        title: "Failed to load roles",
        description: err instanceof Error ? err.message : "Could not fetch role definitions for this institute.",
        type: "system",
      })
    } finally {
      setLoading(false)
    }
  }, [activeTenantId, addNotification])

  React.useEffect(() => {
    if (role !== "super_admin") return
    api.getCenters()
      .then((data: Array<{ _id?: string; id?: string; name?: string; tenantName?: string }>) => {
        const normalized = (data || []).map((c) => ({
          id: String(c._id ?? c.id ?? c.tenantName ?? ""),
          name: c.name || "Unnamed Center",
          tenantName: c.tenantName || "",
        }))
        setCenters(normalized)
        if (isSuperAdmin && normalized.length) {
          setSelectedTenantId((prev) => prev || normalized[0].tenantName)
        }
      })
      .catch(() => setCenters([]))
  }, [role, isSuperAdmin])

  React.useEffect(() => {
    if (role !== "super_admin") return
    if (!activeTenantId) return
    loadRoles()
  }, [role, activeTenantId, loadRoles])

  React.useEffect(() => {
    if (!selectedRole) return
    setDraftName(selectedRole.name)
    setDraftDescription(selectedRole.description)
    setDraftPermissions(normalizePermissions(selectedRole.permissions))
  }, [selectedRole])

  const handleSave = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const updated = (await api.updateRole(selectedRole.id, {
        name: draftName,
        description: draftDescription,
        permissions: draftPermissions,
      })) as AppRole
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      addNotification({
        title: "Role saved",
        description: `${updated.name} permissions updated successfully.`,
        type: "system",
      })
    } catch {
      addNotification({
        title: "Save failed",
        description: "Could not update this role. Please try again.",
        type: "system",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setSaving(true)
    try {
      const cloneSource = roles.find((r) => r.id === cloneFromId)
      const created = (await api.createRole({
        name: newName.trim(),
        description: newDescription.trim(),
        permissions: cloneSource ? cloneSource.permissions : undefined,
        baseRole: cloneSource?.slug,
      })) as AppRole
      setRoles((prev) => [...prev, created])
      setSelectedId(created.id)
      setCreateOpen(false)
      setNewName("")
      setNewDescription("")
      setCloneFromId("")
      addNotification({
        title: "Role created",
        description: `${created.name} is ready to configure.`,
        type: "system",
      })
    } catch {
      addNotification({
        title: "Create failed",
        description: "Could not create role. Name may already exist.",
        type: "system",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDuplicate = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const copy = (await api.duplicateRole(selectedRole.id)) as AppRole
      setRoles((prev) => [...prev, copy])
      setSelectedId(copy.id)
      addNotification({
        title: "Role duplicated",
        description: `${copy.name} created from ${selectedRole.name}.`,
        type: "system",
      })
    } catch {
      addNotification({
        title: "Duplicate failed",
        description: "Could not duplicate this role.",
        type: "system",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedRole || selectedRole.isSystem) return
    if (!window.confirm(`Delete role "${selectedRole.name}"? This cannot be undone.`)) return
    setSaving(true)
    try {
      await api.deleteRole(selectedRole.id)
      const remaining = roles.filter((r) => r.id !== selectedRole.id)
      setRoles(remaining)
      setSelectedId(remaining[0]?.id ?? null)
      addNotification({
        title: "Role deleted",
        description: `${selectedRole.name} was removed.`,
        type: "system",
      })
    } catch {
      addNotification({
        title: "Delete failed",
        description: "Could not delete this role.",
        type: "system",
      })
    } finally {
      setSaving(false)
    }
  }

  if (role !== "super_admin") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl space-y-4 max-w-md mx-auto text-center mt-20 animate-scale-in">
        <ShieldCheck className="h-12 w-12 text-destructive" />
        <div>
          <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Roles & Permissions is only available to platform super admins.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="mt-2 text-xs">
          Go Back
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 animate-fade-in min-h-[calc(100vh-7rem)] pb-24">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 flex gap-3 items-start shrink-0">
        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            Beta — institute permissions
            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">Beta</Badge>
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Roles and permission toggles are stored per institute. Enforcement across every screen is not fully integrated yet — changes here are saved but may not restrict all actions until the beta rollout completes.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <span>Platform</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground">Roles & Permissions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-primary" />
            Institute Roles
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Configure built-in and custom roles for one institute. Permissions apply only within that tenant&apos;s workspace.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 max-w-md">
            <label className="text-xs font-semibold text-muted-foreground shrink-0">Institute</label>
            <Select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="">Select institute…</option>
              {centers.map((c) => (
                <option key={c.id || c.tenantName} value={c.tenantName}>
                  {c.name} · {c.tenantName}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 shrink-0" disabled={!activeTenantId}>
          <Plus className="h-4 w-4" />
          Create Role
        </Button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 gap-4 w-full">
        {loading ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading roles…</p>
        ) : roles.length === 0 ? (
          <Card className="rounded-2xl border-dashed">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              {activeTenantId ? "No roles found for this institute." : "Select an institute to load roles."}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="inline-flex flex-wrap gap-1.5 rounded-2xl bg-muted/40 p-1.5 border border-border/50 shrink-0">
                {roles.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200",
                      selectedId === r.id
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    {r.name}
                  </button>
                ))}
              </div>

            {selectedRole ? (
            <div className="flex flex-col flex-1 min-h-0 gap-4">
              <Card className="rounded-2xl border-border/60 shadow-sm overflow-hidden shrink-0">
                <CardHeader className="pb-4 bg-gradient-to-b from-muted/20 to-transparent">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <Input
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            className="h-10 text-base font-semibold tracking-tight border-transparent bg-transparent px-0 shadow-none focus-visible:ring-0 max-w-full"
                            disabled={selectedRole.isSystem}
                          />
                          <p className="text-[11px] text-muted-foreground font-mono truncate">{selectedRole.slug}</p>
                        </div>
                        {selectedRole.isSystem && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">Built-in</Badge>
                        )}
                      </div>
                      <Input
                        value={draftDescription}
                        onChange={(e) => setDraftDescription(e.target.value)}
                        placeholder="Describe what this role can do…"
                        className="max-w-2xl h-9 text-sm rounded-xl bg-muted/30 border-border/50"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0">
                      <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={saving} className="gap-1 rounded-xl">
                        <Copy className="h-3.5 w-3.5" />
                        Duplicate
                      </Button>
                      {!selectedRole.isSystem && (
                        <Button variant="outline" size="sm" onClick={handleDelete} disabled={saving} className="gap-1 rounded-xl text-destructive hover:text-destructive border-destructive/20">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card className="rounded-2xl border-border/60 shadow-sm flex flex-col flex-1 min-h-0">
                <CardHeader className="pb-0 pt-5 shrink-0">
                  <CardTitle className="text-lg font-semibold tracking-tight">Permissions</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    Set module access for <span className="font-medium text-foreground">{draftName}</span> at{" "}
                    <span className="font-medium text-foreground">{instituteLabel}</span>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col flex-1 min-h-0 p-0">
                  <RolePermissionsEditor
                    permissions={draftPermissions}
                    onChange={setDraftPermissions}
                    tenantId={activeTenantId}
                    fillHeight
                  />
                </CardContent>
              </Card>
            </div>
            ) : null}
          </>
        )}
      </div>

      {isDirty && selectedRole && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/80 backdrop-blur-xl px-4 py-4 md:pl-[calc(var(--sidebar-width,240px)+1rem)]">
          <div className="w-full flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/90 shadow-lg px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Unsaved changes to <span className="font-semibold text-foreground">{draftName}</span>
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setDraftName(selectedRole.name)
                  setDraftDescription(selectedRole.description)
                  setDraftPermissions(normalizePermissions(selectedRole.permissions))
                }}
              >
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 rounded-xl px-5">
                <Save className="h-4 w-4" />
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Create custom role"
        description="Define a new role and optionally clone permissions from an existing role."
        className="max-w-md"
      >
        <div className="space-y-4">
          <FormField label="Role name" required>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Center Manager"
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What this role is responsible for"
            />
          </FormField>
          <FormField label="Clone permissions from">
            <Select
              value={cloneFromId}
              onChange={(e) => setCloneFromId(e.target.value)}
            >
              <option value="">Start with no permissions</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreate} disabled={!newName.trim() || saving}>
              {saving ? "Creating…" : "Create role"}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
