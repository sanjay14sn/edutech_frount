"use client"

import * as React from "react"
import {
  Search,
  ChevronDown,
  ChevronRight,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Sparkles,
} from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import {
  type FeaturePermission,
  type PermissionAction,
  type RolePermissions,
  PERMISSION_ACTIONS,
  INSTITUTE_FEATURE_GROUPS,
  instituteRoleFeatures,
  setFeaturePermission,
  setAllFeaturePermissions,
} from "@/lib/rolePermissions"
import { cn } from "@/lib/utils"

type AccessLevel = "off" | "read" | "write" | "full"

const ACCESS_LEVELS: { id: AccessLevel; label: string; hint: string }[] = [
  { id: "off", label: "Off", hint: "No access" },
  { id: "read", label: "View", hint: "Read only" },
  { id: "write", label: "Edit", hint: "View, add & edit" },
  { id: "full", label: "Full", hint: "Including delete" },
]

const ACTION_META: Record<
  PermissionAction,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  view: { label: "View", icon: Eye },
  add: { label: "Add", icon: Plus },
  edit: { label: "Edit", icon: Pencil },
  delete: { label: "Delete", icon: Trash2 },
}

function permissionFromLevel(level: AccessLevel): FeaturePermission {
  switch (level) {
    case "off":
      return { view: false, add: false, edit: false, delete: false }
    case "read":
      return { view: true, add: false, edit: false, delete: false }
    case "write":
      return { view: true, add: true, edit: true, delete: false }
    case "full":
      return { view: true, add: true, edit: true, delete: true }
  }
}

function getAccessLevel(row: FeaturePermission): AccessLevel | "custom" {
  if (!row.view && !row.add && !row.edit && !row.delete) return "off"
  if (row.view && !row.add && !row.edit && !row.delete) return "read"
  if (row.view && row.add && row.edit && !row.delete) return "write"
  if (row.view && row.add && row.edit && row.delete) return "full"
  return "custom"
}

function countEnabled(row: FeaturePermission) {
  return PERMISSION_ACTIONS.filter((a) => row[a]).length
}

function AccessSegment({
  value,
  onChange,
  compact = false,
}: {
  value: AccessLevel | "custom"
  onChange: (level: AccessLevel) => void
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "inline-flex rounded-xl bg-muted/50 p-1 border border-border/50 shadow-inner",
        compact ? "w-full" : "shrink-0"
      )}
      role="group"
      aria-label="Access level"
    >
      {ACCESS_LEVELS.map((level) => {
        const active = value === level.id
        return (
          <button
            key={level.id}
            type="button"
            title={level.hint}
            onClick={() => onChange(level.id)}
            className={cn(
              "flex-1 min-w-0 rounded-lg font-medium transition-all duration-200",
              compact ? "px-2 py-2 text-[10px]" : "px-3 py-1.5 text-[11px]",
              active
                ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                : "text-muted-foreground hover:text-foreground hover:bg-background/40"
            )}
          >
            {level.label}
          </button>
        )
      })}
    </div>
  )
}

function FeaturePermissionRow({
  featureKey,
  label,
  row,
  onRowChange,
  onActionToggle,
}: {
  featureKey: string
  label: string
  row: FeaturePermission
  onRowChange: (next: FeaturePermission) => void
  onActionToggle: (action: PermissionAction, value: boolean) => void
}) {
  const level = getAccessLevel(row)
  const [expanded, setExpanded] = React.useState(level === "custom")

  React.useEffect(() => {
    if (level === "custom") setExpanded(true)
  }, [level])

  return (
    <div className="group rounded-2xl border border-border/50 bg-card/80 hover:border-border/80 hover:bg-card transition-colors overflow-hidden">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground tracking-tight">{label}</p>
            {level === "custom" && (
              <Badge variant="outline" className="text-[9px] h-5 border-amber-500/30 text-amber-600 bg-amber-500/5">
                Custom
              </Badge>
            )}
            {level === "off" && (
              <span className="text-[10px] text-muted-foreground">Disabled</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {level === "off" && "Hidden from this role"}
            {level === "read" && "Can open and read records"}
            {level === "write" && "Can create and update records"}
            {level === "full" && "Full control including delete"}
            {level === "custom" && `${countEnabled(row)} of 4 actions enabled`}
          </p>
        </div>
        <div className="w-full sm:w-auto sm:min-w-[220px]">
          <AccessSegment
            value={level}
            onChange={(next) => onRowChange(permissionFromLevel(next))}
            compact
          />
        </div>
      </div>

      {(level === "custom" || expanded) && (
        <div className="border-t border-border/40 bg-muted/20 px-4 py-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2.5 hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Fine-grained controls
          </button>
          {expanded && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PERMISSION_ACTIONS.map((action) => {
                const Icon = ACTION_META[action].icon
                const on = row[action]
                return (
                  <button
                    key={action}
                    type="button"
                    onClick={() => onActionToggle(action, !on)}
                    className={cn(
                      "flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-[11px] font-semibold transition-all",
                      on
                        ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:bg-background"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {ACTION_META[action].label}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function RolePermissionsEditor({
  permissions,
  onChange,
  tenantId,
  fillHeight = false,
}: {
  permissions: RolePermissions
  onChange: (next: RolePermissions) => void
  tenantId: string
  fillHeight?: boolean
}) {
  const [search, setSearch] = React.useState("")
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({})

  const features = React.useMemo(() => instituteRoleFeatures(), [])
  const query = search.trim().toLowerCase()

  const filteredGroups = React.useMemo(() => {
    return INSTITUTE_FEATURE_GROUPS.map((group) => ({
      group,
      features: features.filter((f) => {
        if (f.group !== group) return false
        if (!query) return true
        return f.label.toLowerCase().includes(query) || f.key.toLowerCase().includes(query)
      }),
    })).filter((g) => g.features.length > 0)
  }, [features, query])

  const stats = React.useMemo(() => {
    let off = 0
    let read = 0
    let write = 0
    let full = 0
    let custom = 0
    for (const f of features) {
      const l = getAccessLevel(permissions[f.key])
      if (l === "off") off++
      else if (l === "read") read++
      else if (l === "write") write++
      else if (l === "full") full++
      else custom++
    }
    return { off, read, write, full, custom, total: features.length }
  }, [features, permissions])

  const applyPresetToAll = (level: AccessLevel) => {
    const next = { ...permissions }
    for (const f of features) {
      next[f.key] = permissionFromLevel(level)
    }
    onChange(next)
  }

  const applyPresetToGroup = (group: string, level: AccessLevel) => {
    const next = { ...permissions }
    for (const f of features.filter((x) => x.group === group)) {
      next[f.key] = permissionFromLevel(level)
    }
    onChange(next)
  }

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  return (
    <div
      className={cn(
        fillHeight ? "flex flex-col flex-1 min-h-0 h-full px-6 pb-6 pt-5 gap-5" : "space-y-5"
      )}
    >
      {/* Summary + quick actions */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-muted/30 via-card to-card p-5 shadow-sm shrink-0">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
              <h3 className="text-base font-semibold tracking-tight text-foreground">Access overview</h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose how this role interacts with each module for institute{" "}
              <span className="font-semibold text-foreground">{tenantId}</span>. Use presets for speed, or expand
              any module for precise control.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {[
                { label: "Full", count: stats.full, tone: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
                { label: "Edit", count: stats.write, tone: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                { label: "View", count: stats.read, tone: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
                { label: "Off", count: stats.off, tone: "bg-muted text-muted-foreground border-border" },
                ...(stats.custom > 0
                  ? [
                      {
                        label: "Custom",
                        count: stats.custom,
                        tone: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                      },
                    ]
                  : []),
              ].map((chip) => (
                  <span
                    key={chip.label}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                      chip.tone
                    )}
                  >
                    {chip.count} {chip.label}
                  </span>
                ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => applyPresetToAll("full")}
              className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              Grant all
            </button>
            <button
              type="button"
              onClick={() => applyPresetToAll("read")}
              className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted/60 transition-colors"
            >
              View only
            </button>
            <button
              type="button"
              onClick={() => applyPresetToAll("off")}
              className="rounded-full border border-border/70 bg-background px-3.5 py-1.5 text-[11px] font-semibold text-muted-foreground hover:bg-muted/60 transition-colors"
            >
              Clear all
            </button>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search modules…"
          className="h-10 pl-10 rounded-xl bg-muted/30 border-border/60 text-sm w-full"
        />
      </div>

      {/* Grouped modules — scrollable when fillHeight */}
      <div
        className={cn(
          fillHeight ? "flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 space-y-6" : "space-y-6"
        )}
      >
        {filteredGroups.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            No modules match &ldquo;{search}&rdquo;
          </div>
        ) : (
          filteredGroups.map(({ group, features: groupFeatures }) => {
            const collapsed = collapsedGroups[group]
            return (
              <section key={group} className="space-y-2">
                <div className="flex items-center justify-between gap-3 px-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(group)}
                    className="flex items-center gap-2 text-left group/h"
                  >
                    {collapsed ? (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground group-hover/h:text-foreground transition-colors">
                      {group}
                    </h4>
                    <span className="text-[10px] text-muted-foreground/80 font-medium normal-case tracking-normal">
                      {groupFeatures.length} modules
                    </span>
                  </button>
                  {!collapsed && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => applyPresetToGroup(group, "full")}
                        className="text-[10px] font-semibold text-primary hover:underline"
                      >
                        All full
                      </button>
                      <span className="text-muted-foreground/40">·</span>
                      <button
                        type="button"
                        onClick={() => applyPresetToGroup(group, "off")}
                        className="text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:underline"
                      >
                        All off
                      </button>
                    </div>
                  )}
                </div>
                {!collapsed && (
                  <div className="grid gap-2 xl:grid-cols-2">
                    {groupFeatures.map((feature) => (
                      <FeaturePermissionRow
                        key={feature.key}
                        featureKey={feature.key}
                        label={feature.label}
                        row={permissions[feature.key]}
                        onRowChange={(next) =>
                          onChange({ ...permissions, [feature.key]: next })
                        }
                        onActionToggle={(action, value) =>
                          onChange(setFeaturePermission(permissions, feature.key, action, value))
                        }
                      />
                    ))}
                  </div>
                )}
              </section>
            )
          })
        )}
      </div>

      {/* Legend */}
      <div className="rounded-xl bg-muted/25 border border-border/40 px-4 py-3 shrink-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Access levels</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-[11px] text-muted-foreground">
          {ACCESS_LEVELS.map((l) => (
            <p key={l.id}>
              <span className="font-semibold text-foreground">{l.label}</span> — {l.hint}
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}

export function setAllFeaturesLevel(
  permissions: RolePermissions,
  featureKeys: string[],
  level: AccessLevel
): RolePermissions {
  const next = { ...permissions }
  const perm = permissionFromLevel(level)
  for (const key of featureKeys) {
    next[key] = { ...perm }
  }
  return next
}

export { setAllFeaturePermissions, getAccessLevel, permissionFromLevel }
