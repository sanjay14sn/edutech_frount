"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { Sidebar } from "@/components/shared/Sidebar"
import { Navbar } from "@/components/shared/Navbar"
import { PageLoader } from "@/components/shared/PageLoader"
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
    return <PageLoader variant="fullscreen" />
  }

  if (!isAuthenticated || !user) {
    return <PageLoader variant="fullscreen" />
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
