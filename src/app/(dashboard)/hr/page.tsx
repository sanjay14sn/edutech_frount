"use client"

import * as React from "react"
import Link from "next/link"
import { ChevronRight, ArrowLeft } from "lucide-react"
import { useStore } from "@/store/useStore"
import { useRouter } from "next/navigation"
import { getHRNavForRole } from "@/lib/hrNav"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"

const moduleMeta: Record<string, { blurb: string; iconWrap: string; tile: string; accent: string }> = {
  "/hr/dashboard": {
    blurb: "KPIs · payroll · upcoming",
    iconWrap: "bg-primary/15 text-primary",
    tile: "hover:border-primary/40 hover:shadow-primary/5",
    accent: "from-primary/10",
  },
  "/hr/employees": {
    blurb: "Profiles, roles & exits",
    iconWrap: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    tile: "hover:border-sky-500/40 hover:shadow-sky-500/5",
    accent: "from-sky-500/10",
  },
  "/hr/attendance": {
    blurb: "Daily present · late · absent",
    iconWrap: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    tile: "hover:border-emerald-500/40 hover:shadow-emerald-500/5",
    accent: "from-emerald-500/10",
  },
  "/hr/leave": {
    blurb: "Balances & approvals",
    iconWrap: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    tile: "hover:border-amber-500/40 hover:shadow-amber-500/5",
    accent: "from-amber-500/10",
  },
  "/hr/payroll": {
    blurb: "Process & release payslips",
    iconWrap: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
    tile: "hover:border-teal-500/40 hover:shadow-teal-500/5",
    accent: "from-teal-500/10",
  },
  "/hr/salary-structures": {
    blurb: "CTC components & rules",
    iconWrap: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400",
    tile: "hover:border-cyan-500/40 hover:shadow-cyan-500/5",
    accent: "from-cyan-500/10",
  },
  "/hr/expenses": {
    blurb: "Claims & reimbursements",
    iconWrap: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    tile: "hover:border-orange-500/40 hover:shadow-orange-500/5",
    accent: "from-orange-500/10",
  },
  "/hr/me": {
    blurb: "Your leave, pay & docs",
    iconWrap: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    tile: "hover:border-indigo-500/40 hover:shadow-indigo-500/5",
    accent: "from-indigo-500/10",
  },
  "/hr/reports": {
    blurb: "Attendance & payroll exports",
    iconWrap: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    tile: "hover:border-violet-500/40 hover:shadow-violet-500/5",
    accent: "from-violet-500/10",
  },
  "/hr/documents": {
    blurb: "Policies & staff files",
    iconWrap: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
    tile: "hover:border-slate-500/40 hover:shadow-slate-500/5",
    accent: "from-slate-500/10",
  },
  "/hr/holidays": {
    blurb: "Public & company holidays",
    iconWrap: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    tile: "hover:border-rose-500/40 hover:shadow-rose-500/5",
    accent: "from-rose-500/10",
  },
  "/hr/settings": {
    blurb: "Leave policy & defaults",
    iconWrap: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-300",
    tile: "hover:border-zinc-500/40 hover:shadow-zinc-500/5",
    accent: "from-zinc-500/10",
  },
}

/** Module hub — tapping a tile opens that page */
export default function HRHubPage() {
  const { user } = useStore()
  const router = useRouter()
  const modules = getHRNavForRole(user?.role)

  React.useEffect(() => {
    if (user?.role === "trainer" || user?.role === "bde") {
      router.replace("/hr/me")
    }
  }, [user, router])

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-base font-bold tracking-tight text-foreground">Staff Payroll & HR</h2>
          <p className="text-xs text-muted-foreground">Open a module to continue</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {modules.map((mod) => {
          const Icon = mod.icon
          const meta = moduleMeta[mod.path] || {
            blurb: "Open module",
            iconWrap: "bg-primary/10 text-primary",
            tile: "hover:border-primary/40",
            accent: "from-primary/10",
          }
          return (
            <Link
              key={mod.path}
              href={mod.path}
              className={cn(
                "group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-4",
                "shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                meta.tile
              )}
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-80",
                  meta.accent
                )}
              />
              <div className="relative flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
                      meta.iconWrap
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-background/70 text-muted-foreground opacity-60 transition-all group-hover:opacity-100 group-hover:border-border group-hover:text-foreground">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold tracking-tight text-foreground leading-snug">
                    {mod.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-snug">{meta.blurb}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
