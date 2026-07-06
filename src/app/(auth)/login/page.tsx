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
    <div className="flex min-h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">
      <Image
        src="/login-bg.jpg"
        alt=""
        fill
        priority
        className="object-cover object-center lg:hidden opacity-30"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-zinc-950/85 lg:hidden pointer-events-none" />
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 border-r border-zinc-800/60 relative overflow-hidden">
        <Image
          src="/login-bg.jpg"
          alt=""
          fill
          priority
          className="object-cover object-center"
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-950/55 via-zinc-900/45 to-black/65" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-zinc-950/20" />
        <div className="absolute top-1/4 left-1/4 h-80 w-80 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2.5 z-10 relative">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-black">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
            EduPlatform CRM
          </span>
        </div>

        <div className="space-y-6 z-10 max-w-md relative">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight text-zinc-100">
            The Operating System for Modern Education.
          </h1>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Manage multi-tenant institutes, automate fee billing, run pipeline conversions, and track metrics on a unified dashboard.
          </p>

          <div className="space-y-3 pt-4">
            {[
              { icon: Building2, label: "Multi-Institute Management", desc: "Register and manage unlimited training hubs" },
              { icon: ShieldCheck, label: "Role-Based Access Control", desc: "Super Admin → Owner → Trainer → Student" },
              { icon: CheckCircle2, label: "End-to-End CRM & LMS", desc: "Leads, batches, attendance, fees, and jobs" },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 border border-zinc-700/50">
                  <Icon className="h-4 w-4 text-zinc-300" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-zinc-200">{label}</p>
                  <p className="text-[10px] text-zinc-500">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-zinc-500 z-10 relative">
          © 2026 EduPlatform ERP. Built for modern education businesses.
        </div>
      </div>

      {/* Right form panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative bg-transparent lg:bg-zinc-950 z-10">
        <div className="absolute top-10 right-10 h-40 w-40 rounded-full bg-primary/5 blur-3xl lg:hidden" />

        <div className="w-full max-w-sm space-y-6">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-black">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-base font-bold text-zinc-100">EduPlatform CRM</span>
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
                  <h2 className="text-2xl font-bold tracking-tight text-white">Sign In</h2>
                  <p className="text-xs text-zinc-400">
                    Enter your credentials to access the platform.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 pl-10 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-zinc-300">Password</label>
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 pl-10 pr-10 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className={`rounded-lg px-3 py-2 border ${
                      isAccessDeniedError
                        ? "bg-amber-500/10 border-amber-500/20"
                        : "bg-red-500/10 border-red-500/20"
                    }`}>
                      <p className={`text-xs font-medium ${
                        isAccessDeniedError ? "text-amber-400" : "text-red-400"
                      }`}>{errorMsg}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold rounded-xl py-3 transition-colors cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
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
                  <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                    <Lock className="h-5 w-5 text-zinc-400" />
                    Forgot Password
                  </h2>
                  <p className="text-xs text-zinc-400">
                    Enter your email and we'll send a recovery link.
                  </p>
                </div>

                {successMsg && (
                  <div className="flex items-center gap-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    <p className="text-xs text-emerald-400">{successMsg}</p>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-300">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-sm rounded-xl px-4 py-3 pl-10 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-400 font-medium">{errorMsg}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black hover:bg-zinc-200 disabled:opacity-60 text-sm font-semibold rounded-xl py-3 transition-colors cursor-pointer"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    ) : "Send Recovery Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setView("login"); setErrorMsg(""); setSuccessMsg("") }}
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-200 cursor-pointer transition-colors"
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
