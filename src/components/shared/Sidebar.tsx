"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  CalendarCheck,
  CreditCard,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  GitPullRequest,
  Briefcase,
  MessageSquare,
  Building2,
  Megaphone,
  Wallet,
  MonitorPlay,
  Award,
  ShieldCheck,
  HardDrive,
  UserCircle
} from "lucide-react"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"
import { isPolicyFeatureEnabled } from "@/lib/centerPolicyClient"

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, user, centerPolicy, supportQueueCount } = useStore()

  const policyOk = (feature: Parameters<typeof isPolicyFeatureEnabled>[1]) =>
    user?.role === "super_admin" || isPolicyFeatureEnabled(centerPolicy, feature)

  type NavLink = {
    label: string
    path: string
    icon: React.ComponentType<{ className?: string }>
    badgeCount?: number
  }

  // Dynamic navigation links based on user role
  const getNavLinks = (): NavLink[] => {
    const role = user?.role || "owner"

    if (role === "super_admin") {
      return [
        { label: "Control Center", path: "/dashboard", icon: LayoutDashboard },
        { label: "Manage Centers", path: "/centers", icon: Building2 },
        { label: "Roles", path: "/roles", icon: ShieldCheck },
        { label: "Storage & Tokens", path: "/storage", icon: HardDrive },
        {
          label: "Support",
          path: "/support",
          icon: MessageSquare,
          badgeCount: supportQueueCount,
        },
      ]
    }

    if (role === "trainer") {
      const trainerLinks = [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Students", path: "/students", icon: Users },
        { label: "Attendance", path: "/attendance", icon: CalendarCheck },
        { label: "My Batches", path: "/courses", icon: BookOpen },
        { label: "LMS", path: "/lms", icon: MonitorPlay },
        ...(policyOk("enableJobPortal") ? [{ label: "Job Portal", path: "/jobs", icon: Briefcase }] : []),
      ]
      return trainerLinks
    }

    if (role === "student") {
      const studentLinks = [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "My Courses", path: "/courses", icon: BookOpen },
        { label: "LMS", path: "/lms", icon: MonitorPlay },
        { label: "Attendance", path: "/attendance", icon: CalendarCheck },
        { label: "My Fees", path: "/fees", icon: CreditCard },
        { label: "Certification", path: "/certification", icon: Award },
        ...(policyOk("enableJobPortal") ? [{ label: "Job Portal", path: "/jobs", icon: Briefcase }] : []),
      ]
      return studentLinks
    }

    if (role === "bde") {
      return [
        { label: "BDE Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Leads CRM", path: "/crm", icon: GitPullRequest },
        { label: "Follow-ups", path: "/followups", icon: CalendarCheck },
        { label: "Admissions", path: "/admissions", icon: GraduationCap },
        { label: "Tasks Log", path: "/tasks", icon: BookOpen },
        { label: "My Attendance", path: "/attendance", icon: CalendarCheck },
        { label: "Performance", path: "/performance", icon: BarChart3 },
        { label: "Support Desk", path: "/support", icon: MessageSquare },
        { label: "Reports", path: "/reports", icon: BarChart3 },
      ]
    }

    // Owner role: core links always present, show all modules for now
    const moduleLinks = [
      { label: "Leads CRM", path: "/crm", icon: GitPullRequest },
      { label: "BDE Management", path: "/bde", icon: Users },
      { label: "Students", path: "/students", icon: Users },
      { label: "Trainers", path: "/trainers", icon: GraduationCap },
      { label: "Courses & Batches", path: "/courses", icon: BookOpen },
      { label: "LMS", path: "/lms", icon: MonitorPlay },
      { label: "Attendance", path: "/attendance", icon: CalendarCheck },
      { label: "Fees & Dues", path: "/fees", icon: CreditCard },
      ...(policyOk("enableJobPortal") ? [{ label: "Job Portal", path: "/jobs", icon: Briefcase }] : []),
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      ...(policyOk("enableCampaigns") ? [{ label: "Campaigns", path: "/campaigns", icon: Megaphone }] : []),
      ...(policyOk("enableHrModule") ? [{ label: "Staff Payroll & HR", path: "/hr", icon: Wallet }] : []),
    ]

    return [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      ...moduleLinks,
      { label: "Profile", path: "/profile", icon: UserCircle },
      // Support/Query replaces Settings for owner
      { label: "Support", path: "/support", icon: MessageSquare },
    ]
  }

  const links = getNavLinks()

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-border bg-card h-screen sticky top-0 transition-all duration-300 z-30 shrink-0",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand logo header */}
      <div className="flex h-14 items-center justify-between px-4 border-b border-border/50">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          {!sidebarCollapsed && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-sm font-semibold"
            >
              EduPlatform
            </motion.span>
          )}
        </Link>

        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Navigation menu list */}
      <nav className="flex-1 space-y-1.5 p-3 overflow-y-auto">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.path || (link.path !== "/dashboard" && pathname.startsWith(link.path))

          return (
            <Link
              key={link.path}
              href={link.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all group relative",
                isActive
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4.5 w-4.5 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate flex-1"
                >
                  {link.label}
                </motion.span>
              )}
              {link.badgeCount != null && (
                <span
                  className={cn(
                    "inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none tabular-nums shrink-0",
                    link.badgeCount > 0
                      ? isActive
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25"
                      : isActive
                        ? "bg-primary-foreground/10 text-primary-foreground/70"
                        : "bg-muted text-muted-foreground border border-border/60"
                  )}
                >
                  {link.badgeCount > 99 ? "99+" : link.badgeCount}
                </span>
              )}
              {sidebarCollapsed && link.badgeCount != null && link.badgeCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-card" />
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-2 hidden rounded-md bg-zinc-900 px-2 py-1 text-xs text-zinc-100 group-hover:block whitespace-nowrap z-50 shadow-md">
                  {link.label}
                  {link.badgeCount != null ? ` (${link.badgeCount})` : ""}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer collapsing controls */}
      <div className="p-3 border-t border-border/50">
        {sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="flex w-full items-center justify-center rounded-lg p-2 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        )}
        {!sidebarCollapsed && (
          <div className="rounded-lg bg-muted/65 p-3 text-xs">
            <p className="font-semibold text-foreground flex items-center gap-1.5">
              <span>Enterprise CRM</span>
              <span className="inline-block rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-600 dark:text-emerald-400">
                v1.2
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 leading-normal">
              Multi-tenant School Operations Active
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}
