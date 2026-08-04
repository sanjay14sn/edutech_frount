import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  CalendarOff,
  Wallet,
  Layers,
  Receipt,
  UserCircle,
  BarChart3,
  FileText,
  CalendarDays,
  Settings,
  type LucideIcon,
} from "lucide-react"

export type HRNavItem = {
  label: string
  path: string
  icon: LucideIcon
  adminOnly?: boolean
}

/** Active HRMS modules for Staff Payroll & HR Suite */
export const HR_NAV_ITEMS: HRNavItem[] = [
  { label: "Dashboard", path: "/hr/dashboard", icon: LayoutDashboard },
  { label: "Employees", path: "/hr/employees", icon: Users, adminOnly: true },
  { label: "Attendance", path: "/hr/attendance", icon: CalendarCheck },
  { label: "Leave Management", path: "/hr/leave", icon: CalendarOff },
  { label: "Payroll", path: "/hr/payroll", icon: Wallet, adminOnly: true },
  { label: "Salary Structures", path: "/hr/salary-structures", icon: Layers, adminOnly: true },
  { label: "Expenses & Reimbursements", path: "/hr/expenses", icon: Receipt },
  { label: "Employee Self-Service", path: "/hr/me", icon: UserCircle },
  { label: "Reports", path: "/hr/reports", icon: BarChart3, adminOnly: true },
  { label: "Documents", path: "/hr/documents", icon: FileText },
  { label: "Holiday Calendar", path: "/hr/holidays", icon: CalendarDays, adminOnly: true },
  { label: "Settings", path: "/hr/settings", icon: Settings, adminOnly: true },
]

export function getHRNavForRole(role?: string) {
  if (role === "trainer" || role === "bde") {
    return HR_NAV_ITEMS.filter((item) => !item.adminOnly)
  }
  return HR_NAV_ITEMS
}
