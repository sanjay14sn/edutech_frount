"use client"

import * as React from "react"
import {
  LayoutGrid,
  Shield,
  Palette,
  Bell,
  CreditCard,
  CalendarCheck,
  Lock,
  Settings2,
  Building2,
  Check,
  GitPullRequest,
  Users,
  GraduationCap,
  BookOpen,
  Briefcase,
  BarChart3,
  Upload,
  type LucideIcon,
} from "lucide-react"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { api } from "@/lib/api"
import { type ModuleKey, ALL_MODULES } from "@/store/useStore"
import {
  type CenterConfig,
  type ConfigTabId,
  CONFIG_TABS,
} from "@/lib/centerConfig"
import {
  SettingsSection,
  SettingsField,
  SettingsSwitch,
  SettingsDivider,
  fieldInputClass,
  fieldTextareaClass,
} from "@/components/centers/CenterSettingsUI"
import { cn } from "@/lib/utils"

const TAB_ICONS: Record<ConfigTabId, LucideIcon> = {
  general: Building2,
  modules: LayoutGrid,
  access: Shield,
  branding: Palette,
  notifications: Bell,
  billing: CreditCard,
  attendance: CalendarCheck,
  security: Lock,
  operations: Settings2,
}

const MODULE_META: Record<
  ModuleKey,
  { title: string; desc: string; icon: LucideIcon }
> = {
  crm: { title: "Leads CRM", desc: "Pipeline, follow-ups, and imports", icon: GitPullRequest },
  students: { title: "Students", desc: "Profiles, fees, and documents", icon: Users },
  trainers: { title: "Trainers", desc: "Scheduling and performance", icon: GraduationCap },
  courses: { title: "Courses & batches", desc: "Cohorts, syllabus, LMS", icon: BookOpen },
  attendance: { title: "Attendance", desc: "Roll call and reporting", icon: CalendarCheck },
  fees: { title: "Fees & billing", desc: "Installments and receipts", icon: CreditCard },
  jobs: { title: "Job portal", desc: "Placements and applications", icon: Briefcase },
  analytics: { title: "Analytics", desc: "Growth and revenue insights", icon: BarChart3 },
}

interface CenterConfigTabsProps {
  activeTab: ConfigTabId
  setActiveTab: (tab: ConfigTabId) => void
  config: CenterConfig
  updateConfig: (patch: Partial<CenterConfig>) => void
}

export function CenterConfigTabs({ activeTab, setActiveTab, config, updateConfig }: CenterConfigTabsProps) {
  const activeMeta = CONFIG_TABS.find((t) => t.id === activeTab)
  const logoInputRef = React.useRef<HTMLInputElement>(null)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [logoUploadError, setLogoUploadError] = React.useState<string | null>(null)

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setLogoUploadError("Please choose an image file (PNG, JPG, SVG, or WebP).")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError("Logo must be 5 MB or smaller.")
      return
    }

    setUploadingLogo(true)
    setLogoUploadError(null)
    try {
      const uploaded = await api.uploadFile(file, "branding")
      updateConfig({ logoUrl: uploaded.url })
    } catch (error) {
      setLogoUploadError(error instanceof Error ? error.message : "Logo upload failed.")
    } finally {
      setUploadingLogo(false)
    }
  }

  const toggleModule = (mod: ModuleKey) => {
    updateConfig({
      enabledModules: config.enabledModules.includes(mod)
        ? config.enabledModules.filter((m) => m !== mod)
        : [...config.enabledModules, mod],
    })
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-[560px]">
      {/* Vertical navigation — international settings pattern */}
      <nav className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-border/60 bg-muted/20 lg:bg-muted/10 p-2 lg:p-3">
        <p className="hidden lg:block px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Configuration
        </p>
        <ul className="flex lg:flex-col gap-0.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
          {CONFIG_TABS.map((tab) => {
            const Icon = TAB_ICONS[tab.id]
            const isActive = activeTab === tab.id
            return (
              <li key={tab.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-all cursor-pointer",
                    isActive
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-primary")} />
                  <span className="truncate">{tab.label}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Content panel */}
      <div className="flex-1 min-w-0">
        <div className="px-6 py-5 border-b border-border/60 bg-background">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">{activeMeta?.label}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{activeMeta?.description}</p>
        </div>

        <div className="p-6 space-y-6 max-h-none overflow-y-auto">
          {activeTab === "general" && (
            <>
              <SettingsSection title="Center profile" description="Identity and operational status for this training hub.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="Center name" required>
                    <Input required value={config.name} onChange={(e) => updateConfig({ name: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Institute / tenant" required>
                    <Input required value={config.tenantName} onChange={(e) => updateConfig({ tenantName: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Branch model">
                    <Select value={config.branchType} onChange={(e) => updateConfig({ branchType: e.target.value as CenterConfig["branchType"] })} className={fieldInputClass}>
                      <option value="single">Single branch</option>
                      <option value="multiple">Multi-branch / franchise</option>
                    </Select>
                  </SettingsField>
                  <SettingsField label="Operational status">
                    <Select value={config.status} onChange={(e) => updateConfig({ status: e.target.value as CenterConfig["status"] })} className={fieldInputClass}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="maintenance">Maintenance</option>
                    </Select>
                  </SettingsField>
                </div>
              </SettingsSection>

              <SettingsSection title="Location" description="Physical address shown on invoices and public pages.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="Street address" required className="sm:col-span-2">
                    <Input required value={config.location} onChange={(e) => updateConfig({ location: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="City">
                    <Input value={config.city} onChange={(e) => updateConfig({ city: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="State / province">
                    <Input value={config.state} onChange={(e) => updateConfig({ state: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Postal / PIN code">
                    <Input value={config.pincode} onChange={(e) => updateConfig({ pincode: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Country">
                    <Select value={config.country} onChange={(e) => updateConfig({ country: e.target.value })} className={fieldInputClass}>
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="UAE">United Arab Emirates</option>
                      <option value="Singapore">Singapore</option>
                    </Select>
                  </SettingsField>
                </div>
              </SettingsSection>

              <SettingsSection title="Primary contact" description="Center manager and administrative email.">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="Head manager" required>
                    <Input required value={config.manager} onChange={(e) => updateConfig({ manager: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Contact email" required>
                    <Input required type="email" value={config.email} onChange={(e) => updateConfig({ email: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Mobile number" hint="Include country code for international SMS.">
                    <Input type="tel" value={config.phone} onChange={(e) => updateConfig({ phone: e.target.value })} className={fieldInputClass} placeholder="+91 98765 43210" />
                  </SettingsField>
                </div>
              </SettingsSection>
            </>
          )}

          {activeTab === "modules" && (
            <SettingsSection
              title="Enabled modules"
              description={`${config.enabledModules.length} of ${ALL_MODULES.length} modules active for this center.`}
            >
              <div className="flex items-center justify-end gap-3 mb-4">
                <button type="button" onClick={() => updateConfig({ enabledModules: [...ALL_MODULES] })} className="text-xs font-medium text-primary hover:underline cursor-pointer">
                  Enable all
                </button>
                <span className="text-muted-foreground text-xs">·</span>
                <button type="button" onClick={() => updateConfig({ enabledModules: [] })} className="text-xs font-medium text-muted-foreground hover:underline cursor-pointer">
                  Disable all
                </button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {ALL_MODULES.map((mod) => {
                  const meta = MODULE_META[mod]
                  const Icon = meta.icon
                  const enabled = config.enabledModules.includes(mod)
                  return (
                    <button
                      key={mod}
                      type="button"
                      onClick={() => toggleModule(mod)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer",
                        enabled
                          ? "border-primary/40 bg-primary/[0.04] ring-1 ring-primary/20"
                          : "border-border/70 bg-background hover:border-border hover:bg-muted/30"
                      )}
                    >
                      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">{meta.title}</p>
                          <div className={cn("flex h-5 w-5 items-center justify-center rounded-full border", enabled ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                            {enabled && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            </SettingsSection>
          )}

          {activeTab === "access" && (
            <>
              <SettingsSection title="Capacity limits" description="Maximum resources allocated to this center. When a limit is reached, institute users see an upgrade prompt.">
                <div className="grid gap-5 sm:grid-cols-3">
                  {(
                    [
                      ["maxStudentCapacity", "Max students"],
                      ["maxTrainers", "Max trainers"],
                      ["maxBdes", "Max BDE staff"],
                    ] as const
                  ).map(([key, label]) => (
                    <SettingsField key={key} label={label}>
                      <Input type="number" min={1} value={config[key]} onChange={(e) => updateConfig({ [key]: Number(e.target.value) || 0 })} className={fieldInputClass} />
                    </SettingsField>
                  ))}
                </div>
              </SettingsSection>
              <SettingsSection title="Feature gates" description="Control what roles can do within this center.">
                <SettingsSwitch label="Student portal" description="Enrolled students can sign in to LMS and fees." checked={config.allowStudentPortal} onChange={(v) => updateConfig({ allowStudentPortal: v })} />
                <SettingsSwitch label="Lead CSV import" description="Bulk import leads from spreadsheet files." checked={config.allowLeadCsvImport} onChange={(v) => updateConfig({ allowLeadCsvImport: v })} />
                <SettingsSwitch label="BDE direct conversion" description="Skip owner approval when converting leads." checked={config.allowBdeDirectConvert} onChange={(v) => updateConfig({ allowBdeDirectConvert: v })} />
                <SettingsSwitch label="Trainer batch delete" checked={config.allowTrainerDeleteBatch} onChange={(v) => updateConfig({ allowTrainerDeleteBatch: v })} />
                <SettingsSwitch label="Campaigns" checked={config.enableCampaigns} onChange={(v) => updateConfig({ enableCampaigns: v })} />
                <SettingsSwitch label="HR & payroll" checked={config.enableHrModule} onChange={(v) => updateConfig({ enableHrModule: v })} />
                <SettingsSwitch label="LMS AI tutor" checked={config.enableLmsAiTutor} onChange={(v) => updateConfig({ enableLmsAiTutor: v })} />
                <SettingsSwitch label="Job portal" checked={config.enableJobPortal} onChange={(v) => updateConfig({ enableJobPortal: v })} />
                <SettingsSwitch label="Public portal page" checked={config.publicPortalEnabled} onChange={(v) => updateConfig({ publicPortalEnabled: v })} />
                {config.publicPortalEnabled && config.tenantName && (
                  <p className="text-[11px] text-muted-foreground px-1">
                    Public URL: <span className="font-mono text-foreground">/portal/{config.tenantName.trim()}</span>
                  </p>
                )}
                <SettingsSwitch label="Scholarship tracking" checked={config.scholarshipTrackingEnabled} onChange={(v) => updateConfig({ scholarshipTrackingEnabled: v })} />
              </SettingsSection>
            </>
          )}

          {activeTab === "branding" && (
            <>
              <SettingsSection title="Visual identity">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="Logo" className="sm:col-span-2">
                    <div className="space-y-2">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          value={config.logoUrl}
                          onChange={(e) => {
                            setLogoUploadError(null)
                            updateConfig({ logoUrl: e.target.value })
                          }}
                          className={cn(fieldInputClass, "sm:flex-1")}
                          placeholder="https://res.cloudinary.com/… or paste a URL"
                        />
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                          className="hidden"
                          onChange={handleLogoUpload}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 h-10"
                          disabled={uploadingLogo}
                          isLoading={uploadingLogo}
                          icon={uploadingLogo ? undefined : Upload}
                          onClick={() => logoInputRef.current?.click()}
                        >
                          {uploadingLogo ? "Uploading…" : "Upload logo"}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        PNG, JPG, SVG, or WebP up to 5 MB · saved to Cloudinary under your institute folder
                      </p>
                      {logoUploadError && (
                        <p className="text-[10px] text-destructive">{logoUploadError}</p>
                      )}
                    </div>
                  </SettingsField>
                  <SettingsField label="Tagline">
                    <Input value={config.tagline} onChange={(e) => updateConfig({ tagline: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                  <SettingsField label="Custom domain">
                    <Input value={config.customDomain} onChange={(e) => updateConfig({ customDomain: e.target.value })} className={fieldInputClass} placeholder="learn.yourinstitute.com" />
                  </SettingsField>
                </div>
                {config.logoUrl && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg border border-dashed border-border p-4 bg-muted/20">
                    <img src={config.logoUrl} alt="Institute logo preview" className="h-12 w-auto max-w-[160px] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }} />
                    <div className="min-w-0">
                      <Badge variant="outline">Logo preview</Badge>
                      <p className="text-[10px] text-muted-foreground mt-1 truncate max-w-[280px]">{config.logoUrl}</p>
                    </div>
                  </div>
                )}
                <SettingsDivider />
                <SettingsField label="Owner dashboard welcome message">
                  <textarea value={config.welcomeMessage} onChange={(e) => updateConfig({ welcomeMessage: e.target.value })} className={fieldTextareaClass} rows={3} />
                </SettingsField>
              </SettingsSection>
              <SettingsSection title="Social & public links">
                <div className="grid gap-5 sm:grid-cols-2">
                  {(["website", "linkedin", "instagram", "whatsapp", "youtube", "facebook", "twitter"] as const).map((key) => (
                    <SettingsField key={key} label={key.charAt(0).toUpperCase() + key.slice(1)}>
                      <Input value={config[key]} onChange={(e) => updateConfig({ [key]: e.target.value })} className={fieldInputClass} />
                    </SettingsField>
                  ))}
                  <SettingsField label="Google Maps" className="sm:col-span-2">
                    <Input value={config.googleMaps} onChange={(e) => updateConfig({ googleMaps: e.target.value })} className={fieldInputClass} />
                  </SettingsField>
                </div>
              </SettingsSection>
            </>
          )}

          {activeTab === "notifications" && (
            <>
              <SettingsSection title="Delivery channels">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="SMS provider">
                    <Select value={config.smsProvider} onChange={(e) => updateConfig({ smsProvider: e.target.value })} className={fieldInputClass}>
                      <option value="twilio">Twilio</option>
                      <option value="sns">Amazon SNS</option>
                      <option value="nexmo">Vonage</option>
                      <option value="msgbird">MessageBird</option>
                      <option value="textlocal">TextLocal</option>
                    </Select>
                  </SettingsField>
                  <SettingsField label="Reminder lead time">
                    <Select value={config.reminderTimings} onChange={(e) => updateConfig({ reminderTimings: e.target.value })} className={fieldInputClass}>
                      <option value="24h">24 hours before</option>
                      <option value="48h">48 hours before</option>
                      <option value="72h">3 days before</option>
                      <option value="weekly">Weekly digest</option>
                    </Select>
                  </SettingsField>
                  <SettingsField label="Sender email">
                    <Input value={config.emailSender} onChange={(e) => updateConfig({ emailSender: e.target.value })} className={fieldInputClass} placeholder="noreply@yourinstitute.com" />
                  </SettingsField>
                  <SettingsField label="Fee reminder (days before due)">
                    <Input type="number" min={0} max={30} value={config.feeReminderDaysBefore} onChange={(e) => updateConfig({ feeReminderDaysBefore: Number(e.target.value) || 0 })} className={fieldInputClass} />
                  </SettingsField>
                </div>
              </SettingsSection>
              <SettingsSection title="Alert preferences">
                <SettingsSwitch label="WhatsApp alerts" checked={config.whatsappAlerts} onChange={(v) => updateConfig({ whatsappAlerts: v })} />
                <SettingsSwitch label="SMS alerts" checked={config.smsAlertsEnabled} onChange={(v) => updateConfig({ smsAlertsEnabled: v })} />
                <SettingsSwitch label="Daily digest email" checked={config.dailyDigestEnabled} onChange={(v) => updateConfig({ dailyDigestEnabled: v })} />
                <SettingsSwitch label="Automatic fee reminders" checked={config.feeReminderAutoSend} onChange={(v) => updateConfig({ feeReminderAutoSend: v })} />
                <SettingsSwitch label="Fee events" checked={config.emailAlertsFees} onChange={(v) => updateConfig({ emailAlertsFees: v })} />
                <SettingsSwitch label="Attendance alerts" checked={config.emailAlertsAttendance} onChange={(v) => updateConfig({ emailAlertsAttendance: v })} />
                <SettingsSwitch label="Admissions" checked={config.emailAlertsAdmissions} onChange={(v) => updateConfig({ emailAlertsAdmissions: v })} />
                <SettingsSwitch label="New leads" checked={config.emailAlertsLeads} onChange={(v) => updateConfig({ emailAlertsLeads: v })} />
              </SettingsSection>
            </>
          )}

          {activeTab === "billing" && (
            <>
              <SettingsSection title="Tax & invoicing">
                <div className="grid gap-5 sm:grid-cols-2">
                  <SettingsField label="GST / VAT number"><Input value={config.gstVatNumber} onChange={(e) => updateConfig({ gstVatNumber: e.target.value })} className={fieldInputClass} /></SettingsField>
                  <SettingsField label="Invoice prefix"><Input value={config.invoicePrefix} onChange={(e) => updateConfig({ invoicePrefix: e.target.value })} className={cn(fieldInputClass, "font-mono")} /></SettingsField>
                  <SettingsField label="Currency">
                    <Select value={config.currency} onChange={(e) => updateConfig({ currency: e.target.value })} className={fieldInputClass}>
                      <option value="INR">INR — Indian Rupee</option>
                      <option value="USD">USD — US Dollar</option>
                      <option value="EUR">EUR — Euro</option>
                      <option value="GBP">GBP — British Pound</option>
                    </Select>
                  </SettingsField>
                  <SettingsField label="Payment gateway">
                    <Select value={config.paymentGateway} onChange={(e) => updateConfig({ paymentGateway: e.target.value })} className={fieldInputClass}>
                      <option value="razorpay">Razorpay</option>
                      <option value="stripe">Stripe</option>
                      <option value="paypal">PayPal</option>
                      <option value="payu">PayU</option>
                    </Select>
                  </SettingsField>
                  <SettingsField label="Tax rate (%)"><Input type="number" value={config.taxRatePercent} onChange={(e) => updateConfig({ taxRatePercent: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                  <SettingsField label="Late fee (%)"><Input type="number" value={config.lateFeePercent} onChange={(e) => updateConfig({ lateFeePercent: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                  <SettingsField label="Late fee grace (days)"><Input type="number" value={config.lateFeeGraceDays} onChange={(e) => updateConfig({ lateFeeGraceDays: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                  <SettingsField label="Default installments"><Input type="number" min={1} max={12} value={config.defaultInstallmentCount} onChange={(e) => updateConfig({ defaultInstallmentCount: Number(e.target.value) || 1 })} className={fieldInputClass} /></SettingsField>
                </div>
                <SettingsDivider />
                <SettingsField label="Invoice footer note">
                  <textarea value={config.invoiceFooterNote} onChange={(e) => updateConfig({ invoiceFooterNote: e.target.value })} className={fieldTextareaClass} rows={2} />
                </SettingsField>
              </SettingsSection>
              <SettingsSection title="Payment options">
                <SettingsSwitch label="Allow partial payments" checked={config.allowPartialPayments} onChange={(v) => updateConfig({ allowPartialPayments: v })} />
                <SettingsSwitch label="Auto-generate receipts" checked={config.autoGenerateReceipts} onChange={(v) => updateConfig({ autoGenerateReceipts: v })} />
              </SettingsSection>
            </>
          )}

          {activeTab === "attendance" && (
            <SettingsSection title="Attendance policy">
              <div className="grid gap-5 sm:grid-cols-2 mb-2">
                <SettingsField label="Class duration (minutes)"><Input type="number" value={config.defaultClassDuration} onChange={(e) => updateConfig({ defaultClassDuration: Number(e.target.value) || 60 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Minimum attendance (%)"><Input type="number" value={config.minAttendancePercent} onChange={(e) => updateConfig({ minAttendancePercent: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Warning threshold (%)" hint="Risk alerts trigger below this value."><Input type="number" value={config.lowAttendanceThreshold} onChange={(e) => updateConfig({ lowAttendanceThreshold: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Auto-absent after (min)"><Input type="number" value={config.autoAbsentAfterMinutes} onChange={(e) => updateConfig({ autoAbsentAfterMinutes: Number(e.target.value) || 0 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Geofence radius (m)"><Input type="number" value={config.geofenceRadiusMeters} onChange={(e) => updateConfig({ geofenceRadiusMeters: Number(e.target.value) || 200 })} className={fieldInputClass} disabled={!config.geofenceEnabled} /></SettingsField>
              </div>
              <SettingsSwitch label="Allow late marking" checked={config.allowLateAttendanceMarking} onChange={(v) => updateConfig({ allowLateAttendanceMarking: v })} />
              <SettingsSwitch label="Geofence check-in" description="Require GPS proximity for attendance." checked={config.geofenceEnabled} onChange={(v) => updateConfig({ geofenceEnabled: v })} />
            </SettingsSection>
          )}

          {activeTab === "security" && (
            <SettingsSection title="Security controls">
              <div className="grid gap-5 sm:grid-cols-2 mb-2">
                <SettingsField label="Session timeout (minutes)"><Input type="number" value={config.sessionTimeoutMinutes} onChange={(e) => updateConfig({ sessionTimeoutMinutes: Number(e.target.value) || 480 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Minimum password length"><Input type="number" value={config.passwordMinLength} onChange={(e) => updateConfig({ passwordMinLength: Number(e.target.value) || 6 })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Data retention (days)"><Input type="number" value={config.dataRetentionDays} onChange={(e) => updateConfig({ dataRetentionDays: Number(e.target.value) || 365 })} className={fieldInputClass} /></SettingsField>
              </div>
              <SettingsField label="IP whitelist (optional)" hint="Comma-separated. Leave empty to allow all.">
                <Input value={config.ipWhitelist} onChange={(e) => updateConfig({ ipWhitelist: e.target.value })} className={cn(fieldInputClass, "font-mono text-xs")} placeholder="203.0.113.0, 198.51.100.42" />
              </SettingsField>
              <SettingsDivider />
              <SettingsSwitch label="Require 2FA for owners" checked={config.requireOwnerTwoFactor} onChange={(v) => updateConfig({ requireOwnerTwoFactor: v })} />
            </SettingsSection>
          )}

          {activeTab === "operations" && (
            <SettingsSection title="Regional & scheduling">
              <div className="grid gap-5 sm:grid-cols-2">
                <SettingsField label="Center code"><Input value={config.centerCode} onChange={(e) => updateConfig({ centerCode: e.target.value.toUpperCase() })} className={cn(fieldInputClass, "font-mono")} placeholder="IMS-SALEM" /></SettingsField>
                <SettingsField label="Timezone">
                  <Select value={config.timezone} onChange={(e) => updateConfig({ timezone: e.target.value })} className={fieldInputClass}>
                    <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                    <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                    <option value="Europe/London">Europe/London (GMT)</option>
                    <option value="America/New_York">America/New_York (EST)</option>
                    <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                    <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                  </Select>
                </SettingsField>
                <SettingsField label="Opens at"><Input type="time" value={config.operatingHoursStart} onChange={(e) => updateConfig({ operatingHoursStart: e.target.value })} className={fieldInputClass} /></SettingsField>
                <SettingsField label="Closes at"><Input type="time" value={config.operatingHoursEnd} onChange={(e) => updateConfig({ operatingHoursEnd: e.target.value })} className={fieldInputClass} /></SettingsField>
              </div>
            </SettingsSection>
          )}
        </div>
      </div>
    </div>
  )
}

export { CONFIG_TABS, MODULE_META as MODULE_DETAILS }
