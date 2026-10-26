"use client"

import * as React from "react"
import { FileText, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { EmployeePageHeader, EmptyState } from "@/components/employee/EmployeePageHeader"
import { api } from "@/lib/api"
import { type EmployeeDocument, formatDay } from "@/lib/employeePortal"

export default function EmployeeDocumentsPage() {
  const [docs, setDocs] = React.useState<EmployeeDocument[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    api
      .getEmployeeDocuments()
      .then((rows) => setDocs(rows || []))
      .catch(() => setDocs([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <EmployeePageHeader title="Documents" description="Contracts, ID proofs, and certificates shared by HR" />

      <Card className="bg-card">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
          ) : docs.length === 0 ? (
            <EmptyState>No documents have been shared with you yet.</EmptyState>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border/50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{d.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDay(d.uploadDate)} · {d.size}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {d.category}
                    </Badge>
                    {d.url && (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                      >
                        Open <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
