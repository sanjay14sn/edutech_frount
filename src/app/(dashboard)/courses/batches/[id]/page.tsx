"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, Calendar, Clock, UserCheck, Users, Sparkles,
  Video, ExternalLink, MapPin, Save, BookOpen, ShieldAlert,
  Search, Check, Info, AlertTriangle, Monitor, PlayCircle, Eye,
  CheckCircle2, RotateCcw
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Select } from "@/components/ui/Select"
import { useStore } from "@/store/useStore"
import { fetchAPI, api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { defaultSessionEndFromStart, formatSessionTimeRange } from "@/lib/sessionUtils"

type BatchMode = "online" | "offline" | "recorded"
type BatchStatus = "active" | "completed"

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

export default function EditBatchPage() {
  const router = useRouter()
  const params = useParams()
  const batchId = params.id as string

  const { user, addNotification, activeTenant } = useStore()
  const isTrainer = user?.role === "trainer"
  const isAdmin = user?.role === "owner" || user?.role === "super_admin"

  React.useEffect(() => {
    if (user && user.role === "student") {
      router.replace("/courses")
    }
  }, [user, router])

  // Data lists from API
  const [courses, setCourses] = React.useState<any[]>([])
  const [trainers, setTrainers] = React.useState<any[]>([])
  const [centersList, setCentersList] = React.useState<string[]>([])
  const [activeStudentsList, setActiveStudentsList] = React.useState<Student[]>(mockActiveStudents)

  // Loading and Error States
  const [isLoading, setIsLoading] = React.useState(true)
  const [errorMsg, setErrorMsg] = React.useState("")
  const [isSaving, setIsSaving] = React.useState(false)

  // Form Fields
  const [code, setCode] = React.useState("")
  const [courseName, setCourseName] = React.useState("")
  const [trainerName, setTrainerName] = React.useState("")
  const [schedule, setSchedule] = React.useState("")
  const [capacity, setCapacity] = React.useState("25")
  const [meetLink, setMeetLink] = React.useState("")
  const [platform, setPlatform] = React.useState<"gmeet" | "zoom" | "teams" | "discord">("gmeet")
  const [selectedCenterName, setSelectedCenterName] = React.useState("")
  const [selectedStudentIds, setSelectedStudentIds] = React.useState<string[]>([])
  const [mode, setMode] = React.useState<BatchMode>("online")
  const [roomName, setRoomName] = React.useState("")
  const [nextSessionDate, setNextSessionDate] = React.useState("")
  const [nextSessionTopic, setNextSessionTopic] = React.useState("")
  const [sessions, setSessions] = React.useState<{ topic: string; date: string; endDate?: string }[]>([])
  const [batchStatus, setBatchStatus] = React.useState<BatchStatus>("active")
  const [completedAt, setCompletedAt] = React.useState<string | null>(null)
  const [isUpdatingStatus, setIsUpdatingStatus] = React.useState(false)

  // Student Search
  const [studentSearchQuery, setStudentSearchQuery] = React.useState("")

  React.useEffect(() => {
    const loadBatchAndData = async () => {
      try {
        setIsLoading(true)
        setErrorMsg("")

        const [batchData, coursesData, trainersData, studentsData, centersData] = await Promise.all([
          fetchAPI(`/batches/${batchId}`),
          fetchAPI('/courses'),
          isTrainer ? Promise.resolve([]) : fetchAPI('/trainers').catch(() => []),
          isTrainer ? api.getTrainerStudents().catch(() => []) : fetchAPI('/students').catch(() => []),
          isAdmin ? fetchAPI('/centers').catch(() => []) : Promise.resolve([])
        ])

        // Set catalog selections
        setCourses(coursesData)
        
        const trainersList = trainersData && trainersData.length > 0 ? trainersData : [{ name: "Marcus Vance" }, { name: "Samantha Cole" }]
        setTrainers(trainersList)

        const centersFiltered =
          user?.role === "super_admin"
            ? centersData || []
            : (centersData || []).filter(
                (center: any) =>
                  (center.tenantName || "").trim().toLowerCase() ===
                  (user?.tenantId || activeTenant?.name || "").trim().toLowerCase()
              )

        const centers =
          centersFiltered.length > 0
            ? centersFiltered.map((c: any) => c.name)
            : user?.tenantId
              ? [user.tenantId.trim()]
              : []
        setCentersList(centers)

        // Process student list
        let formattedStudents = mockActiveStudents
        if (studentsData && studentsData.length > 0) {
          formattedStudents = studentsData
            .filter((st: any) => st.status === 'active')
            .map((st: any) => ({
              id: st.id || st._id,
              name: st.name,
              email: st.email,
              status: st.status
            }))
          setActiveStudentsList(formattedStudents)
        }

        // Hydrate batch data
        if (batchData) {
          setCode(batchData.code || "")
          setCourseName(batchData.courseName || "")
          setTrainerName(batchData.trainerName || "")
          setSchedule(batchData.schedule || "")
          setCapacity(String(batchData.capacity || 25))
          setMeetLink(batchData.meetLink || "")
          setPlatform(batchData.platform || "gmeet")
          setSelectedCenterName(batchData.centerName || "")
          setMode(batchData.mode || "online")
          setRoomName(batchData.roomName || "")
          setNextSessionDate(batchData.nextSessionDate || "")
          setNextSessionTopic(batchData.nextSessionTopic || "")
          setSessions(batchData.sessions || [])
          setBatchStatus(batchData.status === "completed" ? "completed" : "active")
          setCompletedAt(batchData.completedAt || null)

          // Map student names to internal IDs
          const studentIds = formattedStudents
            .filter(st => batchData.studentNames?.includes(st.name))
            .map(st => st.id)
          setSelectedStudentIds(studentIds)
        }
      } catch (err: any) {
        console.error("Failed to load edit batch data:", err)
        setErrorMsg(err.message || "Failed to retrieve batch configuration from the server.")
      } finally {
        setIsLoading(false)
      }
    }

    loadBatchAndData()
  }, [batchId, user?.role, user?.tenantId, activeTenant?.name])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || !schedule) {
      alert("Please fill in the Batch Code and Weekly Timetable.")
      return
    }

    setIsSaving(true)
    const enrolledStudents = activeStudentsList
      .filter((st) => selectedStudentIds.includes(st.id))
      .map((st) => st.name)

    const firstSession = sessions[0]
    const payload = {
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
      nextSessionDate: firstSession ? (firstSession.date || undefined) : undefined,
      nextSessionTopic: firstSession ? (firstSession.topic || undefined) : undefined,
      sessions
    }

    try {
      await fetchAPI(`/batches/${batchId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      })

      addNotification({
        title: "Batch Configuration Saved",
        description: `Successfully updated settings for training cohort "${code}".`,
        type: "admissions"
      })

      router.push("/courses")
    } catch (err: any) {
      console.error("Failed to save batch:", err)
      alert(err.message || "Failed to save changes. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleBatchStatus = async () => {
    const nextStatus: BatchStatus = batchStatus === "completed" ? "active" : "completed"
    const actionLabel = nextStatus === "completed" ? "mark this batch as completed" : "reopen this batch"
    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) {
      return
    }

    setIsUpdatingStatus(true)
    try {
      const updated = await fetchAPI(`/batches/${batchId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      })
      setBatchStatus(updated.status === "completed" ? "completed" : "active")
      setCompletedAt(updated.completedAt || null)
      addNotification({
        title: nextStatus === "completed" ? "Batch Completed" : "Batch Reopened",
        description:
          nextStatus === "completed"
            ? `Batch "${code}" is marked as completed.`
            : `Batch "${code}" is active again.`,
        type: "admissions",
      })
    } catch (err: any) {
      alert(err.message || "Failed to update batch status.")
    } finally {
      setIsUpdatingStatus(false)
    }
  }

  // Generate initials for avatars
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center py-32 space-y-4">
        <div className="h-8 w-8 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider animate-pulse">
          Loading Batch Workspace...
        </p>
      </div>
    )
  }

  if (errorMsg || !code) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-md mx-auto">
        <ShieldAlert className="h-12 w-12 text-red-500 animate-bounce" />
        <h2 className="text-xl font-bold text-foreground">Cohort Not Found</h2>
        <p className="text-sm text-muted-foreground">{errorMsg || "The requested training batch does not exist."}</p>
        <Button variant="outline" onClick={() => router.push("/courses")}>
          Go Back to Courses
        </Button>
      </div>
    )
  }

  const occupancyRate = (selectedStudentIds.length / Number(capacity)) * 100
  const isFull = selectedStudentIds.length >= Number(capacity)

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="space-y-6 max-w-6xl mx-auto pb-12"
    >
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border/40 pb-4">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/courses")}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer bg-transparent border-0 p-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Courses</span>
          </button>
          <h1 className="text-2xl font-extrabold text-foreground flex items-center gap-2 mt-1">
            <BookOpen className="h-6 w-6 text-primary" />
            <span>{isTrainer ? "Manage Training Batch" : "Edit Training Batch"}</span>
            <span className="text-sm font-normal text-muted-foreground">/</span>
            <Badge variant="outline" className="text-xs font-mono font-extrabold bg-primary/10 border-primary/20 text-primary px-2.5 py-0.5 animate-pulse">
              {code}
            </Badge>
          </h1>
          <p className="text-xs text-muted-foreground">
            {isTrainer
              ? "Update schedules, live session links, and upcoming class sessions for your batch."
              : "Modify schedules, delivery channels, classroom environments, and update cohort student enrollment."}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-2">
          {batchStatus === "completed" && (
            <Badge variant="outline" className="bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] self-start sm:self-auto">
              Completed
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUpdatingStatus}
            onClick={handleToggleBatchStatus}
            className={`h-8 text-xs gap-1.5 ${batchStatus === "completed" ? "" : "border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"}`}
          >
            {batchStatus === "completed" ? (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                Reopen Batch
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mark Batch Completed
              </>
            )}
          </Button>
        </div>
      </div>

      {batchStatus === "completed" && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-muted-foreground">
          <p className="font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            This batch is completed
          </p>
          <p className="mt-1">
            Live sessions and meet links are hidden from the courses page. LMS access remains available for enrolled students.
            {completedAt && (
              <> Completed on {new Date(completedAt).toLocaleDateString("en-US", { dateStyle: "medium" })}.</>
            )}
          </p>
        </div>
      )}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Core Fields (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Core Configuration */}
          <Card className="bg-card shadow-md hover:shadow-lg border-border/80 transition-all duration-300">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span>Core Cohort Information</span>
              </CardTitle>
              <CardDescription className="text-[11px]">Define naming structure, program alignment, center allocation and capacity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Batch Code *</label>
                  <Input
                    required
                    readOnly={isTrainer}
                    placeholder="e.g. Apex-B20"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="bg-card/40 text-xs h-10 border-border focus:ring-1 focus:ring-primary/40 focus:border-primary transition-all font-mono font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Campus Center *</label>
                  {user?.role === "super_admin" && centersList.length > 1 ? (
                    <Select
                      value={selectedCenterName}
                      onChange={(e) => setSelectedCenterName(e.target.value)}
                      className="bg-card/40 text-xs h-10 border-border"
                    >
                      {centersList.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </Select>
                  ) : (
                    <div className="h-10 flex items-center rounded-md border border-border/70 bg-muted/20 px-3 text-xs font-medium text-foreground">
                      {selectedCenterName || user?.tenantId || "—"}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Course Program *</label>
                  <Select
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    disabled={isTrainer}
                    className="bg-card/40 text-xs h-10 border-border"
                  >
                    {courses.map((course) => (
                      <option key={course.id || course._id} value={course.name}>
                        {course.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Class Capacity Limit *</label>
                  <Input
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    readOnly={isTrainer}
                    className="bg-card/40 text-xs h-10 border-border"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Scheduling & Trainer */}
          <Card className="bg-card shadow-md hover:shadow-lg border-border/80 transition-all duration-300">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-primary" />
                <span>Timetable & Trainer Assignment</span>
              </CardTitle>
              <CardDescription className="text-[11px]">Define weekly class hours and assign primary instructors.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Weekly Timetable *</label>
                  <Input
                    required
                    placeholder="e.g. Mon, Wed • 09:00 AM"
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    className="bg-card/40 text-xs h-10 border-border"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-muted-foreground block">Assigned Trainer *</label>
                  <Select
                    value={trainerName}
                    onChange={(e) => setTrainerName(e.target.value)}
                    disabled={isTrainer}
                    className="bg-card/40 text-xs h-10 border-border"
                  >
                    {(trainers.length > 0 ? trainers : [{ name: trainerName }]).map((t) => (
                      <option key={t.id || t.name} value={t.name}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Class Delivery Settings */}
          <Card className="bg-card shadow-md hover:shadow-lg border-border/80 transition-all duration-300">
            <CardHeader className="border-b border-border/30 pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                <Monitor className="h-4 w-4 text-primary" />
                <span>Class Delivery Mode & Infrastructure</span>
              </CardTitle>
              <CardDescription className="text-[11px]">Configure location types, live conference integration, or catalog links.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {/* Premium Delivery Mode Selector */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "online", label: "Online Class", desc: "Virtual Meet Link", icon: Video, color: "border-blue-500/30 text-blue-400 bg-blue-500/5 hover:bg-blue-500/10" },
                  { key: "offline", label: "In-Person", desc: "Physical Classrooms", icon: MapPin, color: "border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10" },
                  { key: "recorded", label: "Recorded", desc: "Self-Paced Library", icon: PlayCircle, color: "border-purple-500/30 text-purple-400 bg-purple-500/5 hover:bg-purple-500/10" }
                ].map((item) => {
                  const isActive = mode === item.key
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setMode(item.key as BatchMode)}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-xl border-2 text-center transition-all cursor-pointer",
                        isActive 
                          ? item.key === "online" 
                            ? "border-blue-500 bg-blue-500/10 text-blue-500 shadow-sm"
                            : item.key === "offline"
                              ? "border-amber-500 bg-amber-500/10 text-amber-500 shadow-sm"
                              : "border-purple-500 bg-purple-500/10 text-purple-500 shadow-sm"
                          : "border-border bg-card/25 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="h-5 w-5 mb-1.5 shrink-0" />
                      <span className="text-xs font-bold">{item.label}</span>
                      <span className="text-[9px] opacity-75 mt-0.5">{item.desc}</span>
                    </button>
                  )
                })}
              </div>

              {/* Context-aware Sub-fields */}
              <motion.div 
                layout 
                className="pt-2 border-t border-border/30"
              >
                {mode === "online" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground block">Virtual Conference Link</label>
                      <Input
                        placeholder="https://meet.google.com/..."
                        value={meetLink}
                        onChange={(e) => setMeetLink(e.target.value)}
                        className="bg-card/40 text-xs h-10 border-border"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-muted-foreground block">Meeting Platform</label>
                      <Select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value as any)}
                        className="bg-card/40 text-xs h-10 border-border"
                      >
                        <option value="gmeet">Google Meet</option>
                        <option value="zoom">Zoom Video</option>
                        <option value="teams">Microsoft Teams</option>
                        <option value="discord">Discord Guild</option>
                      </Select>
                    </div>
                  </div>
                )}

                {mode === "offline" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Classroom / Room Code</label>
                    <Input
                      placeholder="e.g. Lab 201, Room 104"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="bg-card/40 text-xs h-10 border-border"
                    />
                  </div>
                )}

                {mode === "recorded" && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground block">Recorded Content / LMS URL</label>
                    <Input
                      placeholder="https://lms.example.com/recordings/..."
                      value={meetLink}
                      onChange={(e) => setMeetLink(e.target.value)}
                      className="bg-card/40 text-xs h-10 border-border"
                    />
                  </div>
                )}
              </motion.div>
            </CardContent>
          </Card>

          {/* Card 4: Scheduled Class Sessions */}
          <Card className="bg-card shadow-md hover:shadow-lg border-border/80 transition-all duration-300">
            <CardHeader className="border-b border-border/30 pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>Scheduled Class Sessions</span>
                </CardTitle>
                <CardDescription className="text-[11px]">Draft lesson parameters and manage multiple upcoming class schedules.</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSessions([...sessions, { topic: "", date: "", endDate: "" }])}
                className="text-xs h-8 border-primary/20 hover:border-primary/40 text-primary hover:bg-primary/5 cursor-pointer"
              >
                + Add Scheduled Class
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-xl bg-secondary/5 space-y-2">
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                  <p className="text-xs font-semibold text-foreground">No Classes Scheduled</p>
                  <p className="text-[10px] text-muted-foreground max-w-xs">
                    Click "+ Add Scheduled Class" above to start scheduling sessions for this cohort.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {sessions.map((session, index) => (
                    <div key={index} className="flex items-end gap-3 p-3 bg-secondary/15 rounded-xl border border-border/60 relative group">
                      <div className="flex-1 grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block">Session #{index + 1} Topic</label>
                          <Input
                            placeholder="e.g. Hooks, API Routing, etc."
                            value={session.topic}
                            onChange={(e) => {
                              const updated = [...sessions]
                              updated[index].topic = e.target.value
                              setSessions(updated)
                            }}
                            className="bg-card/60 text-xs h-9 border-border"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block">Start Date & Time</label>
                          <Input
                            type="datetime-local"
                            value={session.date}
                            onChange={(e) => {
                              const updated = [...sessions]
                              updated[index].date = e.target.value
                              if (e.target.value && !updated[index].endDate) {
                                updated[index].endDate = defaultSessionEndFromStart(e.target.value)
                              }
                              setSessions(updated)
                            }}
                            className="bg-card/60 text-xs h-9 border-border text-foreground"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-muted-foreground block">End Date & Time</label>
                          <Input
                            type="datetime-local"
                            value={session.endDate || ""}
                            onChange={(e) => {
                              const updated = [...sessions]
                              updated[index].endDate = e.target.value
                              setSessions(updated)
                            }}
                            className="bg-card/60 text-xs h-9 border-border text-foreground"
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = sessions.filter((_, i) => i !== index)
                          setSessions(updated)
                        }}
                        className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer border border-border/50"
                        title="Remove Session"
                      >
                        <span className="text-sm font-bold">&times;</span>
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Student Timetable Preview Block */}
              {sessions.length > 0 && (
                <div className="p-3 bg-secondary/10 border border-primary/10 rounded-xl space-y-2 mt-1">
                  <h5 className="text-xs font-bold text-foreground flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-primary animate-pulse" />
                    <span>Student Portal TIMETABLE Preview:</span>
                  </h5>
                  <div className="max-h-24 overflow-y-auto space-y-1.5 pr-1 text-[10px] text-muted-foreground">
                    {sessions.map((session, index) => (
                      <div key={index} className="flex justify-between items-center bg-card/40 px-2 py-1 rounded border border-border/30 animate-scale-in">
                        <span className="font-semibold text-foreground">{session.topic || `Session #${index + 1}`}</span>
                        {session.date && (
                          <span className="font-mono text-primary font-bold text-right">
                            {formatSessionTimeRange(session)}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Cohort Enrollment (1/3 width) */}
        <div className="space-y-6">
          <Card className="bg-card border-border/80 shadow-md flex flex-col h-[700px] justify-between">
            <div className="space-y-4">
              <CardHeader className="border-b border-border/30 pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-foreground">
                    <Users className="h-4.5 w-4.5 text-primary" />
                    <span>Cohort Enrollment</span>
                  </CardTitle>
                  <Badge variant={isFull ? "destructive" : "info"} className="font-bold text-[10px]">
                    {selectedStudentIds.length} / {capacity} Enrolled
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  {isTrainer ? "View students enrolled in this batch." : "Search and register student profiles to this cohort."}
                </CardDescription>
              </CardHeader>

              <div className="px-6 space-y-3">
                {/* Visual Occupancy Bar */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                    <span>Enrollment Capacity</span>
                    <span>{occupancyRate.toFixed(0)}% Filled</span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full transition-all duration-300", isFull ? "bg-red-500" : "bg-primary")}
                      style={{ width: `${Math.min(occupancyRate, 100)}%` }}
                    />
                  </div>
                </div>

                {!isTrainer && (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name or email..."
                        value={studentSearchQuery}
                        onChange={(e) => setStudentSearchQuery(e.target.value)}
                        className="pl-9 bg-card text-xs h-9"
                      />
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 px-0.5">
                      <span>Active students checklist</span>
                      <div className="flex gap-2.5 font-bold">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds(activeStudentsList.map((s) => s.id))}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          Select All
                        </button>
                        <span>|</span>
                        <button
                          type="button"
                          onClick={() => setSelectedStudentIds([])}
                          className="hover:text-primary transition-colors cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Scrollable list */}
              <div className="px-6 overflow-y-auto max-h-[380px] space-y-2">
                <AnimatePresence initial={false}>
                  {activeStudentsList
                    .filter((st) => {
                      if (isTrainer && !selectedStudentIds.includes(st.id)) return false
                      const query = studentSearchQuery.toLowerCase()
                      return (
                        st.name.toLowerCase().includes(query) ||
                        st.email.toLowerCase().includes(query)
                      )
                    })
                    .map((st) => {
                      const isSelected = selectedStudentIds.includes(st.id)
                      const initials = getInitials(st.name)
                      
                      return (
                        <motion.div
                          key={st.id}
                          layout
                          onClick={() => {
                            if (isTrainer) return
                            if (isSelected) {
                              setSelectedStudentIds(selectedStudentIds.filter((id) => id !== st.id))
                            } else {
                              setSelectedStudentIds([...selectedStudentIds, st.id])
                            }
                          }}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-xl border-2 transition-all select-none",
                            isTrainer ? "cursor-default border-border bg-card/40" : "cursor-pointer",
                            !isTrainer && isSelected
                              ? "border-primary bg-primary/5 text-foreground"
                              : !isTrainer
                                ? "border-border bg-card/40 hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                                : "text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors",
                              isSelected 
                                ? "bg-primary text-primary-foreground" 
                                : "bg-muted text-muted-foreground"
                            )}>
                              {initials}
                            </div>
                            <div className="text-left leading-snug">
                              <p className="text-xs font-bold text-foreground">{st.name}</p>
                              <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">{st.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center">
                            {isSelected ? (
                              <div className="h-4.5 w-4.5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                                <Check className="h-3 w-3 stroke-[3]" />
                              </div>
                            ) : (
                              <div className="h-4.5 w-4.5 rounded-full border border-border bg-transparent" />
                            )}
                          </div>
                        </motion.div>
                      )
                    })}
                </AnimatePresence>
              </div>
            </div>

            {/* In-Panel Card Warnings */}
            <div className="p-4 bg-secondary/15 border-t border-border/40 rounded-b-xl space-y-3">
              {isFull && (
                <div className="flex items-center gap-2 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Cohort capacity limit reached. Adjust limits before registering more students.</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => router.push("/courses")}
                  className="w-1/2 justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSaving}
                  icon={Save}
                  className="w-1/2 justify-center shadow-md shadow-primary/10"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </form>
    </motion.div>
  )
}
