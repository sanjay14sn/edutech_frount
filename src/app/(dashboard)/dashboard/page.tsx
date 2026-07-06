"use client"

import * as React from "react"
import { useStore } from "@/store/useStore"
import { SuperAdminDashboard } from "@/components/dashboard/SuperAdminDashboard"
import { OwnerDashboard } from "@/components/dashboard/OwnerDashboard"
import { TrainerDashboard } from "@/components/dashboard/TrainerDashboard"
import { StudentDashboard } from "@/components/dashboard/StudentDashboard"
import { BDEDashboard } from "@/components/dashboard/BDEDashboard"

export default function DashboardPage() {
  const { user } = useStore()

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <svg className="animate-spin h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    )
  }

  switch (user.role) {
    case "super_admin":
      return <SuperAdminDashboard />
    case "owner":
      return <OwnerDashboard />
    case "trainer":
      return <TrainerDashboard />
    case "student":
      return <StudentDashboard />
    case "bde":
      return <BDEDashboard />
    default:
      return <OwnerDashboard />
  }
}
