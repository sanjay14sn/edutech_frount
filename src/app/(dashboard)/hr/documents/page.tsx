"use client"

import * as React from "react"
import { Plus, RefreshCw, UploadCloud, ArrowLeft, Eye, EyeOff, Trash2, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { api } from "@/lib/api"
import { useStore } from "@/store/useStore"

const CATEGORIES = [
  { value: "Offer Letter", label: "Offer Letter" },
  { value: "Contract", label: "Contract" },
  { value: "ID Proof", label: "ID Proof (Aadhaar / PAN)" },
  { value: "Bank Document", label: "Bank Document" },
  { value: "Tax Document", label: "Tax Document" },
  { value: "Certificate", label: "Certificate" },
  { value: "Other", label: "Other" },
]

type HRDoc = {
  id: string
  employeeId: string
  name: string
  category: string
  uploadDate: string
  size: string
  url?: string
  sharedWithEmployee?: boolean
  uploadedByName?: string
}

type HREmp = { id: string; name: string; employeeCode?: string; status: string; portalAccess?: boolean; sourceType?: string }

const emptyForm = { employeeId: "", name: "", category: "Offer Letter", sharedWithEmployee: true, file: null as File | null }

export default function HRDocumentsPage() {
  const { addNotification } = useStore()
  const [docs, setDocs] = React.useState<HRDoc[]>([])
  const [employees, setEmployees] = React.useState<HREmp[]>([])
  const [filterEmp, setFilterEmp] = React.useState("all")
  const [open, setOpen] = React.useState(false)
  const [uploading, setUploading] = React.useState(false)
  const [form, setForm] = React.useState(emptyForm)

  const load = React.useCallback(async () => {
    const [d, e] = await Promise.all([
      api.getHRDocuments(filterEmp === "all" ? undefined : filterEmp),
      api.getHREmployees(),
    ])
    setDocs(d || [])
    setEmployees(e || [])
  }, [filterEmp])

  React.useEffect(() => {
    void load()
  }, [load])

  const activeEmployees = employees.filter((e) => e.status === "active")
  const empById = React.useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])
  const selectedEmp = empById.get(form.employeeId)

  const openUpload = () => {
    setForm({ ...emptyForm, employeeId: filterEmp !== "all" ? filterEmp : activeEmployees[0]?.id || "" })
    setOpen(true)
  }

  const upload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.employeeId || !form.file) return
    setUploading(true)
    try {
      const uploaded = await api.uploadFile(form.file, "hr")
      const name = form.name.trim() || uploaded.fileName || form.file.name
      await api.createHRDocument({
        employeeId: form.employeeId,
        name,
        category: form.category,
        uploadDate: new Date().toISOString().slice(0, 10),
        size: `${Math.max(1, Math.round((uploaded.size || form.file.size) / 1024))} KB`,
        url: uploaded.url,
        sharedWithEmployee: form.sharedWithEmployee,
      })
      addNotification({
        title: "Document uploaded",
        description: form.sharedWithEmployee ? `${name} is now visible to ${selectedEmp?.name || "the employee"}` : name,
        type: "system",
      })
      setOpen(false)
      await load()
    } catch (err) {
      alert((err as Error).message || "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  const toggleSharing = async (doc: HRDoc) => {
    try {
      await api.updateHRDocumentSharing(doc.id, doc.sharedWithEmployee === false)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to update document")
    }
  }

  const remove = async (doc: HRDoc) => {
    if (!confirm(`Delete "${doc.name}"? The employee will no longer see it.`)) return
    try {
      await api.deleteHRDocument(doc.id)
      await load()
    } catch (err) {
      alert((err as Error).message || "Failed to delete document")
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
          <p className="text-[11px] text-muted-foreground">
            Aadhaar, PAN, bank, offer letters, contracts. Shared documents appear in the employee&apos;s portal.
          </p>
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
          <Button size="sm" icon={Plus} className="h-8 text-xs" onClick={openUpload} disabled={activeEmployees.length === 0}>
            Upload
          </Button>
        </div>
      </div>

      <Card className="bg-card">
        <CardContent className="divide-y divide-border/40 p-0">
          {docs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-xs text-muted-foreground">No documents in vault</p>
              {activeEmployees.length > 0 && (
                <Button size="sm" icon={UploadCloud} className="h-8 text-xs" onClick={openUpload}>
                  Upload the first document
                </Button>
              )}
            </div>
          ) : (
            docs.map((d) => {
              const emp = empById.get(d.employeeId)
              const shared = d.sharedWithEmployee !== false
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      {d.url ? (
                        <a
                          href={d.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-primary"
                        >
                          {d.name} <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <p className="font-semibold">{d.name}</p>
                      )}
                      <p className="text-muted-foreground">
                        {emp?.name || d.employeeId}
                        {emp?.employeeCode ? ` (${emp.employeeCode})` : ""} · {d.size} · {d.uploadDate}
                        {d.uploadedByName ? ` · by ${d.uploadedByName}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{d.category}</Badge>
                    <Badge variant={shared ? "success" : "secondary"}>{shared ? "Visible to employee" : "HR only"}</Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={shared ? EyeOff : Eye}
                      className="h-7 text-[10px]"
                      onClick={() => toggleSharing(d)}
                    >
                      {shared ? "Hide" : "Share"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Trash2}
                      className="h-7 text-[10px] text-rose-500"
                      aria-label="Delete document"
                      onClick={() => remove(d)}
                    />
                  </div>
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      <Dialog isOpen={open} onClose={() => setOpen(false)} title="Upload document">
        <form onSubmit={upload} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Employee *</label>
            <Select value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} className="h-8 text-xs" required>
              <option value="">Select employee</option>
              {activeEmployees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                  {e.employeeCode ? ` (${e.employeeCode})` : ""}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Document name</label>
            <Input
              placeholder="Defaults to the file name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">Category</label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="h-8 text-xs">
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label className="font-semibold text-muted-foreground">File *</label>
            <Input
              type="file"
              required
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
              className="h-8 text-xs"
            />
          </div>
          <label className="flex items-start gap-2 rounded-lg border border-border/60 p-2.5">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={form.sharedWithEmployee}
              onChange={(e) => setForm({ ...form, sharedWithEmployee: e.target.checked })}
            />
            <span>
              <span className="font-semibold text-foreground">Visible to employee</span>
              <span className="block text-muted-foreground">
                {selectedEmp && selectedEmp.sourceType === "manual" && !selectedEmp.portalAccess
                  ? "This employee has no portal login yet. Enable it from HR → Employees so they can see it."
                  : "Shows under Documents in the employee's portal."}
              </span>
            </span>
          </label>
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
