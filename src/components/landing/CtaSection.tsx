"use client"

import * as React from "react"
import Link from "next/link"
import { Rocket, ArrowRight, Calendar } from "lucide-react"

interface CtaSectionProps {
  onOpenDemo?: () => void
}

export function CtaSection({ onOpenDemo }: CtaSectionProps) {
  return (
    <section className="bg-gradient-to-r from-[#0284c7] via-[#0369a1] to-[#0284c7] text-white py-12 lg:py-16 relative overflow-hidden">
      {/* Decorative background shapes */}
      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-80 h-80 rounded-full bg-cyan-400/20 blur-2xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">

          {/* Left Column */}
          <div className="flex items-center gap-5 text-center lg:text-left flex-col lg:flex-row">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white shrink-0 shadow-lg">
              <Rocket className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Ready to Transform Your Business?
              </h2>
              <p className="text-sky-100 text-sm sm:text-base mt-1">
                Join hundreds of institutions and businesses already using ERPIntellect.
              </p>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3.5 shrink-0">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold bg-white text-sky-700 hover:bg-sky-50 shadow-md shadow-sky-950/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={onOpenDemo}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold bg-[#14b8a6] hover:bg-[#0d9488] text-white shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Calendar className="w-4 h-4" />
              <span>Schedule a Demo</span>
            </button>
          </div>

        </div>
      </div>
    </section>
  )
}


