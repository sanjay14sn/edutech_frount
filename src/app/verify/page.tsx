"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  Award,
  Search,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Lock,
  Building,

  Sparkles,
  ArrowLeft,
  FileCheck2,
  ExternalLink
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { KNOWN_CERTIFICATES } from "@/lib/certificates"

export default function VerifyPortalLandingPage() {
  const router = useRouter()
  const [hashInput, setHashInput] = React.useState("")
  const [errorMsg, setErrorMsg] = React.useState("")

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const clean = hashInput.trim()
    if (!clean) {
      setErrorMsg("Please enter a valid certificate hash or credential ID.")
      return
    }
    setErrorMsg("")
    router.push(`/verify/${clean}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">

      {/* Top Navbar */}
      <header className="border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <Image
              src="/erplogo.png"
              alt="ERP Intellect Logo"
              width={220}
              height={65}
              className="h-10 sm:h-12 w-auto object-contain"
              priority
            />
          </Link>

          <Link
            href="/"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Platform</span>
          </Link>
        </div>
      </header>

      {/* Main Content (White Theme) */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-12">

        {/* Hero Section */}
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Official Academic Credential Verification</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-slate-900">
            Verify Course Certificate Authenticity
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Enter the unique verification hash or certificate credential ID printed on the certificate or QR code to validate institutional authenticity in real time.
          </p>
        </div>

        {/* Verification Input Box */}
        <div className="max-w-xl mx-auto">
          <form
            onSubmit={handleVerifySubmit}
            className="p-3 rounded-2xl bg-white border border-slate-200 shadow-md space-y-3"
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter hash e.g. aaaa-23e3-3d7b"
                  value={hashInput}
                  onChange={(e) => {
                    setHashInput(e.target.value)
                    if (errorMsg) setErrorMsg("")
                  }}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white font-mono transition-colors"
                />
              </div>

              <Button
                type="submit"
                className="h-11 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 font-bold text-xs gap-1.5 cursor-pointer border-0 shadow-md shadow-amber-500/20"
              >
                <span>Verify Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>

            {errorMsg && (
              <p className="text-xs text-rose-600 pl-2 font-medium">{errorMsg}</p>
            )}
          </form>

          {/* Quick link button */}
          <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500 flex-wrap">
            <span>Instant samples:</span>
            <button
              onClick={() => router.push("/verify/aaaa-23e3-3d7b")}
              className="font-mono font-bold text-amber-700 hover:text-amber-800 underline underline-offset-4 cursor-pointer"
            >
              aaaa-23e3-3d7b (sanjay)
            </button>
            <span className="text-slate-300">•</span>
            <button
              onClick={() => router.push("/verify/c7f4-8a12-901d")}
              className="font-mono font-bold text-amber-700 hover:text-amber-800 underline underline-offset-4 cursor-pointer"
            >
              c7f4-8a12-901d (David Miller)
            </button>
          </div>
        </div>

        {/* Featured Sample Verified Credentials */}
        <div className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-amber-600" />
              <span>Recently Issued &amp; Verified Credentials</span>
            </h2>
            <span className="text-xs text-slate-500">Live Academic Registry</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(KNOWN_CERTIFICATES).map((item) => (
              <Link
                key={item.hash}
                href={`/verify/${item.hash}`}
                className="group p-5 rounded-2xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                      {item.hash}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-700 transition-colors">
                    {item.studentName}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5 font-medium">{item.courseTitle}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <span>Batch: <strong className="text-slate-800">{item.batchCode}</strong></span>
                  <span className="text-amber-700 font-bold group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                    Inspect <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Trust Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-8 border-t border-slate-200">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-center sm:text-left">
            <Lock className="w-5 h-5 text-amber-600 mb-2 mx-auto sm:mx-0" />
            <h4 className="text-xs font-bold text-slate-900">Cryptographically Signed</h4>
            <p className="text-[11px] text-slate-500">
              Each certificate is embedded with a SHA-256 digital fingerprint preventing alterations.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-center sm:text-left">
            <Building className="w-5 h-5 text-emerald-600 mb-2 mx-auto sm:mx-0" />
            <h4 className="text-xs font-bold text-slate-900">Direct Institutional Source</h4>
            <p className="text-[11px] text-slate-500">
              Verified directly against ERP Intellect Academy course records and trainer evaluations.
            </p>
          </div>

          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1 text-center sm:text-left">
            <Sparkles className="w-5 h-5 text-amber-500 mb-2 mx-auto sm:mx-0" />
            <h4 className="text-xs font-bold text-slate-900">Universal Employer Access</h4>
            <p className="text-[11px] text-slate-500">
              Instant verification for hiring teams, university registrars, and corporate recruiters.
            </p>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>&copy; 2026 ERP Intellect Academy &amp; Ecosystem. All rights reserved.</p>
      </footer>

    </div>
  )
}
