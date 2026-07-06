import { type ModuleKey, ALL_MODULES } from "@/store/useStore"

export type BranchType = "single" | "multiple"
export type CenterStatus = "active" | "inactive" | "maintenance"

export interface CenterConfig {
  // Core
  name: string
  tenantName: string
  location: string
  manager: string
  email: string
  phone: string
  status: CenterStatus
  branchType: BranchType
  centerCode: string
  city: string
  state: string
  pincode: string
  country: string
  timezone: string
  operatingHoursStart: string
  operatingHoursEnd: string
  maxStudentCapacity: number
  maxTrainers: number
  maxBdes: number
  enabledModules: ModuleKey[]

  // Branding
  logoUrl: string
  faviconUrl: string
  brandColor: string
  secondaryBrandColor: string
  tagline: string
  welcomeMessage: string
  customDomain: string
  publicPortalEnabled: boolean
  website: string
  linkedin: string
  instagram: string
  whatsapp: string
  youtube: string
  facebook: string
  twitter: string
  googleMaps: string

  // Notifications
  smsProvider: string
  whatsappAlerts: boolean
  smsAlertsEnabled: boolean
  emailSender: string
  reminderTimings: string
  dailyDigestEnabled: boolean
  emailAlertsFees: boolean
  emailAlertsAttendance: boolean
  emailAlertsAdmissions: boolean
  emailAlertsLeads: boolean
  feeReminderDaysBefore: number
  feeReminderAutoSend: boolean

  // Billing
  gstVatNumber: string
  invoicePrefix: string
  currency: string
  paymentGateway: string
  taxRatePercent: number
  lateFeePercent: number
  lateFeeGraceDays: number
  allowPartialPayments: boolean
  autoGenerateReceipts: boolean
  invoiceFooterNote: string
  defaultInstallmentCount: number
  scholarshipTrackingEnabled: boolean

  // Access & features
  allowStudentPortal: boolean
  allowLeadCsvImport: boolean
  allowBdeDirectConvert: boolean
  allowTrainerDeleteBatch: boolean
  enableCampaigns: boolean
  enableHrModule: boolean
  enableLmsAiTutor: boolean
  enableJobPortal: boolean

  // Attendance
  defaultClassDuration: number
  minAttendancePercent: number
  lowAttendanceThreshold: number
  autoAbsentAfterMinutes: number
  allowLateAttendanceMarking: boolean
  geofenceEnabled: boolean
  geofenceRadiusMeters: number

  // Security
  sessionTimeoutMinutes: number
  passwordMinLength: number
  requireOwnerTwoFactor: boolean
  dataRetentionDays: number
  ipWhitelist: string
}

export const DEFAULT_CENTER_CONFIG: CenterConfig = {
  name: "",
  tenantName: "",
  location: "",
  manager: "",
  email: "",
  phone: "",
  status: "active",
  branchType: "multiple",
  centerCode: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  timezone: "Asia/Kolkata",
  operatingHoursStart: "09:00",
  operatingHoursEnd: "18:00",
  maxStudentCapacity: 500,
  maxTrainers: 25,
  maxBdes: 10,
  enabledModules: [...ALL_MODULES],

  logoUrl: "",
  faviconUrl: "",
  brandColor: "#3b82f6",
  secondaryBrandColor: "#10b981",
  tagline: "",
  welcomeMessage: "",
  customDomain: "",
  publicPortalEnabled: true,
  website: "",
  linkedin: "",
  instagram: "",
  whatsapp: "",
  youtube: "",
  facebook: "",
  twitter: "",
  googleMaps: "",

  smsProvider: "twilio",
  whatsappAlerts: true,
  smsAlertsEnabled: false,
  emailSender: "",
  reminderTimings: "24h",
  dailyDigestEnabled: true,
  emailAlertsFees: true,
  emailAlertsAttendance: true,
  emailAlertsAdmissions: true,
  emailAlertsLeads: true,
  feeReminderDaysBefore: 3,
  feeReminderAutoSend: true,

  gstVatNumber: "",
  invoicePrefix: "INV",
  currency: "INR",
  paymentGateway: "razorpay",
  taxRatePercent: 18,
  lateFeePercent: 2,
  lateFeeGraceDays: 7,
  allowPartialPayments: true,
  autoGenerateReceipts: true,
  invoiceFooterNote: "",
  defaultInstallmentCount: 3,
  scholarshipTrackingEnabled: false,

  allowStudentPortal: true,
  allowLeadCsvImport: true,
  allowBdeDirectConvert: false,
  allowTrainerDeleteBatch: false,
  enableCampaigns: true,
  enableHrModule: true,
  enableLmsAiTutor: true,
  enableJobPortal: true,

  defaultClassDuration: 90,
  minAttendancePercent: 75,
  lowAttendanceThreshold: 75,
  autoAbsentAfterMinutes: 15,
  allowLateAttendanceMarking: true,
  geofenceEnabled: false,
  geofenceRadiusMeters: 200,

  sessionTimeoutMinutes: 480,
  passwordMinLength: 6,
  requireOwnerTwoFactor: false,
  dataRetentionDays: 365,
  ipWhitelist: "",
}

export function centerFromApi(data: Record<string, unknown>): CenterConfig {
  const base = { ...DEFAULT_CENTER_CONFIG }
  for (const key of Object.keys(DEFAULT_CENTER_CONFIG) as (keyof CenterConfig)[]) {
    if (data[key] !== undefined && data[key] !== null) {
      ;(base as Record<string, unknown>)[key] = data[key]
    }
  }
  if (Array.isArray(data.enabledModules)) {
    base.enabledModules = data.enabledModules as ModuleKey[]
  }
  return base
}

export function centerToPayload(config: CenterConfig): Record<string, unknown> {
  return { ...config }
}

export const CONFIG_TABS = [
  { id: "general", label: "General", description: "Profile, location, and primary contacts" },
  { id: "modules", label: "Modules", description: "Enable platform modules for this center" },
  { id: "access", label: "Access & limits", description: "Roles, caps, and feature gates" },
  { id: "branding", label: "Branding", description: "Visual identity and public links" },
  { id: "notifications", label: "Notifications", description: "Email, SMS, and alert channels" },
  { id: "billing", label: "Billing & tax", description: "Currency, gateway, and invoicing" },
  { id: "attendance", label: "Attendance", description: "Class rules and geofencing" },
  { id: "security", label: "Security", description: "Sessions, passwords, and access control" },
  { id: "operations", label: "Operations", description: "Timezone, hours, and regional settings" },
] as const

export type ConfigTabId = (typeof CONFIG_TABS)[number]["id"]
