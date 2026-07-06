export type InstallmentScheduleItem = {
  amount: number
  dueDate: string
  label?: string
}

export type ComputedInstallment = InstallmentScheduleItem & {
  number: number
  label: string
  status: "paid" | "partial" | "pending" | "overdue"
  dueAmount: number
  paidAmount: number
}

export function getInstallmentLabel(index: number, total: number) {
  const number = index + 1
  if (number === 1) return "Admission Fee"
  if (number === total) return "Final Dues"
  return `Installment ${number}`
}

export function buildDefaultSchedule(input: {
  feesTotal: number
  installmentsCount?: number
  enrollmentDate?: string
  nextDueDate?: string
}): InstallmentScheduleItem[] {
  const count = Math.max(1, input.installmentsCount || 3)
  const total = Math.max(0, input.feesTotal || 0)
  if (total <= 0) return []

  const baseAmount = Math.floor(total / count)
  const remainder = total - baseAmount * count
  const enrollment = input.enrollmentDate || new Date().toISOString().split("T")[0]

  return Array.from({ length: count }, (_, index) => {
    const amount = index === count - 1 ? baseAmount + remainder : baseAmount
    const baseDate = new Date(enrollment)
    baseDate.setMonth(baseDate.getMonth() + index * 2)
    const dueDate =
      index === 0 && input.nextDueDate
        ? input.nextDueDate.substring(0, 10)
        : baseDate.toISOString().split("T")[0]

    return {
      amount,
      dueDate,
      label: getInstallmentLabel(index, count),
    }
  })
}

export function normalizeInstallmentSchedule(
  student: {
    feesTotal?: number
    installmentsCount?: number
    enrollmentDate?: string
    nextDueDate?: string
    installmentSchedule?: InstallmentScheduleItem[]
  }
): InstallmentScheduleItem[] {
  const schedule = student.installmentSchedule || []
  if (schedule.length > 0) {
    return schedule.map((item, index) => ({
      amount: Number(item.amount) || 0,
      dueDate: (item.dueDate || "").substring(0, 10),
      label: item.label || getInstallmentLabel(index, schedule.length),
    }))
  }

  return buildDefaultSchedule({
    feesTotal: student.feesTotal || 0,
    installmentsCount: student.installmentsCount,
    enrollmentDate: student.enrollmentDate,
    nextDueDate: student.nextDueDate,
  })
}

function isPastDueDate(dueDate?: string) {
  if (!dueDate) return false
  const due = dueDate.substring(0, 10)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
  return due < todayStr
}

export function computeInstallmentRows(
  student: {
    feesPaid?: number
    feesTotal?: number
    installmentsCount?: number
    enrollmentDate?: string
    nextDueDate?: string
    installmentSchedule?: InstallmentScheduleItem[]
  }
): ComputedInstallment[] {
  const schedule = normalizeInstallmentSchedule(student)
  const feesPaid = Math.max(0, student.feesPaid || 0)
  let remainingPaid = feesPaid

  return schedule.map((item, index) => {
    const amount = Math.max(0, item.amount || 0)
    let status: ComputedInstallment["status"] = "pending"
    let paidAmount = 0
    let dueAmount = amount

    if (remainingPaid >= amount) {
      status = "paid"
      paidAmount = amount
      dueAmount = 0
      remainingPaid -= amount
    } else if (remainingPaid > 0) {
      status = "partial"
      paidAmount = remainingPaid
      dueAmount = amount - remainingPaid
      remainingPaid = 0
    } else if (isPastDueDate(item.dueDate)) {
      status = "overdue"
    }

    return {
      number: index + 1,
      amount,
      dueDate: item.dueDate,
      label: item.label || getInstallmentLabel(index, schedule.length),
      status,
      dueAmount,
      paidAmount,
    }
  })
}

export function getCurrentDueInstallment(rows: ComputedInstallment[]) {
  return rows.find((row) => row.status === "overdue" || row.status === "partial" || row.status === "pending")
}

export function resolveNextDueDate(input: {
  feesPaid?: number
  feesTotal?: number
  installmentsCount?: number
  enrollmentDate?: string
  nextDueDate?: string
  installmentSchedule?: InstallmentScheduleItem[]
}): string | undefined {
  const feesPaid = input.feesPaid || 0
  const feesTotal = input.feesTotal || 0
  if (feesPaid >= feesTotal && feesTotal > 0) return undefined

  const current = getCurrentDueInstallment(computeInstallmentRows(input))
  return current?.dueDate || input.nextDueDate || undefined
}

export function isFullyPaid(feesPaid?: number, feesTotal?: number) {
  return (feesTotal || 0) > 0 && (feesPaid || 0) >= (feesTotal || 0)
}

export function sumScheduleAmounts(schedule: InstallmentScheduleItem[]) {
  return schedule.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
}

export function syncScheduleLabels(schedule: InstallmentScheduleItem[]) {
  return schedule.map((item, index) => ({
    ...item,
    label: getInstallmentLabel(index, schedule.length),
  }))
}

/** Even split across count; keeps existing due dates where possible. */
export function evenSplitSchedule(input: {
  feesTotal: number
  installmentsCount: number
  enrollmentDate?: string
  nextDueDate?: string
  preserve?: InstallmentScheduleItem[]
  feesPaid?: number
}): InstallmentScheduleItem[] {
  return buildInstallmentSchedule(input)
}

/** Build schedule: collected amount in installment 1, remaining split across future dues. */
export function buildInstallmentSchedule(input: {
  feesTotal: number
  installmentsCount: number
  enrollmentDate?: string
  nextDueDate?: string
  preserve?: InstallmentScheduleItem[]
  feesPaid?: number
}): InstallmentScheduleItem[] {
  const total = Math.max(0, input.feesTotal)
  const paid = Math.max(0, Math.min(input.feesPaid || 0, total))
  const count = Math.max(1, input.installmentsCount)

  if (total <= 0) return []

  const defaultBase = buildDefaultSchedule({
    feesTotal: total,
    installmentsCount: count,
    enrollmentDate: input.enrollmentDate,
    nextDueDate: input.nextDueDate,
  })

  const dueDates = Array.from({ length: count }, (_, index) =>
    input.preserve?.[index]?.dueDate ||
    defaultBase[index]?.dueDate ||
    defaultBase[0]?.dueDate ||
    new Date().toISOString().split("T")[0]
  )

  const evenAmounts = defaultBase.map((item) => item.amount)

  // Nothing collected yet — split full course fee evenly.
  if (paid <= 0) {
    return syncScheduleLabels(
      evenAmounts.map((amount, index) => ({
        amount,
        dueDate: dueDates[index],
      }))
    )
  }

  if (count === 1) {
    return syncScheduleLabels([{ amount: total, dueDate: dueDates[0] }])
  }

  // Partial payment: installment 1 = collected, remaining slots = outstanding balance.
  const remaining = total - paid
  const unpaidSlots = count - 1
  const baseAmount = Math.floor(remaining / unpaidSlots)
  const remainder = remaining - baseAmount * unpaidSlots

  const schedule: InstallmentScheduleItem[] = [{ amount: paid, dueDate: dueDates[0] }]

  for (let index = 1; index < count; index++) {
    schedule.push({
      amount: index === count - 1 ? baseAmount + remainder : baseAmount,
      dueDate: dueDates[index],
    })
  }

  return syncScheduleLabels(schedule)
}

/** Fix schedule so installment amounts add up to course fees. */
export function rebalanceScheduleToTotal(
  schedule: InstallmentScheduleItem[],
  feesTotal: number
): InstallmentScheduleItem[] {
  const total = Math.max(0, feesTotal)
  if (total <= 0) return []

  if (schedule.length === 0) {
    return evenSplitSchedule({ feesTotal: total, installmentsCount: 3 })
  }

  if (schedule.length === 1) {
    return syncScheduleLabels([{ ...schedule[0], amount: total }])
  }

  const head = schedule.slice(0, -1).map((item, index) => ({
    ...item,
    amount: Math.max(0, Number(item.amount) || 0),
    label: getInstallmentLabel(index, schedule.length),
  }))
  const headSum = head.reduce((sum, item) => sum + item.amount, 0)
  const lastIndex = schedule.length - 1

  return syncScheduleLabels([
    ...head,
    {
      ...schedule[lastIndex],
      amount: Math.max(0, total - headSum),
      label: getInstallmentLabel(lastIndex, schedule.length),
    },
  ])
}

/** Edit one installment amount; last row auto-balances to match total fees. */
export function updateScheduleAmountAtIndex(
  schedule: InstallmentScheduleItem[],
  index: number,
  amount: number,
  feesTotal: number,
  feesPaid?: number
): InstallmentScheduleItem[] {
  if (schedule.length === 0) return schedule

  const total = Math.max(0, feesTotal)
  const paid = Math.max(0, Math.min(feesPaid || 0, total))
  const hasCollected = paid > 0 && paid < total && schedule.length > 1

  if (hasCollected) {
    const next = schedule.map((item, idx) => ({
      ...item,
      amount: idx === 0 ? paid : Math.max(0, Number(item.amount) || 0),
    }))

    if (index === 0) {
      return syncScheduleLabels(next)
    }

    if (index > 0 && index < schedule.length - 1) {
      next[index] = { ...next[index], amount: Math.max(0, Number(amount) || 0) }
      const middleSum = next.slice(1, -1).reduce((sum, item) => sum + item.amount, 0)
      next[next.length - 1] = {
        ...next[next.length - 1],
        amount: Math.max(0, total - paid - middleSum),
      }
    }

    return syncScheduleLabels(next)
  }

  if (schedule.length === 1) {
    return syncScheduleLabels([{ ...schedule[0], amount: total }])
  }

  const next = schedule.map((item, idx) => ({
    ...item,
    amount:
      idx === index
        ? Math.max(0, Number(amount) || 0)
        : Math.max(0, Number(item.amount) || 0),
  }))

  if (index < schedule.length - 1) {
    const headSum = next.slice(0, -1).reduce((sum, item) => sum + item.amount, 0)
    next[next.length - 1] = {
      ...next[next.length - 1],
      amount: Math.max(0, total - headSum),
    }
  }

  return syncScheduleLabels(next)
}

export function prepareScheduleForEdit(input: {
  feesTotal: number
  feesPaid?: number
  installmentsCount?: number
  enrollmentDate?: string
  nextDueDate?: string
  installmentSchedule?: InstallmentScheduleItem[]
}): InstallmentScheduleItem[] {
  const feesTotal = Math.max(0, input.feesTotal || 0)
  const feesPaid = Math.max(0, Math.min(input.feesPaid || 0, feesTotal))
  if (feesTotal <= 0) return []

  const normalized = normalizeInstallmentSchedule(input)
  const count = Math.max(
    normalized.length,
    input.installmentsCount || 0,
    1
  )
  const scheduleSum = sumScheduleAmounts(normalized)

  const storedValid =
    normalized.length === count &&
    Math.abs(scheduleSum - feesTotal) <= 1 &&
    (feesPaid <= 0 || Math.abs((normalized[0]?.amount || 0) - feesPaid) <= 1)

  if (storedValid) {
    return syncScheduleLabels(normalized)
  }

  return buildInstallmentSchedule({
    feesTotal,
    feesPaid,
    installmentsCount: count,
    enrollmentDate: input.enrollmentDate,
    nextDueDate: input.nextDueDate,
    preserve: normalized,
  })
}
