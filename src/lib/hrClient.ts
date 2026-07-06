type TrainerRow = {
  id?: string
  _id?: string
  name?: string
  technologySubject?: string
  skills?: string
  joiningDate?: string
  salaryRateAmount?: number
  rating?: number
  bankHolderName?: string
  bankAccountNumber?: string
  ifscCode?: string
  activeBatches?: number
  hoursThisWeek?: number
  tenantId?: string
}

type BdeRow = {
  id?: string
  name?: string
  joiningDate?: string
  monthlyTarget?: number
  commissionPercentage?: number
}

type BatchRow = {
  id?: string
  _id?: string
  trainerName?: string
  courseName?: string
  code?: string
  schedule?: string
  centerName?: string
  roomName?: string
  studentNames?: string[]
  enrolled?: number
}

const DEPT_COLORS: Record<string, string> = {
  "Education & Tech": "#3b82f6",
  "Sales & CRM": "#f59e0b",
  "UI/UX & Design": "#8b5cf6",
  "Operations & Admin": "#10b981",
}

function initials(name: string) {
  return name.split(" ").filter(Boolean).map((p) => p[0]).join("").toUpperCase().slice(0, 2)
}

function trainerDepartment(trainer: TrainerRow) {
  const subject = `${trainer.technologySubject || ""} ${trainer.skills || ""}`.toLowerCase()
  if (subject.includes("ui") || subject.includes("ux") || subject.includes("design")) {
    return "UI/UX & Design"
  }
  return "Education & Tech"
}

function formatJoinDate(value?: string) {
  if (!value) return new Date().toISOString().split("T")[0]
  return value.split("T")[0]
}

function maskAccount(account?: string) {
  if (!account) return "**** ----"
  return `**** ${account.replace(/\s/g, "").slice(-4)}`
}

function defaultCommissionRule(employeeId: string, salary = 40000) {
  return {
    employeeId,
    perBatchPayout: Math.round(salary * 0.08),
    perStudentPayout: 150,
    attendanceBonusThreshold: 90,
    attendanceBonusAmount: 2500,
    studentFeedbackBonusThreshold: 4.5,
    studentFeedbackBonusAmount: 2000,
    retentionIncentivePct: 5,
  }
}

function computePayrollPreview(
  emp: ReturnType<typeof buildEmployeesFromStaffApis>[number],
  rule?: ReturnType<typeof defaultCommissionRule>
) {
  const unpaidDays = emp.leaveBalance.unpaid
  const dailyRate = Math.round(emp.baseSalary / 30)
  const unpaidDeduction = unpaidDays * dailyRate
  const lateDays = emp.attendancePct < 90 ? 3 : emp.attendancePct < 95 ? 1 : 0
  const lateDeduction = lateDays * 500
  const overtime = emp.attendancePct > 95 ? 1500 : 0
  const comm = rule
    ? rule.perBatchPayout * (emp.batchCount || 0) + rule.perStudentPayout * (emp.studentCount || 0)
    : 0
  const inc = emp.performanceScore > 4.5 ? 3000 : emp.performanceScore > 4 ? 1500 : 0
  const net = emp.baseSalary + emp.allowance + overtime + comm + inc - unpaidDeduction - lateDeduction
  return { unpaidDeduction, lateDeduction, overtime, comm, inc, net }
}

function parseScheduleMeta(schedule: string) {
  const dayMatch = schedule.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi)
  const dayOfWeek = dayMatch?.[0]
    ? dayMatch[0].charAt(0).toUpperCase() + dayMatch[0].slice(1).toLowerCase()
    : "Monday"
  const timeMatch = schedule.match(/(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i)
  return {
    dayOfWeek,
    startTime: timeMatch?.[1] || "10:00 AM",
    endTime: timeMatch?.[2] || "12:00 PM",
  }
}

export function buildEmployeesFromStaffApis(
  trainers: TrainerRow[],
  bdes: BdeRow[],
  batches: BatchRow[] = []
) {
  const trainerEmployees = trainers.map((trainer) => {
    const id = String(trainer.id || trainer._id)
    const name = trainer.name || "Trainer"
    const trainerName = name.trim().toLowerCase()
    const assigned = batches.filter(
      (b) => (b.trainerName || "").trim().toLowerCase() === trainerName
    )
    return {
      id,
      name,
      photo: initials(name),
      role: "Trainer" as const,
      department: trainerDepartment(trainer),
      branch: assigned[0]?.centerName || trainer.tenantId || "Main Campus",
      reportingManager: "Center Admin",
      joiningDate: formatJoinDate(trainer.joiningDate),
      attendancePct: 100,
      leaveBalance: { casual: 12, sick: 10, unpaid: 0 },
      bankDetails: {
        holder: trainer.bankHolderName || name,
        bank: "Institute Bank",
        account: maskAccount(trainer.bankAccountNumber),
        ifsc: trainer.ifscCode || "N/A",
      },
      performanceScore: trainer.rating || 4.5,
      baseSalary: trainer.salaryRateAmount || 0,
      allowance: Math.round((trainer.salaryRateAmount || 0) * 0.06),
      recentActivities: assigned.slice(0, 1).map((b, idx) => ({
        id: `act-${id}-${idx}`,
        text: `Assigned to batch at ${b.centerName || "campus"}`,
        date: new Date().toISOString().split("T")[0],
      })),
      batchCount: trainer.activeBatches ?? assigned.length,
      studentCount: assigned.reduce((sum, b) => sum + (b.studentNames?.length || b.enrolled || 0), 0),
      hoursThisWeek: trainer.hoursThisWeek || 0,
    }
  })

  const bdeEmployees = bdes.map((bde) => ({
    id: String(bde.id),
    name: bde.name || "BDE",
    photo: initials(bde.name || "BD"),
    role: "BDE" as const,
    department: "Sales & CRM",
    branch: "Main Campus",
    reportingManager: "Center Admin",
    joiningDate: bde.joiningDate || new Date().toISOString().split("T")[0],
    attendancePct: 100,
    leaveBalance: { casual: 12, sick: 10, unpaid: 0 },
    bankDetails: {
      holder: bde.name || "",
      bank: "Institute Bank",
      account: "**** ----",
      ifsc: "N/A",
    },
    performanceScore: 4,
    baseSalary: 30000,
    allowance: Math.round((bde.commissionPercentage || 5) * 500),
    recentActivities: [],
    batchCount: 0,
    studentCount: 0,
    convertedLeads: 0,
    monthlyTarget: bde.monthlyTarget || 30,
  }))

  return [...trainerEmployees, ...bdeEmployees]
}

export function buildHROverviewFromStaffApis(
  trainers: TrainerRow[],
  bdes: BdeRow[],
  batches: BatchRow[] = [],
  month: string
) {
  const employees = buildEmployeesFromStaffApis(trainers, bdes, batches)
  const commissionRules = trainers.map((t) =>
    defaultCommissionRule(String(t.id || t._id), t.salaryRateAmount || 40000)
  )

  const payroll = employees.map((emp) => {
    const rule = commissionRules.find((r) => r.employeeId === emp.id)
    const preview = computePayrollPreview(emp, rule)
    return {
      id: `draft-${emp.id}`,
      employeeId: emp.id,
      month,
      baseSalary: emp.baseSalary,
      lateArrivalDeduction: preview.lateDeduction,
      unpaidLeaveDeduction: preview.unpaidDeduction,
      overtimeAdd: preview.overtime,
      commissionAdd: preview.comm,
      incentiveAdd: preview.inc,
      grossPayout: emp.baseSalary + emp.allowance + preview.overtime + preview.comm + preview.inc,
      netPayout: preview.net,
      status: "Draft" as const,
      timeline: [] as Array<{ title: string; date: string; description: string }>,
    }
  })

  const schedules = batches.map((batch) => {
    const meta = parseScheduleMeta(batch.schedule || "")
    const batchId = String(batch.id || batch._id || batch.code || batch.courseName)
    return {
      id: batchId,
      trainerId: "",
      trainerName: batch.trainerName || "",
      batchName: `${batch.courseName || "Batch"} (${batch.code || "—"})`,
      roomName: batch.roomName || batch.centerName || "Room TBD",
      startTime: meta.startTime,
      endTime: meta.endTime,
      dayOfWeek: meta.dayOfWeek,
    }
  })

  const departmentTotals = new Map<string, number>()
  employees.forEach((emp) => {
    departmentTotals.set(emp.department, (departmentTotals.get(emp.department) || 0) + emp.baseSalary)
  })
  const departmentDistribution = Array.from(departmentTotals.entries()).map(([name, value]) => ({
    name,
    value,
    color: DEPT_COLORS[name] || "#64748b",
  }))

  const leaveUtilization = employees.map((emp) => ({
    name: emp.name.split(" ")[0],
    Used: Math.max(0, emp.leaveBalance.unpaid + (12 - emp.leaveBalance.casual) + (10 - emp.leaveBalance.sick)),
    Remaining: Math.max(0, emp.leaveBalance.casual + emp.leaveBalance.sick),
  }))

  const totalPayroll = payroll.reduce((sum, row) => sum + row.netPayout, 0)
  const summary = {
    month,
    totalStaff: employees.length,
    trainerCount: employees.filter((e) => e.role === "Trainer").length,
    bdeCount: employees.filter((e) => e.role === "BDE").length,
    totalPayroll,
    pendingPayroll: 0,
    draftPayroll: payroll.length,
    approvedPayroll: 0,
    releasedPayroll: 0,
    openClaims: 0,
    scheduleConflicts: 0,
    avgAttendance: employees.length
      ? Math.round((employees.reduce((s, e) => s + e.attendancePct, 0) / employees.length) * 10) / 10
      : 0,
    totalBatches: employees.reduce((s, e) => s + (e.batchCount || 0), 0),
    totalStudents: employees.reduce((s, e) => s + (e.studentCount || 0), 0),
    branches: Array.from(new Set(employees.map((e) => e.branch))),
    departments: Array.from(new Set(employees.map((e) => e.department))),
  }

  const alerts = employees.length
    ? [{
        type: "insight",
        title: "Workforce pulse",
        message: `${summary.totalStaff} staff active · est. payroll ₹${totalPayroll.toLocaleString("en-IN")} for ${month}.`,
      }]
    : []

  const aiInsights = employees.length
    ? [{
        title: "Payroll composition snapshot",
        message: `${summary.trainerCount} trainers · ${summary.bdeCount} BDEs · ${summary.totalBatches} batches · ${summary.totalStudents} students in commission scope.`,
        severity: "info",
      }]
    : []

  return {
    month,
    summary,
    employees,
    payroll,
    commissionRules,
    claims: [] as Array<Record<string, unknown>>,
    schedules,
    vaultDocs: [] as Array<Record<string, unknown>>,
    departmentDistribution,
    leaveUtilization,
    alerts,
    aiInsights,
  }
}
