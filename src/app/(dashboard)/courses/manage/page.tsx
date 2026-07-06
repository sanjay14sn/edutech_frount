"use client"

import * as React from "react"
import { BookOpen, Sparkles, Edit2, Trash2, ArrowLeft, Clock } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { useStore } from "@/store/useStore"
import { fetchAPI } from "@/lib/api"

interface Course {
  id: string
  _id?: string
  name: string
  code: string
  duration?: string
  fees: number
}

interface Batch {
  id: string
  courseName: string
}

export default function ManageCoursesPage() {
  const { addNotification } = useStore()
  const [courses, setCourses] = React.useState<Course[]>([])
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Edit Course Modal States
  const [isEditOpen, setIsEditOpen] = React.useState(false)
  const [selectedCourse, setSelectedCourse] = React.useState<Course | null>(null)
  const [editName, setEditName] = React.useState("")
  const [editCode, setEditCode] = React.useState("")
  const [editDuration, setEditDuration] = React.useState("")
  const [editFees, setEditFees] = React.useState("")

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [coursesData, batchesData] = await Promise.all([
        fetchAPI('/courses'),
        fetchAPI('/batches')
      ])
      setCourses(coursesData)
      setBatches(batchesData)
    } catch (error) {
      console.error("Failed to load courses data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    loadData()
  }, [])

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course)
    setEditName(course.name)
    setEditCode(course.code)
    setEditDuration(course.duration || "")
    setEditFees(String(course.fees))
    setIsEditOpen(true)
  }

  const handleUpdateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse) return

    const updatedData = {
      name: editName,
      code: editCode,
      duration: editDuration,
      fees: Number(editFees)
    }

    try {
      const updated = await fetchAPI(`/courses/${selectedCourse.id || selectedCourse._id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedData)
      })

      setCourses(courses.map(c => (c.id === selectedCourse.id || c._id === selectedCourse._id) ? updated : c))
      setIsEditOpen(false)
      addNotification({
        title: "Course Updated",
        description: `Course "${editName}" details have been updated successfully.`,
        type: "system"
      })
    } catch (error) {
      console.error("Failed to update course:", error)
      addNotification({
        title: "Error",
        description: "Failed to update course program.",
        type: "system"
      })
    }
  }

  const handleDeleteCourse = async (course: Course) => {
    const courseId = course.id || course._id
    if (!courseId) return

    const activeBatchesCount = batches.filter(b => b.courseName === course.name).length
    if (activeBatchesCount > 0) {
      alert(`Cannot delete "${course.name}" because it has ${activeBatchesCount} active batch(es). Please delete or re-assign the batches first.`)
      return
    }

    if (!confirm(`Are you sure you want to delete the course program "${course.name}" (${course.code})?`)) {
      return
    }

    try {
      await fetchAPI(`/courses/${courseId}`, {
        method: 'DELETE'
      })

      setCourses(courses.filter(c => c.id !== courseId && c._id !== courseId))
      addNotification({
        title: "Course Deleted",
        description: `Successfully deleted course program "${course.name}".`,
        type: "system"
      })
    } catch (error) {
      console.error("Failed to delete course:", error)
      addNotification({
        title: "Error",
        description: "Failed to delete course program.",
        type: "system"
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Back button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <button
            onClick={() => window.location.href = '/courses'}
            className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline cursor-pointer bg-transparent border-0 p-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Batches</span>
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 mt-1">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Manage Course Offerings</span>
          </h1>
          <p className="text-xs text-muted-foreground">
            Update pricing packages, durations, or delete inactive curriculum listings.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <Card className="bg-card">
          <CardContent className="p-0">
            <div className="overflow-visible">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                    <th className="p-4">Course Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Duration</th>
                    <th className="p-4">Tuition Fees</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {courses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground italic">
                        No courses registered in curriculum catalog.
                      </td>
                    </tr>
                  ) : (
                    courses.map((course) => {
                      const activeBatchesCount = batches.filter(b => b.courseName === course.name).length
                      const isActive = activeBatchesCount > 0

                      return (
                        <tr key={course.id || course._id} className="hover:bg-muted/30">
                          <td className="p-4 font-bold text-foreground">{course.name}</td>
                          <td className="p-4 font-mono text-muted-foreground">{course.code}</td>
                          <td className="p-4 text-muted-foreground">{course.duration || 'N/A'}</td>
                          <td className="p-4 font-semibold text-foreground">${course.fees}</td>
                          <td className="p-4">
                            {isActive ? (
                              <Badge variant="success" className="font-bold">
                                {activeBatchesCount} Active {activeBatchesCount === 1 ? 'Batch' : 'Batches'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-zinc-500 border-zinc-700/30 font-bold bg-zinc-950/20">
                                Inactive / Draft
                              </Badge>
                            )}
                          </td>
                          <td className="p-4 text-right flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(course)}
                              icon={Edit2}
                              className="h-8 w-8 p-0 text-primary border-primary/20 bg-primary/5 hover:bg-primary/10 cursor-pointer"
                              title="Edit Course Details"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteCourse(course)}
                              icon={Trash2}
                              disabled={isActive}
                              className={`h-8 w-8 p-0 text-red-500 border-red-500/20 bg-red-500/5 hover:bg-red-500/10 cursor-pointer ${isActive ? 'opacity-40 cursor-not-allowed' : ''}`}
                              title={isActive ? "Cannot delete course with active batches" : "Delete Course"}
                            />
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Course Modal Dialog */}
      <Dialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Course Program"
        description="Modify duration details, fees structure, or course title codes."
      >
        <form onSubmit={handleUpdateCourse} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Course Name</label>
            <Input
              placeholder="e.g. Mobile Application Development"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="bg-card text-xs h-9.5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Course Code</label>
              <Input
                placeholder="e.g. MAD-101"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                className="bg-card text-xs h-9.5"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Duration</label>
              <Input
                placeholder="e.g. 4 Months"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Tuition Fees ($)</label>
            <Input
              type="number"
              value={editFees}
              onChange={(e) => setEditFees(e.target.value)}
              className="bg-card text-xs h-9.5"
              required
            />
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
