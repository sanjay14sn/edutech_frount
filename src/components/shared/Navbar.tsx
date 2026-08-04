"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { Menu, Search, X, Sparkles, LayoutDashboard, GitPullRequest, Users, GraduationCap, BookOpen, CalendarCheck, CreditCard, BarChart3, Settings, MonitorPlay, Briefcase, Award, Building2, MessageSquare, ShieldCheck, HardDrive, UserCircle } from "lucide-react"
import { useStore } from "@/store/useStore"
import { ThemeSwitcher } from "./ThemeSwitcher"
import { NotificationDropdown } from "./NotificationDropdown"
import { UserDropdown } from "./UserDropdown"
import { GlobalSearchModal } from "./GlobalSearchModal"
import { cn } from "@/lib/utils"

export function Navbar() {
  const pathname = usePathname()
  const { user } = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)

  React.useEffect(() => {
    function handleGlobalKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener("keydown", handleGlobalKey)
    return () => window.removeEventListener("keydown", handleGlobalKey)
  }, [])

  // Generate breadcrumbs dynamically
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter((x) => x)
    if (paths.length === 0) return [{ label: "Home", href: "/" }]

    return paths.map((path, index) => {
      const href = `/${paths.slice(0, index + 1).join("/")}`
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace("-", " ")
      return { label, href }
    })
  }

  const breadcrumbs = getBreadcrumbs()

  const getMobileLinks = () => {
    const role = user?.role || "owner"
    if (role === "super_admin") {
      return [
        { label: "Control Center", path: "/dashboard", icon: LayoutDashboard },
        { label: "Manage Centers", path: "/centers", icon: Building2 },
        { label: "Roles", path: "/roles", icon: ShieldCheck },
        { label: "Storage & Tokens", path: "/storage", icon: HardDrive },
        { label: "Support Desk", path: "/support", icon: MessageSquare },
      ]
    }
    if (role === "trainer") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "Students", path: "/students", icon: Users },
        { label: "Attendance", path: "/attendance", icon: CalendarCheck },
        { label: "My Batches", path: "/courses", icon: BookOpen },
        { label: "Settings", path: "/settings", icon: Settings },
      ]
    }
    if (role === "student") {
      return [
        { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
        { label: "My Courses", path: "/courses", icon: BookOpen },
        { label: "LMS", path: "/lms", icon: MonitorPlay },
        { label: "Attendance", path: "/attendance", icon: CalendarCheck },
        { label: "My Fees", path: "/fees", icon: CreditCard },
        { label: "Certification", path: "/certification", icon: Award },
        { label: "Job Portal", path: "/jobs", icon: Briefcase },
        { label: "Settings", path: "/settings", icon: Settings },
      ]
    }
    return [
      { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { label: "Leads CRM", path: "/crm", icon: GitPullRequest },
      { label: "Students", path: "/students", icon: Users },
      { label: "Trainers", path: "/trainers", icon: GraduationCap },
      { label: "Courses & Batches", path: "/courses", icon: BookOpen },
      { label: "Attendance", path: "/attendance", icon: CalendarCheck },
      { label: "Fees & Dues", path: "/fees", icon: CreditCard },
      { label: "Analytics", path: "/analytics", icon: BarChart3 },
      { label: "Profile", path: "/profile", icon: UserCircle },
      { label: "Settings", path: "/settings", icon: Settings },
    ]
  }

  const mobileLinks = getMobileLinks()

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-3 sm:px-4 shadow-2xs">
        {/* Left Side: Mobile Menu + Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden rounded-md p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Mobile page title */}
          <span className="sm:hidden truncate text-sm font-semibold text-foreground capitalize">
            {breadcrumbs[breadcrumbs.length - 1]?.label || "Dashboard"}
          </span>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-muted-foreground min-w-0">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1
              return (
                <React.Fragment key={crumb.href}>
                  {idx > 0 && <span className="text-muted-foreground/60">/</span>}
                  {isLast ? (
                    <span className="text-foreground font-semibold">{crumb.label}</span>
                  ) : (
                    <Link href={crumb.href} className="hover:text-foreground transition-colors">
                      {crumb.label}
                    </Link>
                  )}
                </React.Fragment>
              )
            })}
          </nav>
        </div>

        {/* Center: Search Bar */}
        <div
          onClick={() => setSearchOpen(true)}
          className="hidden lg:flex w-full max-w-sm relative cursor-pointer mx-6"
        >
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            readOnly
            type="text"
            placeholder="Search leads, students, fees..."
            className="w-full h-8 rounded-lg border border-border/80 bg-muted/30 px-3 pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 text-[9px] font-bold text-muted-foreground/60 border border-border/80 rounded bg-muted/40 px-1 py-0.5 select-none">
            <span>⌘</span>
            <span>K</span>
          </div>
        </div>

        {/* Right Side: Switchers + Profile + Notifications */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <ThemeSwitcher />
          <NotificationDropdown />
          <div className="h-4 w-px bg-border/60" />
          <UserDropdown />
        </div>
      </header>

      {/* Mobile Drawer Navigation overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />
          {/* Sidebar Drawer */}
          <div className="relative flex w-64 max-w-xs flex-1 flex-col bg-card border-r border-border p-4 shadow-xl animate-fade-in">
            <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4">
              <div className="flex items-center gap-2 font-bold tracking-tight">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <span className="text-sm font-semibold">EduPlatform</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md p-1 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex-1 space-y-1 overflow-y-auto">
              {mobileLinks.map((link) => {
                const Icon = link.icon
                const isActive = pathname === link.path
                return (
                  <Link
                    key={link.path}
                    href={link.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border/50 pt-3 mt-auto">
              <div className="rounded-lg bg-muted/65 p-3 text-[10px]">
                <p className="font-semibold text-foreground">SaaS Management App</p>
                <p className="text-muted-foreground mt-0.5 leading-normal">
                  Multi-tenant active
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  )
}
