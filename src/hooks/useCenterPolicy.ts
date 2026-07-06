"use client"

import { useStore } from "@/store/useStore"
import {
  type CenterFeatureKey,
  getCapacityDetails,
  isAtCapacity,
  isPolicyFeatureEnabled,
  type CapacityResource,
} from "@/lib/centerPolicyClient"

export function useCenterPolicy() {
  const { centerPolicy, user } = useStore()
  const isSuperAdmin = user?.role === "super_admin"

  const feature = (key: CenterFeatureKey) =>
    isSuperAdmin || isPolicyFeatureEnabled(centerPolicy, key)

  const atCapacity = (resource: CapacityResource) =>
    !isSuperAdmin && isAtCapacity(centerPolicy, resource)

  const capacity = (resource: CapacityResource) => getCapacityDetails(centerPolicy, resource)

  return {
    policy: centerPolicy,
    isSuperAdmin,
    feature,
    atCapacity,
    capacity,
    allowLeadCsvImport: feature("allowLeadCsvImport"),
    allowBdeDirectConvert: feature("allowBdeDirectConvert"),
    allowTrainerDeleteBatch: feature("allowTrainerDeleteBatch"),
    enableCampaigns: feature("enableCampaigns"),
    enableHrModule: feature("enableHrModule"),
    enableLmsAiTutor: feature("enableLmsAiTutor"),
    enableJobPortal: feature("enableJobPortal"),
    scholarshipTrackingEnabled: feature("scholarshipTrackingEnabled"),
    publicPortalEnabled: feature("publicPortalEnabled"),
  }
}
