"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Settings, Shield, Bell, KeyRound, Building, Palette, Save, Users, Plus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"

export default function SettingsPage() {
  const router = useRouter()
  const { user, activeTenant, addNotification } = useStore()
  const role = user?.role || "owner"
  const [activeTab, setActiveTab] = React.useState("branding")

  React.useEffect(() => {
    if (role === "super_admin") {
      router.replace("/centers")
    }
  }, [role, router])

  if (role === "super_admin") {
    return null
  }

  // Form states
  const [instName, setInstName] = React.useState(activeTenant?.name || "Your Institute")
  const [instDomain, setInstDomain] = React.useState(activeTenant?.domain || "apex.eduplatform.com")
  const [brandColor, setBrandColor] = React.useState("#3b82f6")
  const [warnAttd, setWarnAttd] = React.useState("75")
  const [emailAlerts, setEmailAlerts] = React.useState(true)
  const [smsAlerts, setSmsAlerts] = React.useState(false)

  React.useEffect(() => {
    if (typeof window === "undefined" || role !== "owner") return
    const tenant = activeTenant?.name
    if (!tenant) return
    try {
      const raw = localStorage.getItem(`centerPolicy:${tenant}`)
      if (!raw) return
      const policy = JSON.parse(raw) as { lowAttendanceThreshold?: number; brandColor?: string }
      if (policy.lowAttendanceThreshold) {
        setWarnAttd(String(policy.lowAttendanceThreshold))
      }
      if (policy.brandColor) {
        setBrandColor(policy.brandColor)
      }
    } catch {
      // ignore invalid stored policy
    }
  }, [role, activeTenant?.name])

  if (role === "student" || role === "trainer") {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-card border border-border rounded-xl space-y-4 max-w-md mx-auto text-center mt-20 animate-scale-in">
        <Shield className="h-12 w-12 text-destructive animate-pulse" />
        <div>
          <h2 className="text-base font-bold text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Configuration and system tenant settings are only accessible to Institute Owners and Admins.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.history.back()} className="mt-2 text-xs">
          Go Back
        </Button>
      </div>
    )
  }

  const handleSaveSettings = (section: string) => {
    addNotification({
      title: "Settings Saved",
      description: `${section} settings updated successfully.`,
      type: "system"
    })
    alert(`Success: ${section} settings have been saved!`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <span>System & Tenant Settings</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure branding presets, class attendance threshold rules, notify templates, and security settings.
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="branding" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Vertical Navigation list on desktop */}
          <div className="w-full lg:w-60 shrink-0">
            <TabsList className="flex lg:flex-col items-stretch w-full h-auto p-1 bg-card border border-border/80 rounded-xl space-y-0.5">
              <TabsTrigger value="branding" className="justify-start gap-2.5 text-xs text-left py-2 px-3">
                <Palette className="h-4 w-4" />
                <span>Branding & Core</span>
              </TabsTrigger>

              <TabsTrigger value="roles" className="justify-start gap-2.5 text-xs text-left py-2 px-3">
                <Users className="h-4 w-4" />
                <span>Team & Access</span>
              </TabsTrigger>
              <TabsTrigger value="attendance" className="justify-start gap-2.5 text-xs text-left py-2 px-3">
                <Shield className="h-4 w-4" />
                <span>Attendance Gating</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="justify-start gap-2.5 text-xs text-left py-2 px-3">
                <Bell className="h-4 w-4" />
                <span>Notification Hub</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="justify-start gap-2.5 text-xs text-left py-2 px-3">
                <KeyRound className="h-4 w-4" />
                <span>Account Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Form Content pages */}
          <div className="flex-1">
            {/* Branding Settings */}
            <TabsContent value="branding" className="mt-0 animate-scale-in">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold flex items-center gap-1.5">
                    <Building className="h-4.5 w-4.5 text-primary" />
                    <span>Institute Identity & Branding</span>
                  </CardTitle>
                  <CardDescription>Customize school branding properties for this tenant container.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-muted-foreground">Institute Name</label>
                      <Input
                        value={instName}
                        onChange={(e) => setInstName(e.target.value)}
                        className="bg-card text-xs"
                      />
                    </div>
                    <div className="space-y-1 text-xs">
                      <label className="font-semibold text-muted-foreground">Custom Subdomain</label>
                      <Input
                        value={instDomain}
                        onChange={(e) => setInstDomain(e.target.value)}
                        className="bg-card text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 text-xs max-w-xs">
                    <label className="font-semibold text-muted-foreground">Primary Accent Color</label>
                    <div className="flex gap-2.5">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-9 w-12 rounded-lg border border-border cursor-pointer bg-card"
                      />
                      <Input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="bg-card text-xs"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button variant="primary" size="sm" icon={Save} onClick={() => handleSaveSettings("Branding")}>
                      Save branding Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>


            {/* Team Roles */}
            <TabsContent value="roles" className="mt-0 animate-scale-in">
              <Card className="bg-card">
                <CardHeader className="flex flex-row items-center justify-between pb-3.5 border-b border-border/40">
                  <div>
                    <CardTitle className="text-base font-extrabold">Staff Role permissions</CardTitle>
                    <CardDescription>Active personnel registered in Apex.</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" icon={Plus} className="text-xs">
                    Invite Member
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border/60">
                    <div className="flex justify-between items-center p-4 text-xs">
                      <div>
                        <p className="font-bold text-foreground">Sarah Jenkins</p>
                        <p className="text-muted-foreground">sarah@apexacademy.com</p>
                      </div>
                      <Badge>Owner</Badge>
                    </div>
                    <div className="flex justify-between items-center p-4 text-xs">
                      <div>
                        <p className="font-bold text-foreground">Marcus Vance</p>
                        <p className="text-muted-foreground">marcus@apexacademy.com</p>
                      </div>
                      <Badge variant="secondary">Trainer</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance threshold */}
            <TabsContent value="attendance" className="mt-0 animate-scale-in">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold">Attendance policy thresholds</CardTitle>
                  <CardDescription>Configure Gating criteria and automated warnings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5 text-xs max-w-sm">
                    <label className="font-semibold text-muted-foreground">Warning Limit (%)</label>
                    <Select
                      value={warnAttd}
                      onChange={(e) => setWarnAttd(e.target.value)}
                      className="bg-card text-xs h-9.5"
                    >
                      <option value="60">60% minimum</option>
                      <option value="70">70% minimum</option>
                      <option value="75">75% minimum</option>
                      <option value="80">80% minimum</option>
                    </Select>
                  </div>

                  <p className="text-[10px] text-muted-foreground max-w-md leading-normal">
                    Setting warnings prompts red danger tags next to students in lists and dashboards who drop below safety limits, sending notifications automatically.
                  </p>

                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button variant="primary" size="sm" icon={Save} onClick={() => handleSaveSettings("Attendance Policy")}>
                      Save policy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Hub */}
            <TabsContent value="notifications" className="mt-0 animate-scale-in">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold">Notification hub alerts</CardTitle>
                  <CardDescription>Check alerts to receive email/SMS messages on system activities.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-bold text-foreground">Email Notifications</p>
                        <span className="text-[10px] text-muted-foreground">Daily briefs on admissions, revenue, and alerts.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3.5 rounded-lg border border-border bg-card">
                      <div>
                        <p className="font-bold text-foreground">SMS Warning Logs</p>
                        <span className="text-[10px] text-muted-foreground">Real-time alerts to trainers when attendance drops.</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsAlerts}
                        onChange={(e) => setSmsAlerts(e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-4.5 w-4.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button variant="primary" size="sm" icon={Save} onClick={() => handleSaveSettings("Notification Channels")}>
                      Save Alerts
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security" className="mt-0 animate-scale-in">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold">Account details security</CardTitle>
                  <CardDescription>Update passwords and sessions keys.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-xs">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">New Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-card text-xs h-9.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Confirm Password</label>
                      <Input
                        type="password"
                        placeholder="••••••••"
                        className="bg-card text-xs h-9.5"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border/50 flex justify-end">
                    <Button variant="primary" size="sm" icon={Save} onClick={() => handleSaveSettings("Credentials Safety")}>
                      Change Password
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
