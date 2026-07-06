"use client"

import * as React from "react"
import { ShieldOff } from "lucide-react"
import { type CenterFeatureKey, isPolicyFeatureEnabled } from "@/lib/centerPolicyClient"
import { useStore } from "@/store/useStore"
import { Card, CardContent } from "@/components/ui/Card"

export function FeatureGate({
  feature,
  children,
  fallback,
}: {
  feature: CenterFeatureKey
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { user, centerPolicy } = useStore()
  if (user?.role === "super_admin") return <>{children}</>
  if (isPolicyFeatureEnabled(centerPolicy, feature)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  return (
    <Card className="rounded-2xl border-dashed max-w-lg mx-auto mt-16">
      <CardContent className="py-16 text-center space-y-3">
        <ShieldOff className="h-10 w-10 text-muted-foreground/50 mx-auto" />
        <p className="text-sm font-semibold text-foreground">Feature not enabled</p>
        <p className="text-xs text-muted-foreground">
          This module is disabled for your institute. Contact your administrator to enable it.
        </p>
      </CardContent>
    </Card>
  )
}

export function PageFeatureGate({
  feature,
  children,
}: {
  feature: CenterFeatureKey
  children: React.ReactNode
}) {
  return <FeatureGate feature={feature}>{children}</FeatureGate>
}

export function useFeatureEnabled(feature: CenterFeatureKey) {
  const { user, centerPolicy } = useStore()
  if (user?.role === "super_admin") return true
  return isPolicyFeatureEnabled(centerPolicy, feature)
}
