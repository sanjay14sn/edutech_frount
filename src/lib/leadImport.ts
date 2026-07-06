export type LeadImportRow = {
  name: string
  email: string
  phone: string
  course: string
  value?: number
  stage?: string
  bde?: string
  city?: string
  source?: string
  priority?: string
}

export const LEAD_IMPORT_HEADERS = [
  "name",
  "email",
  "phone",
  "course",
  "value",
  "stage",
  "bde",
  "city",
  "source",
] as const

export const LEAD_IMPORT_TEMPLATE_CSV = [
  LEAD_IMPORT_HEADERS.join(","),
  "John Doe,john@example.com,9876543210,Fullstack Web Dev,22000,new,Sanjay S N,Chennai,Website",
  "Jane Smith,jane@example.com,9123456789,full stack development,25000,contacted,,Bangalore,Referral",
].join("\n")

function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim())
      current = ""
      continue
    }
    current += char
  }

  values.push(current.trim())
  return values
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_")
}

export function parseLeadImportCsv(text: string): LeadImportRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) {
    throw new Error("CSV must include a header row and at least one data row.")
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader)
  const rows: LeadImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i])
    const record: Record<string, string> = {}
    headers.forEach((header, index) => {
      record[header] = values[index] ?? ""
    })

    const valueRaw = record.value
    rows.push({
      name: record.name || "",
      email: record.email || "",
      phone: record.phone || "",
      course: record.course || "",
      value: valueRaw ? Number(valueRaw) : undefined,
      stage: record.stage || undefined,
      bde: record.bde || record.counsellor || undefined,
      city: record.city || undefined,
      source: record.source || undefined,
      priority: record.priority || undefined,
    })
  }

  return rows
}

export function downloadLeadImportTemplate() {
  const blob = new Blob([LEAD_IMPORT_TEMPLATE_CSV], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "leads-import-template.csv"
  link.click()
  URL.revokeObjectURL(url)
}
