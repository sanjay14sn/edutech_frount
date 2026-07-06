"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { Sidebar } from "@/components/shared/Sidebar"
import { Navbar } from "@/components/shared/Navbar"
import { SessionFeedbackPrompt } from "@/components/session/SessionFeedbackPrompt"
import {
  clearAuthSession,
  verifyStudentPortalAccess,
} from "@/lib/studentAccess"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { isAuthenticated, user, theme, logout, login, fetchNotifications, fetchCenterPolicy, fetchSupportQueueCount } = useStore()
  const [verified, setVerified] = React.useState(false)

  // Apply theme
  React.useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [theme])

  // On every mount, verify the token with the backend.
  // This catches stale sessions (old users, expired tokens, backend restarts).
  React.useEffect(() => {
    const verifyAndGuard = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

      if (!token) {
        logout()
        router.replace("/login")
        return
      }

      try {
        const { user: freshUser } = await api.verifySession()
        login(freshUser)

        if (freshUser?.role === "student") {
          const { allowed } = await verifyStudentPortalAccess()
          if (!allowed) {
            clearAuthSession()
            logout()
            router.replace("/login")
            return
          }
        }

        await fetchCenterPolicy()
        if (freshUser?.role === "super_admin") {
          await fetchSupportQueueCount()
        }
        setVerified(true)
        void fetchNotifications()
      } catch {
        // Token invalid or user no longer exists — wipe everything
        clearAuthSession()
        logout()
        router.replace("/login")
      }
    }

    verifyAndGuard()
  }, [])

  // Refresh live counts when the tab regains focus
  React.useEffect(() => {
    if (!verified) return
    const onRefresh = () => {
      if (user?.role === "super_admin") {
        void fetchSupportQueueCount()
      } else {
        void fetchCenterPolicy()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === "visible") onRefresh()
    }
    window.addEventListener("focus", onRefresh)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", onRefresh)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [verified, user?.role, fetchCenterPolicy, fetchSupportQueueCount])

  if (!verified) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-zinc-400">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs text-zinc-400">Loading session...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 md:p-6 bg-muted/20">
          <div className="mx-auto max-w-7xl animate-slide-in-bottom">
            {children}
          </div>
        </main>
        {user.role === "student" ? <SessionFeedbackPrompt /> : null}
      </div>
    </div>
  )
}
