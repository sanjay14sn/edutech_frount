"use client"

import * as React from "react"
import { BookOpen, Plus, Calendar, Clock, Users, Video, Edit, Trash2, CheckCircle2, ClipboardList } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { fetchAPI, api } from "@/lib/api"
import { studentNameInBatch } from "@/lib/lms"
import { useRouter, useSearchParams } from "next/navigation"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"


type BatchMode = "online" | "offline" | "recorded"
type BatchStatus = "active" | "completed"

export interface Batch {
  id: string
  code: string
  courseName: string
  trainerName: string
  schedule: string
  enrolled: number
  capacity: number
  meetLink?: string
  platform?: "gmeet" | "zoom" | "teams" | "discord"
  centerName?: string
  studentNames?: string[]
  mode?: BatchMode
  status?: BatchStatus
  completedAt?: string
  roomName?: string
  nextSessionDate?: string
  nextSessionTopic?: string
  nextSessionEndDate?: string
  sessions?: { topic: string; date: string; endDate?: string }[]
}

interface Student {
  id: string
  name: string
  email: string
  status: "active" | "completed" | "dropped"
}

const mockActiveStudents: Student[] = [
  { id: "s-101", name: "David Miller", email: "david.m@student.com", status: "active" },
  { id: "s-102", name: "Elena Rostova", email: "elena.r@student.com", status: "active" },
  { id: "s-103", name: "Hiroshi Tanaka", email: "hiroshi.t@student.com", status: "active" },
  { id: "s-104", name: "Chloe Dupont", email: "chloe.d@student.com", status: "active" },
  { id: "s-105", name: "Tariq Al-Mansoor", email: "tariq.a@student.com", status: "active" },
  { id: "s-106", name: "Emily Parker", email: "emily@apexacademy.com", status: "active" },
  { id: "s-107", name: "Lucas Vance", email: "lucas@vance.com", status: "active" }
]

const initialBatches: Batch[] = [
  {
    id: "b-1",
    code: "Apex-B12",
    courseName: "Fullstack Web Dev",
    trainerName: "Marcus Vance",
    schedule: "Mon, Wed, Fri • 09:00 AM - 10:30 AM",
    enrolled: 4,
    capacity: 30,
    meetLink: "https://meet.google.com/abc-defg-hij",
    platform: "gmeet",
    centerName: "Apex Downtown Hub",
    studentNames: ["David Miller", "Elena Rostova", "Emily Parker", "Chloe Dupont"],
    mode: "online"
  },
  {
    id: "b-2",
    code: "Apex-B14",
    courseName: "UI/UX Product Design",
    trainerName: "Samantha Cole",
    schedule: "Tue, Thu • 11:30 AM - 01:00 PM",
    enrolled: 3,
    capacity: 20,
    centerName: "Apex Tech Plaza",
    studentNames: ["Hiroshi Tanaka", "Tariq Al-Mansoor", "Elena Rostova"],
    mode: "offline",
    roomName: "Lab 201"
  },
  {
    id: "b-3",
    code: "Apex-B02",
    courseName: "Advanced Node.js API",
    trainerName: "Marcus Vance",
    schedule: "Mon, Wed • 03:00 PM - 04:30 PM",
    enrolled: 2,
    capacity: 30,
    meetLink: "https://teams.live.com/meet/948375920",
    platform: "teams",
    centerName: "Apex Downtown Hub",
    studentNames: ["Chloe Dupont", "Tariq Al-Mansoor"],
    mode: "online"
  },
  {
    id: "b-4",
    code: "Apex-B18",
    courseName: "Fullstack Web Dev",
    trainerName: "Marcus Vance",
    schedule: "Weekend • 10:00 AM - 01:00 PM",
    enrolled: 1,
    capacity: 25,
    centerName: "Apex Tech Plaza",
    studentNames: ["Emily Parker"],
    mode: "offline",
    roomName: "Studio A"
  }
]

const getPlatformDetails = (platform?: string) => {
  switch (platform) {
    case "gmeet":
      return { label: "Google Meet", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25" }
    case "zoom":
      return { label: "Zoom Room", color: "bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/25" }
    case "teams":
      return { label: "MS Teams Live", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/25" }
    case "discord":
      return { label: "Discord Guild", color: "bg-violet-500/10 text-violet-400 border-violet-500/20 hover:bg-violet-500/25" }
    default:
      return { label: "Virtual Class", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20 hover:bg-zinc-500/25" }
  }
}

const getModeDetails = (mode?: BatchMode) => {
  switch (mode) {
    case "offline":
      return { label: "Offline", className: "bg-amber-500/5 border-amber-500/20 text-amber-500" }
    case "recorded":
      return { label: "Recorded", className: "bg-fuchsia-500/5 border-fuchsia-500/20 text-fuchsia-500" }
    case "online":
    default:
      return { label: "Online", className: "bg-blue-500/5 border-blue-500/20 text-blue-500" }
  }
}

function parseSessionTime(date?: string, endDate?: string) {
  if (!date) return NaN
  const end = endDate ? new Date(endDate).getTime() : NaN
  if (!Number.isNaN(end)) return end
  return new Date(date).getTime()
}

function getUpcomingSession(batch: Batch): { topic: string; date: string; endDate?: string } | null {
  const candidates: { topic: string; date: string; endDate?: string }[] = []

  if (batch.nextSessionTopic?.trim() && batch.nextSessionDate) {
    candidates.push({
      topic: batch.nextSessionTopic.trim(),
      date: batch.nextSessionDate,
      endDate: batch.nextSessionEndDate,
    })
  }

  for (const session of batch.sessions || []) {
    if (session.topic?.trim() && session.date) {
      candidates.push({
        topic: session.topic.trim(),
        date: session.date,
        endDate: session.endDate,
      })
    }
  }

  const now = Date.now()
  const upcoming = candidates
    .map((session) => ({
      session,
      sortTime: new Date(session.date).getTime(),
      expiresAt: parseSessionTime(session.date, session.endDate),
    }))
    .filter(({ sortTime, expiresAt }) => !Number.isNaN(sortTime) && expiresAt >= now)
    .sort((a, b) => a.sortTime - b.sortTime)

  return upcoming[0]?.session ?? null
}

function formatSessionDateTime(date: string) {
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
}

export default function CoursesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, addNotification, activeTenant } = useStore()
  const isTrainer = user?.role === "trainer"
  const isAdmin = user?.role === "owner" || user?.role === "super_admin"
  const { allowTrainerDeleteBatch } = useCenterPolicy()
  const canDeleteBatch = isAdmin || (isTrainer && allowTrainerDeleteBatch)
  const [batches, setBatches] = React.useState<Batch[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [pageLoading, setPageLoading] = React.useState(true)
  const [isAddOpen, setIsAddOpen] = React.useState(false)
  const [isCourseAddOpen, setIsCourseAddOpen] = React.useState(false)
  const [dialogView, setDialogView] = React.useState<"form" | "students">("form")
  const [studentSearchQuery, setStudentSearchQuery] = React.useState("")
  const [activeStudentsList, setActiveStudentsList] = React.useState<Student[]>([])
  const [trainers, setTrainers] = React.useState<any[]>([])
  const [centersList, setCentersList] = React.useState<string[]>([])

  const applyCentersForUser = React.useCallback(
    (centersData: any[]) => {
      if (!centersData?.length) {
        setCentersList([])
        return
      }

      let filtered = centersData
      if (user?.role !== "super_admin") {
        const tenantKey = (user?.tenantId || activeTenant?.name || "").trim().toLowerCase()
        if (tenantKey) {
          filtered = centersData.filter(
            (center: any) => (center.tenantName || "").trim().toLowerCase() === tenantKey
          )
        }
      }

      const names = filtered.map((center: any) => center.name).filter(Boolean)
      setCentersList(names)
      if (names[0]) {
        setSelectedCenterName(names[0])
      } else if (user?.tenantId) {
        setSelectedCenterName(user.tenantId.trim())
      }
    },
    [user?.role, user?.tenantId, activeTenant?.name]
  )

  React.useEffect(() => {
    const loadData = async () => {
      try {
        setPageLoading(true)
        const [batchesData, coursesData, trainersData, studentsData, centersData] = await Promise.all([
          fetchAPI('/batches'),
          fetchAPI('/courses'),
          isTrainer ? Promise.resolve([]) : fetchAPI('/trainers').catch(() => []),
          isTrainer ? api.getTrainerStudents().catch(() => []) : fetchAPI('/students').catch(() => []),
          isAdmin ? fetchAPI('/centers').catch(() => []) : Promise.resolve([])
        ]);
        setBatches(batchesData);
        setCourses(coursesData);
        
        if (coursesData.length > 0) {
          setCourseName(coursesData[0].name);
        }
        
        if (trainersData && trainersData.length > 0) {
          setTrainers(trainersData);
          setTrainerName(trainersData[0].name);
        }
        
        if (studentsData && studentsData.length > 0) {
          const activeSts = studentsData
            .filter((st: any) => st.status === 'active')
            .map((st: any) => ({
              id: st.id || st._id,
              name: st.name,
              email: st.email,
              status: st.status
            }));
          if (activeSts.length > 0) {
            setActiveStudentsList(activeSts);
          }
        }

        applyCentersForUser(centersData || [])
      } catch (error) {
        console.error("Failed to fetch courses and batches:", error);
      } finally {
        setPageLoading(false);
      }
    };
    loadData();
  }, [applyCentersForUser, isTrainer, isAdmin]);

  // Find allocated batches and courses for the user role:
  const displayedBatches = React.useMemo(() => {
    if (!user) return []
    if (user.role === 'student') {
      return batches.filter((batch) => studentNameInBatch(batch, user.name || ""))
    }
    return batches
  }, [batches, user])

  const [showCompletedBatches, setShowCompletedBatches] = React.useState(false)

  const activeBatches = React.useMemo(
    () => displayedBatches.filter((batch) => batch.status !== "completed"),
    [displayedBatches]
  )

  const completedBatches = React.useMemo(
    () => displayedBatches.filter((batch) => batch.status === "completed"),
    [displayedBatches]
  )

  const visibleBatches = React.useMemo(
    () => (showCompletedBatches ? [...activeBatches, ...completedBatches] : activeBatches),
    [activeBatches, completedBatches, showCompletedBatches]
  )

  // Form states for batch
  const [editingBatch, setEditingBatch] = React.useState<Batch | null>(null)
  const [code, setCode] = React.useState("")
  const [courseName, setCourseName] = React.useState("")
  const [trainerName, setTrainerName] = React.useState("Marcus Vance")
  const [schedule, setSchedule] = React.useState("")
  const [capacity, setCapacity] = React.useState("25")
  const [meetLink, setMeetLink] = React.useState("")
  const [platform, setPlatform] = React.useState<"gmeet" | "zoom" | "teams" | "discord">("gmeet")
  const [selectedCenterName, setSelectedCenterName] = React.useState("Apex Downtown Hub")
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([])
  const [mode, setMode] = React.useState<BatchMode>("online")
  const [roomName, setRoomName] = React.useState("")
  const [nextSessionDate, setNextSessionDate] = React.useState("")
  const [nextSessionTopic, setNextSessionTopic] = React.useState("")
  const [nextSessionEndDate, setNextSessionEndDate] = React.useState("")

  // Form states for course
  const [newCourseName, setNewCourseName] = React.useState("")
  const [newCourseCode, setNewCourseCode] = React.useState("")
  const [newCourseDuration, setNewCourseDuration] = React.useState("3 Months")
  const [newCourseFees, setNewCourseFees] = React.useState("1200")

  const openAddCourseDialog = React.useCallback(() => {
    setNewCourseName("")
    setNewCourseCode("")
    setNewCourseDuration("3 Months")
    setNewCourseFees("1200")
    setIsCourseAddOpen(true)
  }, [])

  React.useEffect(() => {
    if (pageLoading || !isAdmin) return
    if (searchParams.get("action") !== "add-course") return
    openAddCourseDialog()
    router.replace("/courses", { scroll: false })
  }, [pageLoading, isAdmin, searchParams, openAddCourseDialog, router])

  React.useEffect(() => {
    if (centersList[0]) {
      setSelectedCenterName(centersList[0])
    }
  }, [centersList])

  const handleAddBatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !schedule) return

    const enrolledStudents = activeStudentsList
      .filter((st) => selectedStudentIds.includes(st.id))
      .map((st) => st.name)

    const sessions = nextSessionTopic && nextSessionDate
      ? [{ topic: nextSessionTopic, date: nextSessionDate, endDate: nextSessionEndDate || undefined }]
      : []

    const batchDataPayload = {
      code,
      courseName,
      trainerName,
      schedule,
      enrolled: enrolledStudents.length,
      capacity: Number(capacity),
      meetLink: mode === "online" || mode === "recorded" ? (meetLink || undefined) : undefined,
      platform: mode === "online" && meetLink ? platform : undefined,
      centerName: selectedCenterName,
      studentNames: enrolledStudents,
      mode,
      roomName: mode === "offline" ? roomName : undefined,
      nextSessionDate: nextSessionDate || undefined,
      nextSessionTopic: nextSessionTopic || undefined,
      nextSessionEndDate: nextSessionEndDate || undefined,
      sessions
    }

    try {
      if (editingBatch) {
        // Update existing batch
        const updatedBatch = await fetchAPI(`/batches/${editingBatch.id}`, {
          method: 'PUT',
          body: JSON.stringify(batchDataPayload)
        });

        // Ensure id matches _id or id
        const normalizedBatch = { ...updatedBatch, id: updatedBatch._id || updatedBatch.id };
        setBatches(batches.map(b => b.id === editingBatch.id ? normalizedBatch : b))
        addNotification({
          title: "Batch Updated",
          description: `Batch ${code} has been successfully updated.`,
          type: "admissions"
        })
      } else {
        // Create new batch
        const createdBatch = await fetchAPI('/batches', {
          method: 'POST',
          body: JSON.stringify(batchDataPayload)
        });

        const normalizedBatch = { ...createdBatch, id: createdBatch._id || createdBatch.id };
        setBatches([normalizedBatch, ...batches])
        addNotification({
          title: "Batch Created",
          description: `New ${mode} batch ${code} has been registered at ${selectedCenterName}.`,
          type: "admissions"
        })
      }

      // Reset Form & Dialog
      setIsAddOpen(false)
      setEditingBatch(null)
      setCode("")
      setSchedule("")
      setMeetLink("")
      setPlatform("gmeet")
      setSelectedStudentIds([])
      setMode("online")
      setRoomName("")
      setNextSessionDate("")
      setNextSessionTopic("")
      setNextSessionEndDate("")
      setDialogView("form")
      if (centersList[0]) {
        setSelectedCenterName(centersList[0])
      }
    } catch (error: any) {
      console.error("Failed to save batch:", error);
      addNotification({
        title: "Error Saving Batch",
        description: error.message || "Failed to save batch. Please try again.",
        type: "system"
      })
      alert(error.message || "Failed to save batch. Please try again.");
    }
  }

  const handleOpenEditBatch = (batch: Batch) => {
    setEditingBatch(batch)
    setCode(batch.code)
    setCourseName(batch.courseName)
    setTrainerName(batch.trainerName)
    setSchedule(batch.schedule)
    setCapacity(String(batch.capacity))
    setMeetLink(batch.meetLink || "")
    setPlatform(batch.platform || "gmeet")
    setSelectedCenterName(batch.centerName || "")
    setMode(batch.mode || "online")
    setRoomName(batch.roomName || "")
    setNextSessionDate(batch.nextSessionDate || "")
    setNextSessionTopic(batch.nextSessionTopic || "")
    setNextSessionEndDate(batch.nextSessionEndDate || "")

    // Map enrolled student names to IDs
    const studentIds = activeStudentsList
      .filter(st => batch.studentNames?.includes(st.name))
      .map(st => st.id)
    setSelectedStudentIds(studentIds)

    setDialogView("form")
    setIsAddOpen(true)
  }

  const handleDeleteBatch = async (batch: Batch) => {
    if (!window.confirm(`Are you sure you want to delete batch "${batch.code}"?`)) {
      return
    }
    try {
      await fetchAPI(`/batches/${batch.id}`, { method: 'DELETE' })
      setBatches(batches.filter(b => b.id !== batch.id))
      addNotification({
        title: "Batch Deleted",
        description: `Batch "${batch.code}" was removed.`,
        type: "admissions"
      })
    } catch (error: any) {
      console.error("Failed to delete batch:", error)
      alert(error.message || "Failed to delete batch.")
    }
  }

  const handleUpdateBatchStatus = async (batch: Batch, status: BatchStatus) => {
    const actionLabel = status === "completed" ? "mark this batch as completed" : "reopen this batch"
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) {
      return
    }

    try {
      const updatedBatch = await fetchAPI(`/batches/${batch.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      })
      const normalizedBatch = { ...updatedBatch, id: updatedBatch._id || updatedBatch.id }
      setBatches(batches.map((b) => (b.id === batch.id ? normalizedBatch : b)))
      addNotification({
        title: status === "completed" ? "Batch Completed" : "Batch Reopened",
        description:
          status === "completed"
            ? `Batch "${batch.code}" is marked as completed. Live sessions are closed.`
            : `Batch "${batch.code}" is active again.`,
        type: "admissions",
      })
    } catch (error: any) {
      console.error("Failed to update batch status:", error)
      alert(error.message || "Failed to update batch status.")
    }
  }

  const handleAddCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCourseName || !newCourseCode) return

    const newCourseData = {
      name: newCourseName,
      code: newCourseCode,
      duration: newCourseDuration,
      fees: Number(newCourseFees)
    }

    try {
      const createdCourse = await fetchAPI('/courses', {
        method: 'POST',
        body: JSON.stringify(newCourseData)
      });

      setCourses([createdCourse, ...courses])
      setIsCourseAddOpen(false)
      addNotification({
        title: "Course Program Created",
        description: `New course program ${newCourseName} (${newCourseCode}) has been registered successfully.`,
        type: "system"
      })

      setNewCourseName("")
      setNewCourseCode("")
      setNewCourseDuration("3 Months")
      setNewCourseFees("1200")
      if (!courseName) {
        setCourseName(newCourseName)
      }
    } catch (error) {
      console.error("Failed to create course program:", error);
      addNotification({
        title: "Error",
        description: "Failed to create course program. Please try again.",
        type: "system"
      })
    }
  }

  if (pageLoading) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 px-4">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <p className="text-xs text-muted-foreground">Loading courses and batches...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>Courses & Batches</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTrainer
              ? "Your assigned batches, schedules, live session links, and enrolled students."
              : "Overview of course syllabus offerings, class capacities, schedules, and teacher assignments."}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" icon={Plus} onClick={openAddCourseDialog}>
              Add Course Program
            </Button>
            <Button variant="outline" size="sm" icon={Plus} onClick={() => {
              setEditingBatch(null)
              setCode("")
              setCourseName(courses[0]?.name || "")
              setTrainerName(trainers[0]?.name || "Marcus Vance")
              setSchedule("")
              setCapacity("25")
              setMeetLink("")
              setPlatform("gmeet")
              if (centersList[0]) {
                setSelectedCenterName(centersList[0])
              }
              setMode("online")
              setRoomName("")
              setNextSessionDate("")
              setNextSessionTopic("")
              setNextSessionEndDate("")
              setSelectedStudentIds([])
              setDialogView("form")
              setIsAddOpen(true)
            }}>
              Create Batch
            </Button>
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {activeBatches.length} active batch{activeBatches.length === 1 ? "" : "es"}
            {completedBatches.length > 0 && !showCompletedBatches
              ? ` · ${completedBatches.length} completed hidden`
              : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCompletedBatches((prev) => !prev)}
              className="text-xs"
              icon={CheckCircle2}
            >
              {showCompletedBatches
                ? "Hide Completed"
                : `Completed Batches${completedBatches.length > 0 ? ` (${completedBatches.length})` : ""}`}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/courses/manage")}
              className="text-xs"
            >
              Manage Course Programs
            </Button>
          </div>
        </div>
      )}

      {/* Batch List */}
      <Card className="bg-card">
        <CardHeader className="border-b border-border/40 pb-3">
          <CardTitle className="text-sm font-bold">Training Batches</CardTitle>
          <CardDescription className="text-xs">
            Active class cohorts with schedules, enrollment, and session links.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {visibleBatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/80">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                {user?.role === "student" ? "No batch assigned" : "No active class batches"}
              </p>
              <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
                {user?.role === "student"
                  ? "Your class schedule and live session links will appear here after batch allocation."
                  : completedBatches.length > 0 && !showCompletedBatches
                    ? "You have completed batches. Use Show Completed Batches above to view them."
                    : "Create a batch to assign trainers, schedules, and enrolled students."}
              </p>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 h-8 text-xs"
                  icon={Plus}
                  onClick={() => {
                    setEditingBatch(null)
                    setCode("")
                    setCourseName(courses[0]?.name || "")
                    setTrainerName(trainers[0]?.name || "Marcus Vance")
                    setSchedule("")
                    setCapacity("25")
                    setMeetLink("")
                    setPlatform("gmeet")
                    if (centersList[0]) {
                      setSelectedCenterName(centersList[0])
                    }
                    setMode("online")
                    setRoomName("")
                    setNextSessionDate("")
                    setNextSessionTopic("")
                    setNextSessionEndDate("")
                    setSelectedStudentIds([])
                    setDialogView("form")
                    setIsAddOpen(true)
                  }}
                >
                  Create Batch
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                    <th className="p-4 min-w-[160px]">Batch</th>
                    <th className="p-4 min-w-[120px]">Schedule</th>
                    <th className="p-4 min-w-[100px]">Instructor</th>
                    <th className="p-4 min-w-[90px]">Campus</th>
                    {user?.role !== "student" && <th className="p-4 min-w-[120px]">Enrollment</th>}
                    <th className="p-4 min-w-[160px]">Upcoming Session</th>
                    {(isAdmin || isTrainer) && <th className="p-4 text-right min-w-[140px]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {visibleBatches.map((batch) => {
                    const occupancyRate = (batch.enrolled / batch.capacity) * 100
                    const isFull = batch.enrolled >= batch.capacity
                    const isCompleted = batch.status === "completed"
                    const platformDetails = getPlatformDetails(batch.platform)
                    const upcomingSession = getUpcomingSession(batch)

                    return (
                      <tr key={batch.id} className="hover:bg-muted/30 transition-colors align-top">
                        <td className="p-4">
                          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate max-w-[180px]">
                            {batch.courseName}
                          </p>
                          <p className="font-bold text-foreground mt-0.5">{batch.code}</p>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {batch.schedule}
                          </span>
                        </td>
                        <td className="p-4 text-foreground">{batch.trainerName}</td>
                        <td className="p-4 text-muted-foreground">{batch.centerName || "—"}</td>
                        {user?.role !== "student" && (
                          <td className="p-4">
                            <div className="space-y-1.5 min-w-[110px]">
                              <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>{batch.enrolled}/{batch.capacity}</span>
                                <span>{occupancyRate.toFixed(0)}%</span>
                              </div>
                              <div className="h-1 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${isFull ? "bg-red-500" : "bg-primary"}`}
                                  style={{ width: `${occupancyRate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        )}
                        <td className="p-4">
                          {isCompleted ? (
                            <span className="text-muted-foreground">—</span>
                          ) : upcomingSession ? (
                            <div className="space-y-1">
                              <div className="space-y-0.5">
                                <p className="font-medium text-foreground">{upcomingSession.topic}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {formatSessionDateTime(upcomingSession.date)}
                                </p>
                              </div>
                              {user?.role === "student" && batch.meetLink && batch.mode !== "offline" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => window.open(batch.meetLink, "_blank", "noopener,noreferrer")}
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  Join Session
                                </Button>
                              )}
                            </div>
                          ) : batch.mode === "offline" ? (
                            <span className="text-muted-foreground">Room {batch.roomName || "TBD"}</span>
                          ) : (
                            <span className="text-muted-foreground">No upcoming session</span>
                          )}
                        </td>
                        {(isAdmin || isTrainer) && (
                          <td className="p-4">
                            <div className="flex items-center justify-end gap-1 flex-wrap">
                              {!isCompleted && upcomingSession && batch.meetLink && batch.mode !== "offline" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px] px-2"
                                  onClick={() => window.open(batch.meetLink, "_blank", "noopener,noreferrer")}
                                >
                                  <Video className="h-3.5 w-3.5" />
                                  {platformDetails.label}
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => router.push(`/courses/batches/${batch.id}`)}
                                title={isTrainer ? "Manage Batch" : "Edit Batch"}
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              {isTrainer && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => router.push(`/lms/home?batch=${batch.id}`)}
                                    title="Open LMS"
                                  >
                                    <BookOpen className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => router.push(`/attendance?batch=${batch.id}`)}
                                    title="Attendance"
                                  >
                                    <ClipboardList className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
                              {canDeleteBatch && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleDeleteBatch(batch)}
                                  title="Delete Batch"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              {isAdmin && (
                                isCompleted ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] px-2"
                                    onClick={() => handleUpdateBatchStatus(batch, "active")}
                                  >
                                    Reopen
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-[10px] px-2"
                                    onClick={() => handleUpdateBatchStatus(batch, "completed")}
                                  >
                                    Complete
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Batch Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title={
          dialogView === "form"
            ? editingBatch
              ? "Edit Training Batch"
              : "Create Training Batch"
            : "Select Cohort Students"
        }
        description={
          dialogView === "form"
            ? editingBatch
              ? "Modify details and schedule next session for this training batch."
              : "Configure schedules and capacities for a new student cohort."
            : "Filter and select active student profiles to enroll in this batch."
        }
      >
        {dialogView === "form" ? (
          <form onSubmit={handleAddBatch} className="space-y-4">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Batch Code</label>
                <Input
                  placeholder="e.g. Apex-B20"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="bg-card text-xs h-9.5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Training Campus / Center</label>
                {user?.role === "super_admin" && centersList.length > 1 ? (
                  <Select
                    value={selectedCenterName}
                    onChange={(e) => setSelectedCenterName(e.target.value)}
                    className="bg-card text-xs h-9.5"
                  >
                    {centersList.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Select>
                ) : (
                  <div className="h-9.5 flex items-center rounded-md border border-border/70 bg-muted/20 px-3 text-xs font-medium text-foreground">
                    {selectedCenterName || user?.tenantId || "—"}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Course Program</label>
                <Select
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="bg-card text-xs h-9.5"
                >
                  {courses.map((course) => (
                    <option key={course.id || course._id} value={course.name}>
                      {course.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Class Capacity</label>
                <Input
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  className="bg-card text-xs h-9.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Assigned Trainer</label>
                <Select
                  value={trainerName}
                  onChange={(e) => setTrainerName(e.target.value)}
                  className="bg-card text-xs h-9.5"
                >
                  {trainers.map((t) => (
                    <option key={t.id || t.name} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Weekly Timetable</label>
                <Input
                  placeholder="Mon, Wed • 09:00 AM"
                  value={schedule}
                  onChange={(e) => setSchedule(e.target.value)}
                  className="bg-card text-xs h-9.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Class Delivery Mode</label>
                <Select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as BatchMode)}
                  className="bg-card text-xs h-9.5"
                >
                  <option value="online">Online Class</option>
                  <option value="offline">Offline / In-Person</option>
                  <option value="recorded">Recorded Mode</option>
                </Select>
              </div>
              
              {mode === "online" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Virtual Class Link</label>
                  <Input
                    placeholder="https://meet.google.com/..."
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    className="bg-card text-xs h-9.5"
                  />
                </div>
              ) : mode === "offline" ? (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Classroom / Room Code</label>
                  <Input
                    placeholder="e.g. Lab 201, Room 104"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="bg-card text-xs h-9.5"
                  />
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Recorded Content URL</label>
                  <Input
                    placeholder="https://lms.example.com/recordings/..."
                    value={meetLink}
                    onChange={(e) => setMeetLink(e.target.value)}
                    className="bg-card text-xs h-9.5"
                  />
                </div>
              )}
            </div>

            {mode === "online" && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Meeting Platform</label>
                <Select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as "gmeet" | "zoom" | "teams" | "discord")}
                  className="bg-card text-xs h-9.5"
                >
                  <option value="gmeet">Google Meet</option>
                  <option value="zoom">Zoom</option>
                  <option value="teams">Microsoft Teams</option>
                  <option value="discord">Discord</option>
                </Select>
              </div>
            )}

            {/* Next Session Scheduling */}
            <div className="pt-2.5 border-t border-border/40 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Calendar className="h-4 w-4 text-primary" />
                <span>Next Session Scheduling</span>
              </h4>
              <div className="grid grid-cols-3 gap-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Next Session Topic</label>
                  <Input
                    placeholder="e.g. Hooks, API Routing, etc."
                    value={nextSessionTopic}
                    onChange={(e) => setNextSessionTopic(e.target.value)}
                    className="bg-card text-xs h-9.5 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Next Session Start Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={nextSessionDate}
                    onChange={(e) => setNextSessionDate(e.target.value)}
                    className="bg-card text-xs h-9.5 text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Next Session End Date & Time</label>
                  <Input
                    type="datetime-local"
                    value={nextSessionEndDate}
                    onChange={(e) => setNextSessionEndDate(e.target.value)}
                    className="bg-card text-xs h-9.5 text-foreground"
                  />
                </div>
              </div>
            </div>

            {/* Student Selector Trigger Button */}
            <div className="space-y-1.5 pt-2.5 border-t border-border/40">
              <label className="text-xs font-semibold text-muted-foreground block">Cohort Enrollment</label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStudentSearchQuery("")
                  setDialogView("students")
                }}
                className="w-full justify-between h-9.5 text-xs text-left bg-card hover:bg-muted border-border/60 text-foreground"
              >
                <span className="text-muted-foreground">
                  {selectedStudentIds.length === 0
                    ? "No students selected"
                    : `${selectedStudentIds.length} student(s) selected`}
                </span>
                <span className="text-primary font-semibold flex items-center gap-1.5">
                  <span>Select Students</span>
                  <span>&rarr;</span>
                </span>
              </Button>
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                {editingBatch ? "Save Changes" : "Create Batch"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setDialogView("form")}
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>&larr;</span>
                <span>Back to Batch Form</span>
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(activeStudentsList.map(s => s.id))}
                  className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-border">|</span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            <Input
              placeholder="Search students by name or email..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="bg-card text-xs h-9.5"
            />

            <div className="max-h-60 overflow-y-auto border border-border bg-muted/30 rounded-xl p-2.5 space-y-1.5">
              {activeStudentsList
                .filter((st) => {
                  const query = studentSearchQuery.toLowerCase()
                  return st.name.toLowerCase().includes(query) || st.email.toLowerCase().includes(query)
                })
                .map((st) => {
                  const isSelected = selectedStudentIds.includes(st.id)
                  return (
                    <label
                      key={st.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/5 text-foreground animate-scale-in"
                          : "border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id))
                            } else {
                              setSelectedStudentIds([...selectedStudentIds, st.id])
                            }
                          }}
                          className="rounded border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                        />
                        <div className="text-xs">
                          <p className="font-bold text-foreground">{st.name}</p>
                          <p className="text-[10px] text-muted-foreground">{st.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[9px] text-emerald-500 border-emerald-500/20 bg-emerald-500/10 py-0.5 px-2">
                        Active
                      </Badge>
                    </label>
                  )
                })}
            </div>

            <div className="pt-3 border-t border-border/50 flex justify-end">
              <Button variant="primary" size="sm" onClick={() => setDialogView("form")}>
                Confirm Selection ({selectedStudentIds.length})
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog
        isOpen={isCourseAddOpen}
        onClose={() => setIsCourseAddOpen(false)}
        title="Add Course Program"
        description="Configure details for a new course or program offering."
      >
        <form onSubmit={handleAddCourse} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Course Name</label>
            <Input
              placeholder="e.g. Mobile Application Development"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              className="bg-card text-xs h-9.5"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Course Code</label>
              <Input
                placeholder="e.g. MAD-101"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="bg-card text-xs h-9.5"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Duration</label>
              <Input
                placeholder="e.g. 4 Months"
                value={newCourseDuration}
                onChange={(e) => setNewCourseDuration(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Tuition Fees ($)</label>
            <Input
              type="number"
              value={newCourseFees}
              onChange={(e) => setNewCourseFees(e.target.value)}
              className="bg-card text-xs h-9.5"
              required
            />
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCourseAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Course
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
