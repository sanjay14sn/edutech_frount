"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Building2, Mail, MapPin, Phone, Globe } from "lucide-react"
import { api } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/Card"

type PublicPortal = {
  tenantId: string
  name: string
  tagline: string
  logoUrl: string
  brandColor: string
  website: string
  welcomeMessage: string
  location: string
  email: string
  phone: string
}

export default function PublicPortalPage() {
  const params = useParams()
  const tenant = String(params.tenant || "")
  const [portal, setPortal] = React.useState<PublicPortal | null>(null)
  const [error, setError] = React.useState("")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!tenant) return
    api.getPublicCenterPortal(tenant)
      .then((data) => setPortal(data as PublicPortal))
      .catch((err: Error) => setError(err.message || "Portal unavailable"))
      .finally(() => setLoading(false))
  }, [tenant])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <p className="text-sm text-muted-foreground">Loading institute portal…</p>
      </div>
    )
  }

  if (error || !portal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md w-full rounded-2xl">
          <CardContent className="py-12 text-center space-y-2">
            <Building2 className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-semibold">Portal not available</p>
            <p className="text-xs text-muted-foreground">{error || "This institute has not enabled a public portal page."}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/40 to-background">
      <header
        className="border-b border-border/60 bg-card/80 backdrop-blur-xl"
        style={{ borderTopColor: portal.brandColor, borderTopWidth: 4 }}
      >
        <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
          {portal.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portal.logoUrl} alt={portal.name} className="h-16 w-16 rounded-2xl object-cover border border-border" />
          ) : (
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl"
              style={{ backgroundColor: portal.brandColor }}
            >
              {portal.name.charAt(0)}
            </div>
          )}
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">{portal.name}</h1>
            {portal.tagline && <p className="text-sm text-muted-foreground">{portal.tagline}</p>}
            {portal.welcomeMessage && <p className="text-xs text-muted-foreground max-w-xl pt-1">{portal.welcomeMessage}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <Card className="rounded-2xl">
          <CardContent className="p-6 grid gap-4 sm:grid-cols-2 text-sm">
            {portal.location && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4 shrink-0" />
                {portal.location}
              </p>
            )}
            {portal.email && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                {portal.email}
              </p>
            )}
            {portal.phone && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0" />
                {portal.phone}
              </p>
            )}
            {portal.website && (
              <a href={portal.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                <Globe className="h-4 w-4 shrink-0" />
                {portal.website.replace(/^https?:\/\//, "")}
              </a>
            )}
          </CardContent>
        </Card>

        <div className="text-center pt-4">
          <a
            href="/login"
            className="inline-flex items-center justify-center rounded-xl px-6 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: portal.brandColor }}
          >
            Sign in to portal
          </a>
        </div>
      </main>
    </div>
  )
}
