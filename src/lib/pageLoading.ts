const PAGE_LOADING_MESSAGES: Array<{ prefix: string; message: string }> = [
  { prefix: "/dashboard", message: "Loading dashboard..." },
  { prefix: "/crm", message: "Loading leads CRM..." },
  { prefix: "/bde", message: "Loading BDE management..." },
  { prefix: "/students", message: "Loading students..." },
  { prefix: "/trainers", message: "Loading trainers..." },
  { prefix: "/courses", message: "Loading courses & batches..." },
  { prefix: "/lms", message: "Loading LMS..." },
  { prefix: "/attendance", message: "Loading attendance..." },
  { prefix: "/fees", message: "Loading fees & dues..." },
  { prefix: "/jobs", message: "Loading job portal..." },
  { prefix: "/analytics", message: "Loading analytics..." },
  { prefix: "/campaigns", message: "Loading campaigns..." },
  { prefix: "/hr", message: "Loading staff payroll & HR..." },
  { prefix: "/profile", message: "Loading profile..." },
  { prefix: "/support", message: "Loading support..." },
  { prefix: "/followups", message: "Loading follow-ups..." },
  { prefix: "/admissions", message: "Loading admissions..." },
  { prefix: "/tasks", message: "Loading tasks..." },
  { prefix: "/performance", message: "Loading performance..." },
  { prefix: "/reports", message: "Loading reports..." },
  { prefix: "/centers", message: "Loading centers..." },
  { prefix: "/roles", message: "Loading roles..." },
  { prefix: "/storage", message: "Loading storage..." },
  { prefix: "/certification", message: "Loading certification..." },
  { prefix: "/remarks", message: "Loading remarks..." },
  { prefix: "/settings", message: "Loading settings..." },
]

export function getPageLoadingMessage(pathname?: string | null) {
  if (!pathname) return "Loading page..."

  const match = PAGE_LOADING_MESSAGES.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )

  return match?.message ?? "Loading page..."
}
