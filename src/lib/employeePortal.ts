import {
  LayoutDashboard,
  CalendarCheck,
  ListTodo,
  ClipboardList,
  CalendarOff,
  CalendarDays,
  Wallet,
  FileText,
  type LucideIcon,
} from "lucide-react"
import type { ShiftStatus } from "@/lib/shiftTimer"

export type EmployeeProfile = {
  id: string
  employeeCode: string
  name: string
  email?: string
  phone?: string
  department: string
  designation: string
  branch: string
  employmentType: string
  joiningDate: string
  reportingManager?: string
}

export type EmployeeShift = {
  id: string
  date: string
  shiftStatus: ShiftStatus
  loginTime?: string
  logoutTime?: string
  loginAt?: string | null
  logoutAt?: string | null
  totalPausedSeconds?: number
  workedSeconds?: number
  workMode?: "office" | "remote" | "field"
}

export type EmployeeSummary = {
  employee: EmployeeProfile
  today: { date: string; attendance: EmployeeShift | null; reportSubmitted: boolean }
  leave: { casual: number; sick: number; earned: number; available: number; pending: number }
  openTasks: number
}

export type AttendanceCorrection = {
  id: string
  date: string
  requestedLoginTime?: string
  requestedLogoutTime?: string
  reason: string
  status: "Pending" | "Approved" | "Rejected"
  createdAt: string
}

export type EmployeeTask = {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high"
  status: "pending" | "in_progress" | "completed"
  dueDate?: string
  assignedByName?: string
  remarks?: string
  createdAt: string
}

export type DailyReport = {
  id: string
  date: string
  summary?: string
  tasksCompleted?: string
  tasksInProgress?: string
  blockers?: string
  planForTomorrow?: string
  hoursWorked?: number
  createdAt?: string
  updatedAt?: string
}

export type LeaveRequest = {
  id: string
  leaveType: "casual" | "sick" | "earned"
  startDate: string
  endDate: string
  days: number
  reason?: string
  status: "Pending" | "Approved" | "Rejected" | "Cancelled"
  createdAt: string
}

export type Holiday = { id: string; name: string; date: string; optional: boolean; notes?: string }

export type Payslip = {
  id: string
  month: string
  baseSalary: number
  lateArrivalDeduction: number
  unpaidLeaveDeduction: number
  overtimeAdd: number
  commissionAdd: number
  incentiveAdd: number
  grossPayout: number
  netPayout: number
  status: string
}

export type EmployeeDocument = {
  id: string
  name: string
  category: string
  uploadDate: string
  size: string
  url?: string
}

export type EmployeeNavItem = { label: string; path: string; icon: LucideIcon }

export const EMPLOYEE_NAV_ITEMS: EmployeeNavItem[] = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Attendance", path: "/employee/attendance", icon: CalendarCheck },
  { label: "Daily Task", path: "/employee/tasks", icon: ListTodo },
  { label: "Daily Report", path: "/employee/daily-report", icon: ClipboardList },
  { label: "Leave Management", path: "/employee/leave", icon: CalendarOff },
  { label: "Reserved Holidays", path: "/employee/holidays", icon: CalendarDays },
  { label: "Pay Slips", path: "/employee/payslips", icon: Wallet },
  { label: "Documents", path: "/employee/documents", icon: FileText },
]

export function isEmployeePortalPath(pathname: string) {
  return pathname === "/dashboard" || pathname === "/profile" || pathname.startsWith("/employee")
}

export function initials(name?: string) {
  return (name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
}

/** Formats YYYY-MM-DD (or ISO) as "13 Oct 2026". */
export function formatDay(dateStr?: string) {
  if (!dateStr) return "—"
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  const d = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

/** Formats YYYY-MM as "October 2026". */
export function formatMonth(month: string) {
  const match = month.match(/^(\d{4})-(\d{2})/)
  if (!match) return month
  return new Date(Number(match[1]), Number(match[2]) - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  })
}

export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export const WORK_MODE_LABELS: Record<string, string> = {
  office: "Office",
  remote: "Remote",
  field: "Field",
}

export const LEAVE_TYPE_LABELS: Record<string, string> = {
  casual: "Casual",
  sick: "Sick",
  earned: "Earned",
}

export function statusBadgeVariant(status: string): "success" | "warning" | "destructive" | "secondary" | "info" {
  switch (status) {
    case "Approved":
    case "Released":
    case "completed":
      return "success"
    case "Pending":
    case "Pending Approval":
    case "pending":
      return "warning"
    case "Rejected":
      return "destructive"
    case "in_progress":
      return "info"
    default:
      return "secondary"
  }
}
