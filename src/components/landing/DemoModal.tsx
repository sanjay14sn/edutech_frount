"use client"

import * as React from "react"
import { Calendar, Play, CheckCircle2, X } from "lucide-react"

interface DemoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [tab, setTab] = React.useState<"watch" | "schedule">("schedule")
  const [submitted, setSubmitted] = React.useState(false)
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [org, setOrg] = React.useState("")
  const [sector, setSector] = React.useState("Education")

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setTimeout(() => {
      // Auto close after 3s or allow manual close
    }, 3000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6 max-w-xs">
          <button
            onClick={() => setTab("schedule")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              tab === "schedule" ? "bg-white text-sky-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Schedule Live Demo
          </button>
          <button
            onClick={() => setTab("watch")}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition ${
              tab === "watch" ? "bg-white text-sky-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Product Walkthrough
          </button>
        </div>

        {tab === "schedule" ? (
          submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Demo Request Confirmed!</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Thank you {name || "there"}! One of our product specialists will contact you shortly with your personalized meeting invite.
              </p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 rounded-full bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 transition"
              >
                Close
              </button>
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-extrabold text-slate-900">
                Experience ERPIntellect in Action
              </h3>
              <p className="text-xs text-slate-500 mt-1 mb-5">
                Fill out the quick form below to schedule a 1-on-1 personalized product tour with an ERP architect.
              </p>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Work Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@institution.edu"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / Campus</label>
                    <input
                      type="text"
                      required
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="University or Enterprise"
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Sector</label>
                    <select
                      value={sector}
                      onChange={(e) => setSector(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-white"
                    >
                      <option value="Education">Education</option>
                      <option value="Business">Business</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Non-Profit">Non-Profit</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-2 py-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-md shadow-sky-500/25 transition-all"
                >
                  Confirm Demo Booking
                </button>
              </form>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <h3 className="text-xl font-extrabold text-slate-900">
              Interactive Product Walkthrough
            </h3>
            <div className="aspect-video w-full rounded-2xl bg-slate-900 overflow-hidden flex flex-col items-center justify-center relative text-white p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-3 ring-4 ring-cyan-500/10">
                <Play className="w-6 h-6 fill-current ml-1" />
              </div>
              <div className="font-bold text-sm">3-Minute Platform Overview</div>
              <div className="text-[11px] text-slate-400 mt-1">
                Explore Admissions, CRM Pipelines, Fee Verification, and Staff Attendance.
              </div>
            </div>
            <button
              onClick={() => setTab("schedule")}
              className="w-full py-2.5 rounded-xl border border-sky-400 text-sky-600 text-xs font-semibold hover:bg-sky-50 transition"
            >
              Need a personalized session? Book a Live Demo ➔
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
