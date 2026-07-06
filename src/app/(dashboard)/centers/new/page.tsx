"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft, Building2, Plus, CheckCircle2, Eye, EyeOff, KeyRound, User, Mail, Phone, MapPin, Shield
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { useStore } from "@/store/useStore"
import { type ModuleKey, ALL_MODULES } from "@/store/useStore"
import { api } from "@/lib/api"

const MODULE_DETAILS: Record<ModuleKey, { title: string; desc: string; icon: string }> = {
  crm: { title: "Leads CRM", desc: "Admissions pipeline & follow-ups.", icon: "🎯" },
  students: { title: "Students Portal", desc: "Profiles, documents & progress.", icon: "🎓" },
  trainers: { title: "Trainers Registry", desc: "Scheduling & performance.", icon: "👨‍🏫" },
  courses: { title: "Courses & Batches", desc: "Schedules, cohorts & syllabus.", icon: "📚" },
  attendance: { title: "Attendance Logs", desc: "Digital sign-in & reporting.", icon: "⏱️" },
  fees: { title: "Fees & Billing", desc: "Invoicing & payment schedules.", icon: "💳" },
  jobs: { title: "Job Board", desc: "Recruiter listings & AI matching.", icon: "💼" },
  analytics: { title: "Analytics", desc: "Revenue, batches & engagement.", icon: "📈" },
}

export default function RegisterCenterPage() {
  const router = useRouter()
  const { addNotification } = useStore()

  // Core fields
  const [instituteName, setInstituteName] = React.useState("")
  const [location, setLocation] = React.useState("")
  const [status, setStatus] = React.useState<"active" | "inactive" | "maintenance">("active")

  // Owner login fields
  const [ownerName, setOwnerName] = React.useState("")
  const [ownerEmail, setOwnerEmail] = React.useState("")
  const [ownerPhone, setOwnerPhone] = React.useState("")
  const [ownerPassword, setOwnerPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)

  // Modules
  const [enabledModules, setEnabledModules] = React.useState<ModuleKey[]>([...ALL_MODULES])

  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState("")

  const toggleModule = (mod: ModuleKey) => {
    setEnabledModules(prev =>
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!instituteName || !location || !ownerName || !ownerEmail || !ownerPhone || !ownerPassword) {
      setError("Please fill in all required fields.")
      return
    }
    if (ownerPassword.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }
    if (enabledModules.length === 0) {
      setError("Select at least one module.")
      return
    }

    setSaving(true)
    try {
      // 1. Register the owner login
      try {
        await api.register({
          name: ownerName,
          email: ownerEmail,
          password: ownerPassword,
          role: "owner",
          tenantId: instituteName
        })
      } catch (err: any) {
        if (err.message !== "User already exists") {
          throw err
        }
      }

      // 2. Create the center
      await api.createCenter({
        name: instituteName,
        tenantName: instituteName,
        location,
        manager: ownerName,
        email: ownerEmail,
        phone: ownerPhone,
        status,
        enabledModules,
      })

      addNotification({
        title: "Institute Registered",
        description: `"${instituteName}" created. Owner login: ${ownerEmail}`,
        type: "system"
      })

      router.push("/centers")
    } catch (err: any) {
      setError(err.message || "Failed to register institute. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-2 border-b border-border/40 pb-4">
        <button
          onClick={() => router.push("/centers")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Centers
        </button>
        <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2 mt-1">
          <Building2 className="h-6 w-6 text-primary" />
          Register New Institute
        </h1>
        <p className="text-xs text-muted-foreground">
          Fill in the institute details and owner login credentials. The owner can log in immediately after registration.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-2">
        {/* Left: Institute Info */}
        <div className="space-y-6">
          {/* Institute Details */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Institute Details
              </CardTitle>
              <CardDescription className="text-xs">Basic information about the training hub.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Institute Name *</label>
                <Input
                  required
                  placeholder="e.g. Apex Tech Academy"
                  value={instituteName}
                  onChange={e => setInstituteName(e.target.value)}
                  className="bg-card text-xs h-10 border-border/80 focus:border-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Location *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    placeholder="e.g. Mumbai, Maharashtra"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Status</label>
                <Select
                  value={status}
                  onChange={e => setStatus(e.target.value as any)}
                  className="bg-card text-xs h-10 border-border/80"
                >
                  <option value="active">Active / Operational</option>
                  <option value="inactive">Suspended / Inactive</option>
                  <option value="maintenance">Under Maintenance</option>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Owner Login */}
          <Card className="bg-card border-border/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-primary" />
                Owner Login Access
              </CardTitle>
              <CardDescription className="text-xs">These credentials will be used by the institute owner to log in.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Owner Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    placeholder="e.g. Rajesh Kumar"
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Login Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="email"
                    placeholder="owner@institute.com"
                    value={ownerEmail}
                    onChange={e => setOwnerEmail(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Phone Number *</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={ownerPhone}
                    onChange={e => setOwnerPhone(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Login Password *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    value={ownerPassword}
                    onChange={e => setOwnerPassword(e.target.value)}
                    className="bg-card text-xs h-10 border-border/80 focus:border-primary pl-9 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Share these credentials with the institute owner.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Module Permissions */}
        <div>
          <Card className="bg-card border-border/80 h-full flex flex-col">
            <CardHeader className="border-b border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold">Module Access</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Select which modules this institute can access.</CardDescription>
                </div>
                <div className="flex items-center gap-3 text-[10px] font-semibold">
                  <button type="button" onClick={() => setEnabledModules([...ALL_MODULES])} className="text-primary hover:underline cursor-pointer">All</button>
                  <span className="text-border">|</span>
                  <button type="button" onClick={() => setEnabledModules([])} className="text-muted-foreground hover:underline cursor-pointer">None</button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 grid gap-2.5 sm:grid-cols-2 pt-4 content-start">
              {ALL_MODULES.map(mod => {
                const details = MODULE_DETAILS[mod]
                const isChecked = enabledModules.includes(mod)
                return (
                  <div
                    key={mod}
                    onClick={() => toggleModule(mod)}
                    className={`relative flex items-start gap-2.5 p-3 rounded-xl border transition-all duration-150 cursor-pointer select-none ${
                      isChecked
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/60 bg-card hover:bg-secondary/40 hover:border-border"
                    }`}
                  >
                    <div className="flex items-center justify-center text-lg shrink-0 h-8 w-8 bg-secondary/80 rounded-lg">
                      {details.icon}
                    </div>
                    <div className="space-y-0.5 pr-5 min-w-0">
                      <p className="text-xs font-bold text-foreground">{details.title}</p>
                      <p className="text-[10px] text-muted-foreground leading-snug">{details.desc}</p>
                    </div>
                    <div className="absolute right-3 top-3 shrink-0">
                      <div className={`h-4 w-4 rounded-md border flex items-center justify-center transition-colors ${
                        isChecked ? "bg-primary border-primary text-white" : "border-border bg-transparent"
                      }`}>
                        {isChecked && <CheckCircle2 className="h-2.5 w-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                )
              })}
            </CardContent>

            {/* Footer */}
            <div className="p-5 border-t border-border/40 bg-secondary/20 rounded-b-xl space-y-3">
              {error && (
                <p className="text-xs text-red-400 font-medium">{error}</p>
              )}
              <div className="flex items-center justify-end gap-2.5">
                <Button type="button" variant="outline" size="sm" onClick={() => router.push("/centers")}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={Plus}
                  className="shadow-sm shadow-primary/20"
                  disabled={saving}
                >
                  {saving ? "Registering..." : "Register Institute"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </div>
  )
}
