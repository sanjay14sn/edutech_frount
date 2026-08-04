"use client"

import * as React from "react"
import { Plus, RefreshCw, UploadCloud, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

export default function HRDocumentsPage() {
  const { addNotification } = useStore()
  const [docs, setDocs] = React.useState<any[]>([])
  const [employees, setEmployees] = React.useState<any[]>([])
  const [filterEmp, setFilterEmp] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [form, setForm] = React.useState({
    employeeId: "",
    name: "",
    category: "Contract" as "Contract" | "ID Proof" | "Tax Document" | "Certificate",
    file: null as File | null,
  })

  const load = React.useCallback(async () => {
    const [d, e] = await Promise.all([
      api.getHRDocuments(filterEmp === "all" ? undefined : filterEmp),
      api.getHREmployees(),
    ])
    setDocs(d || [])
    setEmployees((e || []).filter((x: any) => x.status === "active"))
  }, [filterEmp])

  React.useEffect(() => {
    void load()
  }, [load])

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employeeId || !form.file) return
    setUploading(true)
    try {
      const uploaded = await api.uploadFile(form.file, "hr")
      await api.createHRDocument({
        employeeId: form.employeeId,
        name: form.name || uploaded.fileName || form.file.name,
        category: form.category,
        uploadDate: new Date().toISOString().slice(0, 10),
        size: `${Math.max(1, Math.round((uploaded.size || form.file.size) / 1024))} KB`,
        url: uploaded.url,
      })
      addNotification({ title: "Document uploaded", description: form.name, type: "system" })
      setOpen(false)
      await load()
    } catch (err: any) {
      alert(err.message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link
            href="/hr"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="h-3 w-3" />
            All modules
          </Link>
          <h2 className="text-sm font-extrabold">Documents</h2>
          <p className="text-[11px] text-muted-foreground">Aadhaar, PAN, bank, offer letters, contracts</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterEmp} onChange={(e) => setFilterEmp(e.target.value)} className="h-8 text-xs w-48">
            <option value="all">All employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" icon={RefreshCw} className="h-8 text-xs" onClick={load}>
            Refresh
          </Button>
          <Button
            size="sm"
            icon={Plus}
            className="h-8 text-xs"
            onClick={() => {
              setForm({ employeeId: employees[0]?.id || "", name: "", category: "Contract", file: null })
              setOpen(true)
            }}
          >
            Upload
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="divide-y divide-border/40 p-0">
          {docs.length === 0 ? (
            <p className="p-8 text-center text-xs text-muted-foreground">No documents in vault</p>
          ) : (
            docs.map((d) => {
              const emp = employees.find((e) => e.id === d.employeeId)
              return (
                <div key={d.id} className="flex items-center justify-between gap-2 px-4 py-3 text-xs">
                  <div>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer" className="font-semibold text-foreground hover:text-primary">
                        {d.name}
                      </a>
                    ) : (
                      <p className="font-semibold">{d.name}</p>
                    )}
                    <p className="text-muted-foreground">
                      {emp?.name || d.employeeId} · {d.size} · {d.uploadDate}
                    </p>
                  </div>
                  <Badge variant="outline">{d.category}</Badge>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Upload document">
        <form onSubmit={upload} className="space-y-3 text-xs">
          <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="h-8 text-xs" required>
            <option value="">Employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </Select>
          <Input placeholder="Document name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-xs" />
          <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as any })} className="h-8 text-xs">
            <option value="Contract">Contract / Offer Letter</option>
            <option value="ID Proof">ID Proof (Aadhaar/PAN)</option>
            <option value="Tax Document">Tax / Bank</option>
            <option value="Certificate">Certificate</option>
          </Select>
          <Input type="file" required onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })} className="h-8 text-xs" />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" icon={UploadCloud} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
