export type CsvSection = {
  title: string
  headers: string[]
  rows: (string | number)[][]
}

export function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "")
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsvContent(sections: CsvSection[]): string {
  const lines: string[] = []

  sections.forEach((section, index) => {
    if (index > 0) lines.push("")
    lines.push(escapeCsvCell(section.title))
    lines.push(section.headers.map(escapeCsvCell).join(","))
    section.rows.forEach((row) => {
      lines.push(row.map(escapeCsvCell).join(","))
    })
  })

  return lines.join("\n")
}

export function downloadCsvFile(filename: string, sections: CsvSection[]) {
  const csv = buildCsvContent(sections)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function sanitizeFilename(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
}
