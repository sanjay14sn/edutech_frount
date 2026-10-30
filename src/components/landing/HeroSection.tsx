"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { 
  ArrowRight, 
  Play, 
  Check, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  GraduationCap, 
  DollarSign, 
  CheckSquare,
  Bot,
  UserPlus,
  FileText,
  MessageSquare,
  BarChart3,
  Bell,
  Sparkles,
  Briefcase,
  BookOpen
} from "lucide-react"

interface HeroSectionProps {
  onOpenDemo?: () => void
}

export function HeroSection({ onOpenDemo }: HeroSectionProps) {
  const [activeChip, setActiveChip] = React.useState<string | null>(null)
  const [chatMessage, setChatMessage] = React.useState("Hello! How can I help you today?")

  const handleChipClick = (chip: string) => {
    setActiveChip(chip)
    if (chip === "Admission Enquiry") {
      setChatMessage("We have 48 new admissions processed this week with 12 awaiting fee verification.")
    } else if (chip === "Fee Details") {
      setChatMessage("Total collection this quarter is $245,800 with 94.2% on-time fee clearance.")
    } else if (chip === "Student Information") {
      setChatMessage("Active student roster is 2,458 enrolled across all courses.")
    } else if (chip === "Generate Report") {
      setChatMessage("Generating automated attendance & revenue analytics report...")
    }
  }

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#061124] via-[#091b38] to-[#040e21] text-white pt-10 pb-20 lg:pt-16 lg:pb-28">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-400/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <div className="lg:col-span-5 flex flex-col items-start space-y-6">

            {/* Main Title */}
            <div className="space-y-2">
              <h1 className="text-4xl sm:text-5xl lg:text-[46px] font-black tracking-tight leading-[1.15]">
                <span>ERP</span>
                <span className="text-cyan-400">Intellect</span>
                <br />
                <span className="text-white">Intelligence That Powers</span>
                <br />
                <span className="text-white">Your Business.</span>
              </h1>
            </div>

            {/* Subtitle */}
            <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-normal max-w-xl">
              A unified, AI-driven platform for Education, Business and Enterprises — designed to streamline operations, improve productivity and drive sustainable growth.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-2 w-full sm:w-auto">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-full text-sm font-semibold bg-[#0284c7] hover:bg-[#0369a1] text-white shadow-lg shadow-sky-600/30 hover:shadow-cyan-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              
              <button
                onClick={onOpenDemo}
                className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-full text-sm font-semibold bg-white/10 hover:bg-white/15 border border-white/20 text-white backdrop-blur-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="w-5 h-5 rounded-full bg-cyan-400/20 flex items-center justify-center text-cyan-300">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Features checkmarks */}
            <div className="pt-4 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-y-2 gap-x-6 text-xs sm:text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Cloud Based</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Secure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Scalable</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400 font-bold">✓</span>
                <span>Multi-Tenant</span>
              </div>
            </div>
          </div>

          {/* Right Hero Visual: Laptop Mockup + Floating Mascot + Mobile App Mockup */}
          <div className="lg:col-span-7 relative flex items-center justify-center mt-6 lg:mt-0">
            
            {/* Laptop Shell */}
            <div className="relative w-full max-w-[620px] bg-slate-900 rounded-t-2xl p-2.5 sm:p-3 shadow-2xl border border-slate-700/60 ring-1 ring-white/10">
              {/* Laptop Camera notch */}
              <div className="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-700 ring-1 ring-slate-800" />
                <div className="w-1 h-1 rounded-full bg-cyan-400/60" />
              </div>

              {/* Laptop Screen Content (Interactive Dashboard Mockup) */}
              <div className="bg-[#f8fafc] text-slate-800 rounded-lg overflow-hidden text-[10px] sm:text-xs select-none shadow-inner">
                
                {/* Dashboard Header Bar */}
                <div className="bg-white border-b border-slate-200 px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-rose-400" />
                    <div className="w-2 h-2 rounded-full bg-amber-400" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="ml-2 font-bold text-slate-700 text-[11px] sm:text-xs">Good Morning, Admin</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Bell className="w-3.5 h-3.5 text-slate-500 hover:text-slate-700 cursor-pointer" />
                    <div className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-[9px]">
                      A
                    </div>
                  </div>
                </div>

                {/* Dashboard Body with mini sidebar & content */}
                <div className="grid grid-cols-12 min-h-[300px] sm:min-h-[340px]">
                  
                  {/* Mini Sidebar */}
                  <div className="col-span-3 bg-slate-900 text-slate-300 p-2 border-r border-slate-800 flex flex-col justify-between hidden sm:flex">
                    <div className="space-y-1">
                      <div className="px-2 py-1 bg-sky-600 text-white rounded font-medium flex items-center gap-1.5 text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        Dashboard
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <GraduationCap className="w-3 h-3" />
                        Admissions
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <Users className="w-3 h-3" />
                        Students
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <DollarSign className="w-3 h-3" />
                        CRM
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <BarChart3 className="w-3 h-3" />
                        Finance
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <Briefcase className="w-3 h-3" />
                        HR & Payroll
                      </div>
                      <div className="px-2 py-1 text-slate-400 hover:text-white rounded flex items-center gap-1.5 text-[10px] cursor-pointer">
                        <BookOpen className="w-3 h-3" />
                        LMS
                      </div>
                    </div>
                    <div className="text-[9px] text-slate-500 px-2 py-1 border-t border-slate-800">
                      v2.4 Enterprise
                    </div>
                  </div>

                  {/* Main View */}
                  <div className="col-span-12 sm:col-span-9 p-3 bg-slate-50 flex flex-col gap-2.5">
                    
                    {/* 4 Stat Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-[9px] text-slate-500 font-medium">Total Admissions</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">2,458</div>
                        <div className="flex items-center text-[8px] text-emerald-600 font-semibold mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +12%
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-[9px] text-slate-500 font-medium">Total Revenue</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">$ 245,800</div>
                        <div className="flex items-center text-[8px] text-emerald-600 font-semibold mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +8%
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-[9px] text-slate-500 font-medium">Active Enquiries</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">324</div>
                        <div className="flex items-center text-[8px] text-emerald-600 font-semibold mt-0.5">
                          <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> +18%
                        </div>
                      </div>

                      <div className="bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs">
                        <div className="text-[9px] text-slate-500 font-medium">Pending Tasks</div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">12</div>
                        <div className="flex items-center text-[8px] text-rose-500 font-semibold mt-0.5">
                          <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> -5%
                        </div>
                      </div>
                    </div>

                    {/* Chart & Quick Actions */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 flex-1">
                      
                      {/* Revenue Overview Chart */}
                      <div className="sm:col-span-8 bg-white p-2.5 rounded-lg border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[10px] text-slate-800">Revenue Overview</span>
                          <span className="text-[8px] text-slate-400">Monthly</span>
                        </div>
                        {/* Smooth Line Chart SVG */}
                        <div className="w-full h-24 sm:h-28 relative pt-2">
                          <svg className="w-full h-full overflow-visible" viewBox="0 0 240 80" preserveAspectRatio="none">
                            <defs>
                              <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0284c7" stopOpacity="0.3" />
                                <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                              </linearGradient>
                            </defs>
                            <path
                              d="M0,65 Q30,55 60,35 T120,45 T180,20 T240,10 L240,80 L0,80 Z"
                              fill="url(#chartGrad)"
                            />
                            <path
                              d="M0,65 Q30,55 60,35 T120,45 T180,20 T240,10"
                              fill="none"
                              stroke="#0284c7"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            />
                            {/* Chart Data points */}
                            <circle cx="60" cy="35" r="3" fill="#0284c7" className="animate-pulse" />
                            <circle cx="120" cy="45" r="3" fill="#0284c7" />
                            <circle cx="180" cy="20" r="3" fill="#0284c7" />
                            <circle cx="240" cy="10" r="3" fill="#38bdf8" />
                          </svg>
                          <div className="flex justify-between text-[7.5px] text-slate-400 mt-1">
                            <span>Jan</span><span>Mar</span><span>May</span><span>Jul</span><span>Sep</span><span>Nov</span><span>Dec</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="sm:col-span-4 bg-white p-2 rounded-lg border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                        <span className="font-bold text-[10px] text-slate-800 mb-1">Quick Actions</span>
                        <div className="flex flex-col gap-1">
                          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-600 text-[9px] text-left transition">
                            <UserPlus className="w-2.5 h-2.5 text-sky-600" />
                            <span>Add Student</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-600 text-[9px] text-left transition">
                            <FileText className="w-2.5 h-2.5 text-emerald-600" />
                            <span>Create Invoice</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-600 text-[9px] text-left transition">
                            <MessageSquare className="w-2.5 h-2.5 text-purple-600" />
                            <span>Send SMS</span>
                          </button>
                          <button className="flex items-center gap-1.5 px-1.5 py-1 rounded bg-slate-50 hover:bg-sky-50 text-slate-700 hover:text-sky-600 text-[9px] text-left transition">
                            <BarChart3 className="w-2.5 h-2.5 text-amber-600" />
                            <span>View Reports</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                </div>

              </div>
              
              {/* Laptop bottom hinge */}
              <div className="h-2.5 bg-slate-800 rounded-b-md mx-auto w-[650px] max-w-full -mb-3 shadow-md border-t border-slate-700" />
            </div>

            {/* Floating 3D AI Robot Mascot */}
            <div className="absolute -bottom-6 -right-4 sm:-bottom-8 sm:right-6 lg:-right-4 w-28 h-28 sm:w-36 sm:h-36 z-20 transition-transform duration-300 hover:scale-105 pointer-events-auto">
              <div className="relative w-full h-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
                <Image
                  src="/images/ai-robot.jpg"
                  alt="ERPIntellect AI Assistant Robot"
                  fill
                  className="object-cover rounded-full ring-2 ring-cyan-400/50 shadow-2xl animate-bounce [animation-duration:4s]"
                />
              </div>
            </div>

            {/* Mobile App Device Mockup (Floating on the right edge) */}
            <div className="hidden xl:block absolute -right-16 top-6 w-48 bg-slate-900 rounded-[28px] p-2 shadow-2xl border border-slate-700 ring-1 ring-white/10 z-20">
              <div className="bg-white rounded-[22px] overflow-hidden p-2.5 text-slate-800 text-[9.5px]">
                {/* Phone Speaker Notch */}
                <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
                
                {/* Mobile App Header */}
                <div className="text-center pb-2 border-b border-slate-100">
                  <div className="font-extrabold text-[10px] text-slate-900 flex items-center justify-center gap-1">
                    <span className="text-slate-900">ERP</span>
                    <span className="text-sky-600">Intellect</span>
                  </div>
                  <div className="text-[8px] text-cyan-600 font-semibold">AI Assistant</div>
                </div>

                {/* AI Chat Bubble */}
                <div className="my-2.5 p-2 bg-sky-50/80 rounded-xl border border-sky-100 text-[9px] text-slate-700 leading-snug">
                  {chatMessage}
                </div>

                {/* Interactive Action Chips */}
                <div className="flex flex-col gap-1.5 mt-2">
                  {["Admission Enquiry", "Fee Details", "Student Information", "Generate Report"].map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className={`px-2 py-1 rounded-lg text-left transition font-medium border text-[8.5px] ${
                        activeChip === chip 
                          ? "bg-sky-600 text-white border-sky-600" 
                          : "bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-sky-50 hover:text-sky-600"
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  )
}
