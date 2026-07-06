"use client"

import * as React from "react"
import { useRouter, usePathname } from "next/navigation"
import { useStore } from "@/store/useStore"
import { api, ApiError } from "@/lib/api"
import {
  clearAuthSession,
  verifyStudentPortalAccess,
} from "@/lib/studentAccess"

/**
 * SessionGuard — runs on every page load and verifies the stored JWT
 * against the backend /auth/me endpoint.
 *
 * If the token is missing, expired, or the user no longer exists in the DB
 * (e.g. after a backend restart), it clears ALL localStorage and redirects
 * to /login automatically.
 */
export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { logout, login, isAuthenticated } = useStore()
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    const isAuthPage = pathname.startsWith("/login") || pathname === "/"

    const verify = async () => {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null

      // No token stored → clear state and redirect to login (unless already there)
      if (!token) {
        if (isAuthenticated) logout()
        setChecked(true)
        if (!isAuthPage) router.replace("/login")
        return
      }

      try {
        // Hit the backend to confirm the token + user are still valid
        const { user } = await api.verifySession()
        // Token is valid — sync user into store (handles backend restarts)
        login(user)

        if (user?.role === "student") {
          const { allowed } = await verifyStudentPortalAccess()
          if (!allowed) {
            console.warn("Student access revoked — clearing session.")
            clearAuthSession()
            logout()
            setChecked(true)
            router.replace("/login")
            return
          }
        }

        setChecked(true)
      } catch (error) {
        const authFailed =
          error instanceof ApiError && (error.status === 401 || error.status === 403)
        const transient =
          (error instanceof ApiError && error.transient) || error instanceof TypeError

        if (transient) {
          // Backend restarting or briefly unreachable — keep the stored session.
          console.warn("Backend temporarily unavailable — keeping session and retrying later.")
          setChecked(true)
          return
        }

        if (!authFailed) {
          console.warn("Session check failed without auth error — keeping session.", error)
          setChecked(true)
          return
        }

        console.warn("Session invalid — clearing and redirecting to login.")
        clearAuthSession()
        logout()
        setChecked(true)
        router.replace("/login")
      }
    }

    verify()
    // Re-verify when the path changes (navigating between pages)
  }, [pathname])

  // Show nothing until session check completes — prevents flash of wrong content
  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}
