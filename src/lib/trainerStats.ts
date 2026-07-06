function parseTimeToMinutes(time: string): number {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
  if (!match) return 0
  let hours = parseInt(match[1], 10)
  const mins = parseInt(match[2], 10)
  const period = match[3].toUpperCase()
  if (period === "PM" && hours !== 12) hours += 12
  if (period === "AM" && hours === 12) hours = 0
  return hours * 60 + mins
}

export function parseWeeklyHoursFromSchedule(schedule: string): number {
  if (!schedule) return 0

  const timeMatch = schedule.match(
    /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))/i
  )
  if (!timeMatch) return 0

  const startMins = parseTimeToMinutes(timeMatch[1])
  const endMins = parseTimeToMinutes(timeMatch[2])
  const sessionHours = Math.max(0, (endMins - startMins) / 60)

  const daysPart = schedule.split(/[•·|]/)[0] || schedule
  const dayCount = (daysPart.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi) || []).length || 1

  return Math.round(sessionHours * dayCount * 10) / 10
}

export function enrichTrainersWithStats(trainers: any[], batches: any[]) {
  return trainers.map((trainer) => {
    const trainerName = (trainer.name || "").trim().toLowerCase()
    const assignedBatches = batches.filter(
      (batch) => (batch.trainerName || "").trim().toLowerCase() === trainerName
    )

    const activeBatches = assignedBatches.length
    const hoursThisWeek = assignedBatches.reduce(
      (sum, batch) => sum + parseWeeklyHoursFromSchedule(batch.schedule || ""),
      0
    )

    return {
      ...trainer,
      activeBatches,
      hoursThisWeek: Math.round(hoursThisWeek * 10) / 10,
    }
  })
}
