"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import dynamic from "next/dynamic"
import {
  Sparkles, Mail, ArrowRight,
  Lock, Eye, EyeOff, LogIn, ShieldAlert, Check,
  Building2, ShieldCheck, CheckCircle2
} from "lucide-react"
import { useStore } from "@/store/useStore"
import {
  clearAuthSession,
  getStudentAccessDeniedMessage,
  verifyStudentPortalAccess,
} from "@/lib/studentAccess"
import aiAnimation from "../../../../public/aianimation.json"

const Lottie = dynamic(() => import("lottie-react").then((mod) => mod.Lottie), { ssr: false })

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

  const isAccessDeniedError =
    errorMsg.includes("on hold") ||
    errorMsg.includes("does not have portal access") ||

    errorMsg.includes("enrollment is completed")

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
    <div className="min-h-screen w-full relative flex flex-col justify-between overflow-x-hidden font-sans bg-gradient-to-b from-[#bce0fd] via-[#d7ebfc] to-[#f0f7ff] text-slate-800 selection:bg-sky-200">
      {/* ─── Lottie AI Animation Background ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        {/* Ambient Soft Glow Behind Animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[750px] h-[750px] bg-gradient-to-tr from-cyan-200/50 via-sky-300/40 to-blue-200/30 rounded-full blur-3xl opacity-80" />

        {/* Lottie Animation Layer - Sized to extend beyond the 420px card */}
        <div className="w-[600px] h-[600px] sm:w-[750px] sm:h-[750px] flex items-center justify-center opacity-90">
          <Lottie
            src="/aianimation.json"
            loop={true}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </div>

      {/* ─── Top Header Navigation ─── */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg shadow-slate-900/10 border border-slate-800">
            <Sparkles className="h-5 w-5 text-sky-300" />
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-black tracking-tight text-slate-900 leading-none">
              AI <span className="bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">Edunexis</span>
            </span>
          </div>
        </div>
      </header>


      {/* ─── Main Content Body ─── */}
      <main className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex-1 flex items-center justify-center">

        {/* Centered Glassmorphic Login Card */}
        <div className="w-full max-w-[420px] flex justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full bg-white/75 backdrop-blur-2xl border border-white/90 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.12),0_0_40px_rgba(255,255,255,0.9)] rounded-[32px] p-7 sm:p-9 relative z-20"
          >
            {/* Top Icon Badge (Matching Image) */}
            <div className="h-14 w-14 rounded-2xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-slate-100 flex items-center justify-center text-slate-800 mx-auto mb-5">
              <LogIn className="h-6 w-6 stroke-[2.2]" />
            </div>

            <AnimatePresence mode="wait">
              {view === "login" && (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  {/* Card Title & Subtitle */}
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      Sign In
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                      Enter your credentials to access the platform.
                    </p>
                  </div>

                  {/* Form */}
                  <form onSubmit={handleLoginSubmit} className="space-y-4 pt-1">
                    {/* Email Input */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-slate-400 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
                        />
                      </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-700 block">
                          Password
                        </label>
                        <button
                          type="button"
                          onClick={() => setView("forgot")}
                          className="text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-slate-400 rounded-xl py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 transition-all outline-none focus:ring-2 focus:ring-slate-900/10 font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((p) => !p)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Error Banner */}
                    {errorMsg && (
                      <div
                        className={`rounded-xl p-3 border text-xs font-medium flex items-start gap-2 ${isAccessDeniedError
                          ? "bg-amber-50 border-amber-200 text-amber-800"
                          : "bg-red-50 border-red-200 text-red-700"
                          }`}
                      >
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{errorMsg}</span>
                      </div>
                    )}

                    {/* Primary Button */}
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-slate-900 hover:bg-black active:bg-slate-950 text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-5"
                >
                  <div className="text-center space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                      Forgot Password
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-500 leading-snug">
                      Enter your registered email to receive reset instructions.
                    </p>
                  </div>

                  {successMsg && (
                    <div className="rounded-xl p-3 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span>{successMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleForgotSubmit} className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-700 block">
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-slate-100/80 focus:bg-white border border-slate-200/80 focus:border-slate-400 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-900 font-medium placeholder:text-slate-400 transition-all outline-none focus:ring-2 focus:ring-slate-900/10"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-slate-900 hover:bg-black text-white font-semibold text-sm py-3.5 rounded-xl shadow-lg shadow-slate-900/20 hover:shadow-xl active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Send Recovery Link"
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setView("login")
                        setErrorMsg("")
                        setSuccessMsg("")
                      }}
                      className="w-full text-center text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors cursor-pointer pt-1 block"
                    >
                      ← Back to Sign In
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-6 py-5 text-center text-xs font-semibold text-slate-600">
        © 2026 AI Edunexis. Built for modern education businesses.
      </footer>
    </div>
  )
}
