"use client"

import * as React from "react"
import { 
  Bot, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Headphones,
  GraduationCap,
  Users,
  CheckCircle2,
  Sparkles,
  Zap,
  Activity,
  Lock,
  ArrowUpRight
} from "lucide-react"

export function WhyChooseSection() {
  return (
    <section id="features" className="py-24 lg:py-32 bg-[#060e23] text-white relative overflow-hidden">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-sky-600/15 via-cyan-500/15 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-[500px] h-[300px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-10 left-0 w-[400px] h-[300px] bg-cyan-600/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Subtle geometric dot grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:28px_28px] opacity-35 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold uppercase tracking-widest shadow-[0_0_24px_rgba(6,182,212,0.18)] mb-4">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>WHY CHOOSE ERPINTELLECT</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
            The Smarter Way to{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-cyan-300 to-teal-300">
              Grow
            </span>
          </h2>

          <p className="mt-4 text-sm sm:text-base text-slate-300/90 leading-relaxed font-normal">
            Eliminate operational chaos, disjointed spreadsheets, and siloed software with a 
            cohesive, automated intelligence ecosystem engineered for modern scalability.
          </p>
        </div>

        {/* ─── 3 High-Impact Stat Pods ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 mb-12 sm:mb-16">
          
          {/* Stat 1: 500+ Happy Institutions */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-cyan-400/40 rounded-3xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(6,182,212,0.12)] hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <GraduationCap className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Institutions &amp; Hubs
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-cyan-300">
              500+
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              Happy Institutions
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Empowering colleges, universities, and multi-branch educational academies nationwide.
            </p>
          </div>

          {/* Stat 2: 50,000+ Active Users */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-sky-400/40 rounded-3xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(14,165,233,0.12)] hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/15 border border-sky-400/30 text-sky-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                Concurrent Usage
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-sky-300">
              50,000+
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              Active Users
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Counselors, faculty, administrators, students, and leaders active across portals daily.
            </p>
          </div>

          {/* Stat 3: 99.9% Uptime Guarantee */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-emerald-400/40 rounded-3xl p-6 sm:p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_40px_rgba(16,185,129,0.12)] hover:-translate-y-1">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live SLA
              </span>
            </div>
            <div className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-emerald-300">
              99.9%
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              Uptime Guarantee
            </div>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              High-availability cloud infrastructure with automated redundant failovers and zero downtime.
            </p>
          </div>

        </div>

        {/* ─── 5 Core Pillars: Dynamic Bento Grid ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* Card 1: AI-Powered Automation (Hero Bento Card - spans 2 cols on lg) */}
          <div className="lg:col-span-2 relative group bg-gradient-to-br from-white/[0.09] via-white/[0.04] to-transparent border border-white/10 hover:border-cyan-400/50 rounded-3xl p-7 sm:p-8 backdrop-blur-2xl transition-all duration-300 hover:shadow-[0_16px_50px_rgba(6,182,212,0.14)] overflow-hidden">
            {/* Top ambient highlight inside card */}
            <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-cyan-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:scale-105 transition-transform shrink-0">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    AI-Powered Automation
                  </h3>
                  <p className="text-cyan-300 font-medium text-sm mt-0.5">
                    Work smarter, not harder.
                  </p>
                </div>
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold self-start">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Next-Gen Agentic Core</span>
              </div>
            </div>

            <p className="text-sm text-slate-300/90 leading-relaxed mb-6 max-w-2xl font-normal">
              Automate multi-stage admission pipelines, auto-assign leads, generate fee reminders, 
              and resolve routine student queries without human bottlenecks.
            </p>

            {/* Micro Feature Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-4 border-t border-white/10">
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-200 font-medium text-center hover:bg-white/[0.08] transition">
                ⚡ Auto Lead Scoring
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-200 font-medium text-center hover:bg-white/[0.08] transition">
                🤖 24/7 AI Counselor
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-200 font-medium text-center hover:bg-white/[0.08] transition">
                📩 Smart Follow-ups
              </div>
              <div className="px-3 py-2 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-slate-200 font-medium text-center hover:bg-white/[0.08] transition">
                📊 Predictive Analytics
              </div>
            </div>
          </div>

          {/* Card 2: All-In-One Platform */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-sky-400/50 rounded-3xl p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(14,165,233,0.12)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 mb-5 group-hover:scale-105 transition-transform">
                <Layers className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                All-In-One Platform
              </h3>
              <p className="text-sky-300 font-medium text-sm mt-0.5">
                No more multiple tools and logins.
              </p>

              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed mt-3 font-normal">
                CRM, Student Lifecycle, Learning Management (LMS), Accounts, and Staff Governance seamlessly connected in a unified workspace.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-sky-300 font-semibold">
              <span>Single Sign-On Architecture</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 3: Real-Time Insights */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-emerald-400/50 rounded-3xl p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(16,185,129,0.12)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 mb-5 group-hover:scale-105 transition-transform">
                <TrendingUp className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                Real-Time Insights
              </h3>
              <p className="text-emerald-300 font-medium text-sm mt-0.5">
                Make better decisions with live data.
              </p>

              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed mt-3 font-normal">
                Interactive real-time executive dashboards, live revenue tracking, admission conversion funnels, and student performance metrics at your fingertips.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 font-semibold">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" />
                Live Telemetry Feed
              </span>
              <span className="text-[11px] text-slate-400">Zero Lag</span>
            </div>
          </div>

          {/* Card 4: Secure & Reliable */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-indigo-400/50 rounded-3xl p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(99,102,241,0.12)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 mb-5 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                Secure &amp; Reliable
              </h3>
              <p className="text-indigo-300 font-medium text-sm mt-0.5">
                Your data, our priority.
              </p>

              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed mt-3 font-normal">
                Enterprise-grade role-based access control, cryptographic backups, SSL encryption, and strict institutional multi-tenant privacy isolation.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2 text-xs text-indigo-300 font-semibold">
              <Lock className="w-3.5 h-3.5" />
              <span>256-Bit TLS &amp; Role-Based Privacy</span>
            </div>
          </div>

          {/* Card 5: Dedicated Support */}
          <div className="relative group bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 hover:border-amber-400/50 rounded-3xl p-7 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_16px_40px_rgba(245,158,11,0.12)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 mb-5 group-hover:scale-105 transition-transform">
                <Headphones className="w-6 h-6" />
              </div>

              <h3 className="text-xl font-bold text-white tracking-tight">
                Dedicated Support
              </h3>
              <p className="text-amber-300 font-medium text-sm mt-0.5">
                We're with you every step.
              </p>

              <p className="text-xs sm:text-sm text-slate-300/80 leading-relaxed mt-3 font-normal">
                Personalized customer success managers, comprehensive faculty training, guided data migration, and round-the-clock priority technical assistance.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-amber-300 font-semibold">
              <span>Rapid SLA Response</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-400/10 border border-amber-400/20 text-amber-300 text-[10px] font-bold">
                24/7 Priority
              </span>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
