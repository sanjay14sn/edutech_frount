"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  MessageSquare,
  Users,
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  FileText,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"

type BatchOption = {
  id: string
  code: string
  courseName: string
  studentNames?: string[]
  studentRemarks?: Record<string, string>
  status?: string
}

function studentInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export default function RemarksPage() {
  const { user, addNotification } = useStore()
  const isTrainer = user?.role === "trainer"
  const [batches, setBatches] = React.useState<BatchOption[]>([])
  const [selectedBatchId, setSelectedBatchId] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [selectedStudents, setSelectedStudents] = React.useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [editTarget, setEditTarget] = React.useState<string | null>(null)
  const [editDraft, setEditDraft] = React.useState("")
  const [isSavingEdit, setIsSavingEdit] = React.useState(false)

  const [bulkAddOpen, setBulkAddOpen] = React.useState(false)
  const [bulkAddDraft, setBulkAddDraft] = React.useState("")
  const [isSavingBulkAdd, setIsSavingBulkAdd] = React.useState(false)

  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const data = await api.getBatches()
        const list = (data || []).filter((batch: BatchOption) => batch.status !== "completed")
        setBatches(list)
        if (list.length > 0) {
          setSelectedBatchId((current) => current || String(list[0].id))
        }
      } catch (err) {
        console.error("Failed to load batches for remarks:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const selectedBatch = React.useMemo(
    () => batches.find((batch) => String(batch.id) === String(selectedBatchId)) || null,
    [batches, selectedBatchId]
  )

  const studentNames = selectedBatch?.studentNames || []

  React.useEffect(() => {
    if (!selectedBatch) {
      setSelectedStudents([])
      return
    }
    setSelectedStudents(selectedBatch.studentNames || [])
    setEditTarget(null)
    setDeleteTarget(null)
  }, [selectedBatch])

  const allSelected = studentNames.length > 0 && selectedStudents.length === studentNames.length
  const someSelected = selectedStudents.length > 0 && !allSelected

  const getSavedRemark = (studentName: string) =>
    selectedBatch?.studentRemarks?.[studentName]?.trim() || ""

  const updateBatchInState = (updated: BatchOption) => {
    setBatches((prev) =>
      prev.map((batch) => (String(batch.id) === String(updated.id) ? { ...batch, ...updated } : batch))
    )
  }

  const toggleStudent = (studentName: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentName) ? prev.filter((name) => name !== studentName) : [...prev, studentName]
    )
  }

  const toggleSelectAll = () => {
    setSelectedStudents(allSelected ? [] : [...studentNames])
  }

  const openEdit = (studentName: string) => {
    setEditTarget(studentName)
    setEditDraft(getSavedRemark(studentName))
  }

  const handleSaveEdit = async () => {
    if (!selectedBatch || !editTarget) return

    setIsSavingEdit(true)
    try {
      const updated = await api.updateBatchStudentRemarks(
        selectedBatch.id,
        editTarget,
        editDraft.trim()
      )
      updateBatchInState({ ...selectedBatch, ...updated })
      setEditTarget(null)
      setEditDraft("")
      addNotification({
        title: editDraft.trim() ? "Remarks saved" : "Remarks cleared",
        description: `Updated notes for ${editTarget} in ${selectedBatch.code}.`,
        type: "system",
      })
    } catch (err: any) {
      addNotification({
        title: "Could not save remarks",
        description: err.message || "Failed to update remarks.",
        type: "system",
      })
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!selectedBatch || !deleteTarget) return

    setIsDeleting(true)
    try {
      const updated = await api.updateBatchStudentRemarks(selectedBatch.id, deleteTarget, "")
      updateBatchInState({ ...selectedBatch, ...updated })
      setDeleteTarget(null)
      addNotification({
        title: "Remarks deleted",
        description: `Removed remarks for ${deleteTarget} in ${selectedBatch.code}.`,
        type: "system",
      })
    } catch (err: any) {
      addNotification({
        title: "Could not delete remarks",
        description: err.message || "Failed to delete remarks.",
        type: "system",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const openBulkAdd = () => {
    setBulkAddDraft("")
    setBulkAddOpen(true)
  }

  const handleBulkAdd = async () => {
    if (!selectedBatch || selectedStudents.length === 0) return

    const remarkText = bulkAddDraft.trim()
    if (!remarkText) {
      addNotification({
        title: "Remarks required",
        description: "Enter remarks to apply to the selected students.",
        type: "system",
      })
      return
    }

    setIsSavingBulkAdd(true)
    try {
      let savedCount = 0
      let lastUpdated: BatchOption | null = null

      for (const studentName of selectedStudents) {
        const updated = await api.updateBatchStudentRemarks(
          selectedBatch.id,
          studentName,
          remarkText
        )
        lastUpdated = { ...selectedBatch, ...updated }
        savedCount += 1
      }

      if (lastUpdated) updateBatchInState(lastUpdated)

      setBulkAddOpen(false)
      setBulkAddDraft("")
      addNotification({
        title: "Remarks added",
        description: `Applied the same remarks to ${savedCount} student${savedCount === 1 ? "" : "s"} in ${selectedBatch.code}.`,
        type: "system",
      })
    } catch (err: any) {
      addNotification({
        title: "Bulk add failed",
        description: err.message || "Could not save remarks for selected students.",
        type: "system",
      })
    } finally {
      setIsSavingBulkAdd(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!selectedBatch || selectedStudents.length === 0) return

    setIsSubmitting(true)
    try {
      let deletedCount = 0
      let lastUpdated: BatchOption | null = null

      for (const studentName of selectedStudents) {
        if (!getSavedRemark(studentName)) continue
        const updated = await api.updateBatchStudentRemarks(selectedBatch.id, studentName, "")
        lastUpdated = { ...selectedBatch, ...updated }
        deletedCount += 1
      }

      if (lastUpdated) updateBatchInState(lastUpdated)

      addNotification({
        title: deletedCount > 0 ? "Remarks deleted" : "Nothing to delete",
        description:
          deletedCount > 0
            ? `Cleared remarks for ${deletedCount} selected student${deletedCount === 1 ? "" : "s"}.`
            : "Selected students do not have saved remarks.",
        type: "system",
      })
    } catch (err: any) {
      addNotification({
        title: "Bulk delete failed",
        description: err.message || "Could not delete selected remarks.",
        type: "system",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const remarksWithContent = studentNames.filter((name) => getSavedRemark(name)).length

  if (!isTrainer && user?.role !== "owner") {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Remarks are managed by trainers per batch.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" icon={ArrowLeft} className="h-8 px-2">
                Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Batch Remarks
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage batch-wise notes per student. Add, edit, or delete remarks anytime.
          </p>
        </div>
      </div>

      <Card className="bg-card">
        <CardHeader className="pb-3 border-b border-border/40">
          <CardTitle className="text-base">Select Batch</CardTitle>
          <CardDescription>Choose a batch to view and manage student remarks.</CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-xs text-muted-foreground">Loading batches...</p>
          ) : batches.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active batches available.</p>
          ) : (
            <Select
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="h-9 text-xs max-w-md bg-card"
            >
              {batches.map((batch) => (
                <option key={batch.id} value={String(batch.id)}>
                  {batch.code} — {batch.courseName}
                </option>
              ))}
            </Select>
          )}
        </CardContent>
      </Card>

      {selectedBatch && (
        <Card className="bg-card overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/40 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{selectedBatch.code}</CardTitle>
                <Badge variant="outline">{selectedBatch.courseName}</Badge>
                <Badge variant="info" className="gap-1">
                  <Users className="h-3 w-3" />
                  {studentNames.length} students
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {remarksWithContent} with remarks
                </Badge>
              </div>
            </div>

            {studentNames.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleSelectAll}
                    className="rounded border-border/80 text-primary focus:ring-primary cursor-pointer"
                  />
                  Select all ({selectedStudents.length}/{studentNames.length})
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Plus}
                    onClick={openBulkAdd}
                    disabled={selectedStudents.length === 0 || isSubmitting || isSavingBulkAdd}
                  >
                    {allSelected ? "Add for All" : "Add Selected"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={Trash2}
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    onClick={() => void handleBulkDelete()}
                    isLoading={isSubmitting}
                    disabled={selectedStudents.length === 0 || isSubmitting}
                  >
                    Delete Selected
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-4 space-y-3">
            {studentNames.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No students enrolled in this batch yet.
              </p>
            ) : (
              studentNames.map((studentName) => {
                const remark = getSavedRemark(studentName)
                const hasRemark = remark.length > 0
                const isSelected = selectedStudents.includes(studentName)

                return (
                  <div
                    key={studentName}
                    className={cn(
                      "rounded-xl border transition-all",
                      isSelected ? "border-primary/30 bg-primary/5" : "border-border/60 bg-card"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleStudent(studentName)}
                          className="mt-1 rounded border-border/80 text-primary focus:ring-primary cursor-pointer shrink-0"
                          aria-label={`Select ${studentName}`}
                        />
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {studentInitials(studentName)}
                        </div>
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-foreground">{studentName}</p>
                            <Badge
                              variant={hasRemark ? "success" : "outline"}
                              className="text-[10px]"
                            >
                              {hasRemark ? "Has remarks" : "No remarks"}
                            </Badge>
                          </div>

                          {hasRemark ? (
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-6">
                              {remark}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              No trainer remarks added for this batch yet.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:shrink-0 sm:pt-1 pl-8 sm:pl-0">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={hasRemark ? Pencil : Plus}
                          onClick={() => openEdit(studentName)}
                          className="h-8 text-xs"
                        >
                          {hasRemark ? "Edit" : "Add"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Trash2}
                          onClick={() => setDeleteTarget(studentName)}
                          disabled={!hasRemark}
                          className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 disabled:opacity-40"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      <Dialog
        isOpen={bulkAddOpen}
        onClose={() => {
          if (!isSavingBulkAdd) {
            setBulkAddOpen(false)
            setBulkAddDraft("")
          }
        }}
        title={allSelected ? "Add Remarks for All Students" : "Add Remarks for Selected Students"}
        description={
          selectedBatch
            ? `Batch: ${selectedBatch.code} • ${selectedStudents.length} student${selectedStudents.length === 1 ? "" : "s"} selected`
            : undefined
        }
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <textarea
            value={bulkAddDraft}
            onChange={(e) => setBulkAddDraft(e.target.value)}
            placeholder="Write trainer remarks to apply to all selected students in this batch..."
            rows={10}
            disabled={isSavingBulkAdd}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            The same remark will be saved for each selected student. Existing remarks will be replaced.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              icon={X}
              onClick={() => {
                setBulkAddOpen(false)
                setBulkAddDraft("")
              }}
              disabled={isSavingBulkAdd}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={() => void handleBulkAdd()}
              isLoading={isSavingBulkAdd}
            >
              {allSelected ? "Add for All Students" : "Add for Selected"}
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!editTarget}
        onClose={() => {
          if (!isSavingEdit) {
            setEditTarget(null)
            setEditDraft("")
          }
        }}
        title={editTarget ? `${getSavedRemark(editTarget) ? "Edit" : "Add"} Remarks` : "Remarks"}
        description={
          editTarget
            ? `Batch: ${selectedBatch?.code} • Student: ${editTarget}`
            : undefined
        }
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <textarea
            value={editDraft}
            onChange={(e) => setEditDraft(e.target.value)}
            placeholder="Write trainer remarks for this student in this batch..."
            rows={10}
            disabled={isSavingEdit}
            className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            autoFocus
          />
          <p className="text-[11px] text-muted-foreground">
            Students will see this on their dashboard under Trainer Remarks for this batch.
          </p>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              icon={X}
              onClick={() => {
                setEditTarget(null)
                setEditDraft("")
              }}
              disabled={isSavingEdit}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={Save}
              onClick={() => void handleSaveEdit()}
              isLoading={isSavingEdit}
            >
              Save Remarks
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null)
        }}
        title="Delete Remarks"
        description={
          deleteTarget
            ? `Remove remarks for ${deleteTarget} in batch ${selectedBatch?.code}? This cannot be undone.`
            : undefined
        }
        dismissible={!isDeleting}
      >
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDeleteTarget(null)}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            icon={Trash2}
            onClick={() => void handleDelete()}
            isLoading={isDeleting}
          >
            Delete Remarks
          </Button>
        </div>
      </Dialog>
    </div>
  )
}
