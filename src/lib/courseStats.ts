export function countActiveCourses(
  courses: Array<{ name: string }>,
  batches: Array<{ courseName?: string; centerName?: string }>,
  centerName?: string
): number {
  const relevantBatches = centerName
    ? batches.filter(
        (batch) =>
          (batch.centerName || "").trim().toLowerCase() === centerName.trim().toLowerCase()
      )
    : batches

  const activeCourseNames = new Set(
    relevantBatches.map((batch) => batch.courseName).filter(Boolean) as string[]
  )

  if (courses.length > 0) {
    return courses.filter((course) => activeCourseNames.has(course.name)).length
  }

  return activeCourseNames.size
}

export function countBatchesAtCenter(
  batches: Array<{ centerName?: string }>,
  centerName?: string
): number {
  if (!centerName) return batches.length
  return batches.filter(
    (batch) =>
      (batch.centerName || "").trim().toLowerCase() === centerName.trim().toLowerCase()
  ).length
}
