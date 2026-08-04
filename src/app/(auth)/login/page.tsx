"use client"

import * as React from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Sparkles, Mail, ArrowRight,
  ShieldCheck, CheckCircle2, Lock, Eye, EyeOff, Building2
} from "lucide-react"
import { useStore } from "@/store/useStore"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  clearAuthSession,
  getStudentAccessDeniedMessage,
  verifyStudentPortalAccess,
} from "@/lib/studentAccess"

type AuthView = "login" | "forgot"

export default function LoginPage() {
  const router = useRouter()
  const { login, logout, isAuthenticated } = useStore()

  const [view, setView] = React.useState<AuthView>("login")
  const [isLoading, setIsLoading] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [successMsg, setSuccessMsg] = React.useState("")
  const isAccessDeniedError = errorMsg.includes("on hold") || errorMsg.includes("does not have portal access") || errorMsg.includes("enrollment is completed")

  React.useEffect(() => {
    if (isAuthenticated) router.push("/dashboard")
  }, [isAuthenticated, router])

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!email || !password) {
      setErrorMsg("Please fill in all fields.")
      return
    }

    setIsLoading(true)
    try {
      const { api } = await import("@/lib/api")
      const response = await api.login({ email, password })

      if (typeof window !== "undefined") {
        localStorage.setItem("token", response.token)
      }
      login(response.user)

      if (response.user?.role === "student") {
        const { allowed, status } = await verifyStudentPortalAccess()
        if (!allowed) {
          clearAuthSession()
          logout()
          setErrorMsg(getStudentAccessDeniedMessage(status))
          return
        }
      }

      router.push("/dashboard")
    } catch (err: any) {
      const message = err?.message || "Invalid email or password."
      setErrorMsg(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg("")

    if (!email) {
      setErrorMsg("Please enter your email address.")
      return
    }

    setIsLoading(true)
    setTimeout(() => {
      setIsLoading(false)
      setSuccessMsg("Reset link sent! Check your inbox.")
    }, 1000)
  }

  return (
    <div className="flex min-h-screen w-screen overflow-hidden font-sans relative">
      {/* Mobile background overlay */}
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center lg:hidden opacity-20"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/90 via-blue-600/90 to-cyan-500/90 lg:hidden pointer-events-none" />

      {/* ─── Left branding panel ─── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="52vw"
        />
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700/85 via-blue-600/80 to-cyan-600/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/40 via-transparent to-transparent" />
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-white/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/3 h-60 w-60 rounded-full bg-cyan-300/10 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 z-10 relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            EduPlatform CRM
          </span>
        </div>

        {/* Hero content */}
        <div className="space-y-5 z-10 max-w-lg relative">
          <h1 className="text-4xl font-extrabold tracking-tight leading-[1.15] text-white drop-shadow-sm">
            The Operating System for<br />Modern Education.
          </h1>
          <p className="text-[15px] text-white/70 leading-relaxed max-w-md">
            Manage multi-tenant institutes, automate fee billing, run pipeline conversions, and track metrics on a unified dashboard.
          </p>

          <div className="space-y-2.5 pt-3">
            {[
              { icon: Building2, label: "Multi-Institute Management", desc: "Register and manage unlimited training hubs" },
              { icon: ShieldCheck, label: "Role-Based Access Control", desc: "Super Admin → Owner → Trainer → Student" },
              { icon: CheckCircle2, label: "End-to-End CRM & LMS", desc: "Leads, batches, attendance, fees, and jobs" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/15 p-3.5 transition-colors hover:bg-white/15">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 border border-white/10">
                  <Icon className="h-4.5 w-4.5 text-white/90" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white">{label}</p>
                  <p className="text-[11px] text-white/55">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-xs text-white/40 z-10 relative">
          © 2026 EduPlatform ERP. Built for modern education businesses.
        </div>
      </div>

      {/* ─── Right form panel ─── */}
      <div className="w-full lg:w-[48%] flex items-center justify-center p-6 md:p-12 relative z-10 lg:bg-white">

        <div className="w-full max-w-[380px] space-y-7">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm border border-white/25">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-base font-bold text-white">EduPlatform CRM</span>
          </div>

          <AnimatePresence mode="wait">
            {view === "login" && (
              <motion.div
                key="login"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h2 className="text-[26px] font-bold tracking-tight text-white lg:text-gray-900">Sign In</h2>
                  <p className="text-sm text-white/60 lg:text-gray-500">
                    Enter your credentials to access the platform.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/80 lg:text-gray-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 lg:text-gray-400" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full text-sm rounded-xl px-4 py-3 pl-11 transition-all duration-200
                          bg-white/10 border border-white/20 text-white placeholder:text-white/35 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20
                          lg:bg-gray-50 lg:border-gray-200 lg:text-gray-900 lg:placeholder:text-gray-400 lg:focus:border-indigo-500 lg:focus:ring-2 lg:focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-white/80 lg:text-gray-700">Password</label>
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-[11px] font-medium text-white/50 hover:text-white lg:text-indigo-600 lg:hover:text-indigo-700 cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 lg:text-gray-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full text-sm rounded-xl px-4 py-3 pl-11 pr-11 transition-all duration-200
                          bg-white/10 border border-white/20 text-white placeholder:text-white/35 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20
                          lg:bg-gray-50 lg:border-gray-200 lg:text-gray-900 lg:placeholder:text-gray-400 lg:focus:border-indigo-500 lg:focus:ring-2 lg:focus:ring-indigo-500/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white lg:text-gray-400 lg:hover:text-gray-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className={`rounded-lg px-3.5 py-2.5 border ${
                      isAccessDeniedError
                        ? "bg-amber-50 border-amber-200 lg:bg-amber-50 lg:border-amber-200"
                        : "bg-red-50 border-red-200 lg:bg-red-50 lg:border-red-200"
                    }`}>
                      <p className={`text-xs font-medium ${
                        isAccessDeniedError ? "text-amber-700" : "text-red-600"
                      }`}>{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold rounded-xl py-3 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Sign In
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              </motion.div>
            )}

            {view === "forgot" && (
              <motion.div
                key="forgot"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
                className="space-y-6"
              >
                <div className="space-y-1.5">
                  <h2 className="text-[26px] font-bold tracking-tight text-white lg:text-gray-900 flex items-center gap-2.5">
                    <Lock className="h-5 w-5 text-white/60 lg:text-indigo-500" />
                    Forgot Password
                  </h2>
                  <p className="text-sm text-white/60 lg:text-gray-500">
                    Enter your email and we&apos;ll send a recovery link.
                  </p>
                </div>

                {successMsg && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 p-3.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-700">{successMsg}</p>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-white/80 lg:text-gray-700">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-white/40 lg:text-gray-400" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full text-sm rounded-xl px-4 py-3 pl-11 transition-all duration-200
                          bg-white/10 border border-white/20 text-white placeholder:text-white/35 focus:outline-none focus:border-white/50 focus:ring-2 focus:ring-white/20
                          lg:bg-gray-50 lg:border-gray-200 lg:text-gray-900 lg:placeholder:text-gray-400 lg:focus:border-indigo-500 lg:focus:ring-2 lg:focus:ring-indigo-500/20"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-600 font-medium">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-60 text-sm font-semibold rounded-xl py-3 transition-all duration-200 cursor-pointer shadow-md shadow-indigo-600/25 hover:shadow-lg hover:shadow-indigo-600/30"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : "Send Recovery Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setView("login"); setErrorMsg(""); setSuccessMsg("") }}
                    className="w-full text-center text-xs font-medium text-white/50 hover:text-white lg:text-gray-500 lg:hover:text-indigo-600 cursor-pointer transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
