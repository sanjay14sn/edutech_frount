export type PermissionAction = "view" | "add" | "edit" | "delete"

export type FeaturePermission = Record<PermissionAction, boolean>

export type RolePermissions = Record<string, FeaturePermission>

export const PLATFORM_FEATURES = [
  { key: "dashboard", label: "Dashboard", group: "Core" },
  { key: "centers", label: "Centers & Tenants", group: "Platform" },
  { key: "roles", label: "Roles & Permissions", group: "Platform" },
  { key: "crm", label: "Leads CRM", group: "Sales" },
  { key: "bde", label: "BDE Management", group: "Sales" },
  { key: "admissions", label: "Admissions", group: "Sales" },
  { key: "followups", label: "Follow-ups", group: "Sales" },
  { key: "tasks", label: "Tasks", group: "Sales" },
  { key: "students", label: "Students", group: "Academic" },
  { key: "trainers", label: "Trainers", group: "Academic" },
  { key: "courses", label: "Courses & Batches", group: "Academic" },
  { key: "lms", label: "LMS", group: "Academic" },
  { key: "attendance", label: "Attendance", group: "Academic" },
  { key: "fees", label: "Fees & Billing", group: "Finance" },
  { key: "campaigns", label: "Campaigns", group: "Marketing" },
  { key: "hr", label: "HR & Payroll", group: "Operations" },
  { key: "jobs", label: "Job Portal", group: "Placement" },
  { key: "analytics", label: "Analytics", group: "Insights" },
  { key: "reports", label: "Reports", group: "Insights" },
  { key: "support", label: "Support Desk", group: "Operations" },
  { key: "settings", label: "Settings", group: "Platform" },
] as const

export type FeatureKey = (typeof PLATFORM_FEATURES)[number]["key"]

/** Hidden from institute-scoped permission matrix (platform super-admin only) */
export const INSTITUTE_HIDDEN_FEATURES = new Set<FeatureKey>(["centers", "roles"])

export function instituteRoleFeatures() {
  return PLATFORM_FEATURES.filter((f) => !INSTITUTE_HIDDEN_FEATURES.has(f.key))
}

export const INSTITUTE_FEATURE_GROUPS = Array.from(
  new Set(instituteRoleFeatures().map((f) => f.group))
)

export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "add", "edit", "delete"]

export interface AppRole {
  id: string
  name: string
  slug: string
  description: string
  isSystem: boolean
  baseRole: string | null
  tenantId?: string | null
  permissions: RolePermissions
}

export function emptyPermissions(): RolePermissions {
  const perms: RolePermissions = {}
  for (const feature of PLATFORM_FEATURES) {
    perms[feature.key] = { view: false, add: false, edit: false, delete: false }
  }
  return perms
}

export function normalizePermissions(input?: RolePermissions | null): RolePermissions {
  const base = emptyPermissions()
  if (!input) return base
  for (const feature of PLATFORM_FEATURES) {
    const row = input[feature.key]
    if (row) {
      base[feature.key] = {
        view: Boolean(row.view),
        add: Boolean(row.add),
        edit: Boolean(row.edit),
        delete: Boolean(row.delete),
      }
    }
  }
  return base
}

export function setFeaturePermission(
  permissions: RolePermissions,
  featureKey: string,
  action: PermissionAction,
  value: boolean
): RolePermissions {
  const next = { ...permissions, [featureKey]: { ...permissions[featureKey] } }
  next[featureKey][action] = value
  if (action !== "view" && value) next[featureKey].view = true
  if (action === "view" && !value) {
    next[featureKey] = { view: false, add: false, edit: false, delete: false }
  }
  return next
}

export function setAllFeaturePermissions(
  permissions: RolePermissions,
  featureKey: string,
  value: boolean
): RolePermissions {
  return {
    ...permissions,
    [featureKey]: { view: value, add: value, edit: value, delete: value },
  }
}

export function setColumnPermissions(
  permissions: RolePermissions,
  action: PermissionAction,
  value: boolean,
  featureKeys = PLATFORM_FEATURES.map((f) => f.key)
): RolePermissions {
  const next = { ...permissions }
  for (const key of featureKeys) {
    next[key] = setFeaturePermission(next, key, action, value)[key]
  }
  return next
}

export const FEATURE_GROUPS = Array.from(new Set(PLATFORM_FEATURES.map((f) => f.group)))
