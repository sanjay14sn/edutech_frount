"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { PageFeatureGate } from "@/components/shared/FeatureGate"
import { useStore } from "@/store/useStore"

const STAFF_ALLOWED = new Set([
  "/hr/me",
  "/hr/attendance",
  "/hr/leave",
  "/hr/expenses",
  "/hr/documents",
])

export default function HRLayout({ children }: { children: React.ReactNode }) {
  const { user } = useStore()
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    if (!user) return
    if (user.role === "trainer" || user.role === "bde") {
      const allowed = STAFF_ALLOWED.has(pathname) || pathname.startsWith("/hr/me")
      if (!allowed) {
        router.replace("/hr/me")
      }
    }
  }, [user, pathname, router])

  return (
    <PageFeatureGate feature="enableHrModule">
      <div className="min-w-0 w-full">{children}</div>
    </PageFeatureGate>
  )
}
