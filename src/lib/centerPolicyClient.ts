export interface CenterPolicy {
  tenantId: string
  centerName: string
  maxStudentCapacity: number
  maxTrainers: number
  maxBdes: number
  studentCount: number
  trainerCount: number
  bdeCount: number
  allowStudentPortal: boolean
  allowLeadCsvImport: boolean
  allowBdeDirectConvert: boolean
  allowTrainerDeleteBatch: boolean
  enableCampaigns: boolean
  enableHrModule: boolean
  enableLmsAiTutor: boolean
  enableJobPortal: boolean
  publicPortalEnabled: boolean
  scholarshipTrackingEnabled: boolean
  enabledModules: string[]
}

export const DEFAULT_CENTER_POLICY: CenterPolicy = {
  tenantId: "",
  centerName: "",
  maxStudentCapacity: 500,
  maxTrainers: 25,
  maxBdes: 10,
  studentCount: 0,
  trainerCount: 0,
  bdeCount: 0,
  allowStudentPortal: true,
  allowLeadCsvImport: true,
  allowBdeDirectConvert: false,
  allowTrainerDeleteBatch: false,
  enableCampaigns: true,
  enableHrModule: true,
  enableLmsAiTutor: true,
  enableJobPortal: true,
  publicPortalEnabled: true,
  scholarshipTrackingEnabled: false,
  enabledModules: [],
}

export type CenterFeatureKey =
  | "allowStudentPortal"
  | "allowLeadCsvImport"
  | "allowBdeDirectConvert"
  | "allowTrainerDeleteBatch"
  | "enableCampaigns"
  | "enableHrModule"
  | "enableLmsAiTutor"
  | "enableJobPortal"
  | "publicPortalEnabled"
  | "scholarshipTrackingEnabled"

export function isPolicyFeatureEnabled(policy: CenterPolicy | null, key: CenterFeatureKey): boolean {
  if (!policy) return key !== "allowBdeDirectConvert" && key !== "allowTrainerDeleteBatch" && key !== "scholarshipTrackingEnabled"
  return Boolean(policy[key])
}

export type CapacityResource = "students" | "trainers" | "bdes"

const CAPACITY_META: Record<
  CapacityResource,
  { plural: string; singular: string; shortLabel: string; title: string }
> = {
  students: {
    plural: "students",
    singular: "student",
    shortLabel: "Student seats",
    title: "Student enrollment limit reached",
  },
  trainers: {
    plural: "trainers",
    singular: "trainer",
    shortLabel: "Trainer seats",
    title: "Trainer limit reached",
  },
  bdes: {
    plural: "BDE staff",
    singular: "BDE",
    shortLabel: "BDE seats",
    title: "BDE staff limit reached",
  },
}

export function getCapacityDetails(
  policy: CenterPolicy | null,
  resource: CapacityResource
) {
  if (!policy) {
    return { current: 0, limit: 0, remaining: 0, atCapacity: false, meta: CAPACITY_META[resource] }
  }

  const current =
    resource === "students"
      ? policy.studentCount
      : resource === "trainers"
        ? policy.trainerCount
        : policy.bdeCount
  const limit =
    resource === "students"
      ? policy.maxStudentCapacity
      : resource === "trainers"
        ? policy.maxTrainers
        : policy.maxBdes

  return {
    current,
    limit,
    remaining: Math.max(0, limit - current),
    atCapacity: current >= limit,
    meta: CAPACITY_META[resource],
    centerName: policy.centerName || policy.tenantId,
  }
}

export function isAtCapacity(
  policy: CenterPolicy | null,
  resource: CapacityResource
): boolean {
  return getCapacityDetails(policy, resource).atCapacity
}

const PATH_FEATURE_MAP: Record<string, CenterFeatureKey> = {
  "/campaigns": "enableCampaigns",
  "/hr": "enableHrModule",
  "/jobs": "enableJobPortal",
  "/lms/aitutor": "enableLmsAiTutor",
}

export function isPathAllowedByPolicy(pathname: string, policy: CenterPolicy | null): boolean {
  if (!policy) return true
  for (const [prefix, feature] of Object.entries(PATH_FEATURE_MAP)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return isPolicyFeatureEnabled(policy, feature)
    }
  }
  return true
}
