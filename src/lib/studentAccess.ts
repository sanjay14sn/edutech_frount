import { api } from "@/lib/api"

export type StudentPortalStatus = "active" | "completed" | "on_hold"

export function isStudentPortalAccessAllowed(status?: string | null): boolean {
  return status === "active"
}

export function getStudentAccessDeniedMessage(status?: string | null): string {
  if (status === "on_hold") {
    return "Your account is on hold. Portal access has been disabled — please contact your institute."
  }
  if (status === "completed") {
    return "Your enrollment is completed. Portal access is no longer available."
  }
  return "Your account does not have portal access."
}

export function clearAuthSession() {
  if (typeof window === "undefined") return
  localStorage.removeItem("token")
  localStorage.removeItem("education-crm-erp-storage-v3")
  localStorage.removeItem("education-crm-erp-storage-v2")
  localStorage.removeItem("education-crm-erp-storage")
}

export async function verifyStudentPortalAccess() {
  try {
    const profile = await api.getStudentProfile()
    const status = profile?.status as StudentPortalStatus | undefined
    return {
      allowed: isStudentPortalAccessAllowed(status),
      status,
      profile,
    }
  } catch {
    return { allowed: false, status: undefined, profile: null }
  }
}
