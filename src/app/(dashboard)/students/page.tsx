"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users, Search, Plus, Filter, Download, ArrowLeft, MoreHorizontal, Mail, Phone,
  FileCheck, ShieldAlert, BadgeDollarSign, CalendarRange, GraduationCap, Clock, FileDown, CheckSquare, Trash2, Calendar
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"
import { formatCurrency, formatDate } from "@/lib/utils"
import { api, ApiError } from "@/lib/api"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"
import { CapacityLimitNotice, showCapacityLimitToast } from "@/components/shared/CapacityLimitNotice"
import {
  computeInstallmentRows,
  getCurrentDueInstallment,
  isFullyPaid,
  resolveNextDueDate,
} from "@/lib/installments"

export interface Student {
  id: string
  name: string
  email: string
  phone: string
  course: string
  status: "active" | "completed" | "on_hold"
  attendanceRate: number
  feesPaid: number
  feesTotal: number
  guardian: { name: string; phone: string }
  enrollmentDate: string
  nextDueDate?: string
  installmentsCount?: number
  installmentSchedule?: Array<{ amount: number; dueDate: string; label?: string }>
  password?: string
}

export default function StudentsPage() {
  const { addNotification, user, fetchCenterPolicy } = useStore()
  const { policy, atCapacity } = useCenterPolicy()
  const studentsAtCapacity = atCapacity("students")
  const isTrainer = user?.role === "trainer"
  const isOwner = user?.role === "owner"
  const showCourseBatchFilters = isTrainer || isOwner
  const [students, setStudents] = React.useState<Student[]>([])
  const [courses, setCourses] = React.useState<any[]>([])
  const [batches, setBatches] = React.useState<any[]>([])
  
  React.useEffect(() => {
    const loadData = async () => {
      try {
        await fetchCenterPolicy()
        const [studentsData, coursesData, batchesData] = await Promise.all([
          isTrainer ? api.getTrainerStudents() : api.getStudents(),
          api.getCourses(),
          api.getBatches().catch(() => [])
        ])
        setStudents(studentsData)
        setCourses(coursesData)
        setBatches(batchesData || [])
        if (coursesData.length > 0) {
          setCourse(coursesData[0].name)
        }
      } catch (err) {
        console.error("Failed to load students, courses, or batches:", err)
      }
    }
    loadData()
  }, [isTrainer, fetchCenterPolicy])
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterStatus, setFilterStatus] = React.useState("all")
  const [filterCourse, setFilterCourse] = React.useState("all")
  const [filterBatch, setFilterBatch] = React.useState("all")
  const [selectedStudent, setSelectedStudent] = React.useState<Student | null>(null)

  const getStudentBatches = React.useCallback(
    (student: Student) =>
      batches.filter((batch) =>
        batch.studentNames?.some(
          (name: string) => name.trim().toLowerCase() === student.name.trim().toLowerCase()
        )
      ),
    [batches]
  )

  const courseFilterOptions = React.useMemo(() => {
    if (!showCourseBatchFilters) return []
    const names = new Set<string>()
    if (isOwner) {
      courses.forEach((courseItem) => {
        if (courseItem.name) names.add(courseItem.name)
      })
    }
    batches.forEach((batch) => {
      if (batch.courseName) names.add(batch.courseName)
    })
    students.forEach((student) => {
      if (student.course) names.add(student.course)
    })
    return Array.from(names).sort()
  }, [showCourseBatchFilters, isOwner, courses, batches, students])

  const batchFilterOptions = React.useMemo(() => {
    if (!showCourseBatchFilters) return []
    const availableBatches = isOwner
      ? batches
      : batches.filter((batch) => batch.status !== "completed")
    if (filterCourse === "all") return availableBatches
    return availableBatches.filter((batch) => batch.courseName === filterCourse)
  }, [showCourseBatchFilters, isOwner, batches, filterCourse])
  
  // Fees Editing State
  const [isEditingFees, setIsEditingFees] = React.useState(false)
  const [editFeesTotal, setEditFeesTotal] = React.useState("")
  const [editFeesPaid, setEditFeesPaid] = React.useState("")

  const [selectedStudentLogs, setSelectedStudentLogs] = React.useState<any[]>([])
  const [loadingLogs, setLoadingLogs] = React.useState(false)

  React.useEffect(() => {
    if (selectedStudent) {
      setEditFeesTotal(String(selectedStudent.feesTotal))
      setEditFeesPaid(String(selectedStudent.feesPaid))
      setIsEditingFees(false)
      
      const fetchLogs = async () => {
        try {
          setLoadingLogs(true)
          const logs = await api.getAttendanceByEntity(selectedStudent.id)
          setSelectedStudentLogs(logs || [])
        } catch (err) {
          console.error("Failed to fetch selected student attendance logs:", err)
          setSelectedStudentLogs([])
        } finally {
          setLoadingLogs(false)
        }
      }
      fetchLogs()
    } else {
      setSelectedStudentLogs([])
    }
  }, [selectedStudent])
  
  // Selection for bulk actions
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [statusUpdatingId, setStatusUpdatingId] = React.useState<string | null>(null)

  // Modal State
  const [isAddOpen, setIsAddOpen] = React.useState(false)

  // Form States for Add Student
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [course, setCourse] = React.useState("Fullstack Web Dev")
  const [feesTotal, setFeesTotal] = React.useState("1800")
  const [feesPaid, setFeesPaid] = React.useState("1800")
  const [paymentScheme, setPaymentScheme] = React.useState<"full" | "part1" | "part2" | "custom">("full")
  const [addNextDueDate, setAddNextDueDate] = React.useState("")
  const [addInstallmentCount, setAddInstallmentCount] = React.useState("3")

  React.useEffect(() => {
    const thirtyDays = new Date()
    thirtyDays.setDate(thirtyDays.getDate() + 30)
    setAddNextDueDate(thirtyDays.toISOString().split("T")[0])
  }, [])

  React.useEffect(() => {
    const selectedCourseObj = courses.find(c => c.name === course)
    if (selectedCourseObj) {
      setFeesTotal(String(selectedCourseObj.fees))
    }
  }, [course, courses])

  React.useEffect(() => {
    const total = Number(feesTotal) || 0
    if (paymentScheme === "full") {
      setFeesPaid(String(total))
    } else if (paymentScheme === "part1") {
      setFeesPaid(String(Math.round(total / 3)))
    } else if (paymentScheme === "part2") {
      setFeesPaid(String(Math.round((total / 3) * 2)))
    }
  }, [paymentScheme, feesTotal])

  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.phone.includes(searchQuery)
    const matchesStatus = filterStatus === "all" || student.status === filterStatus

    if (showCourseBatchFilters && filterCourse !== "all") {
      const studentBatches = getStudentBatches(student)
      const matchesCourse =
        student.course === filterCourse ||
        studentBatches.some((batch) => batch.courseName === filterCourse)
      if (!matchesCourse) return false
    }

    if (showCourseBatchFilters && filterBatch !== "all") {
      const studentBatches = getStudentBatches(student)
      const matchesBatch = studentBatches.some(
        (batch) => String(batch.id) === filterBatch || batch.code === filterBatch
      )
      if (!matchesBatch) return false
    }

    return matchesSearch && matchesStatus
  })

  // Pagination State
  const [currentPage, setCurrentPage] = React.useState(1)
  const itemsPerPage = 10

  React.useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus, filterCourse, filterBatch, showCourseBatchFilters, getStudentBatches])

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage)

  const paginatedStudents = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStudents.slice(start, start + itemsPerPage)
  }, [filteredStudents, currentPage, itemsPerPage])

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedStudents.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedStudents.map((s) => s.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkAction = (action: "export" | "remind") => {
    if (selectedIds.length === 0) return
    if (action === "export") {
      alert(`Exporting ${selectedIds.length} student records as CSV.`);
      addNotification({
        title: "Export Success",
        description: `Exported data for ${selectedIds.length} students.`,
        type: "admissions"
      })
    } else {
      alert(`Dispatched payment reminder notifications to ${selectedIds.length} guardians.`);
      addNotification({
        title: "Reminders Sent",
        description: `Fee alert notifications sent to ${selectedIds.length} students.`,
        type: "fees"
      })
    }
    setSelectedIds([])
  }

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name || !email || !phone) return

    try {
      const hasDues = Number(feesTotal) - Number(feesPaid) > 0
      const newStudent = await api.createStudent({
        name,
        email,
        phone,
        course,
        status: "active",
        attendanceRate: 0,
        feesPaid: Number(feesPaid),
        feesTotal: Number(feesTotal),
        guardian: { name: "N/A", phone: "N/A" },
        enrollmentDate: new Date().toISOString().split("T")[0],
        nextDueDate: hasDues ? addNextDueDate : undefined,
        installmentsCount: Number(addInstallmentCount)
      })

      setStudents([newStudent, ...students])
      setIsAddOpen(false)
      addNotification({
        title: "Student Enrolled",
        description: `${name} enrolled in Course: ${course}. Password: ${newStudent.password}`,
        type: "admissions"
      })
      alert(`Student enrolled successfully!\nEmail: ${email}\nPassword: ${newStudent.password}`);

      // Reset fields
      setName("")
      setEmail("")
      setPhone("")
      setPaymentScheme("full")
      setCourse("Fullstack Web Dev")
      setFeesTotal("1800")
      setFeesPaid("1800")
      setAddInstallmentCount("3")
    } catch (err: unknown) {
      console.error("Failed to enroll student:", err)
      if (err instanceof ApiError && err.isCapacityLimit) {
        showCapacityLimitToast(addNotification, "students", policy, err.message)
        void fetchCenterPolicy()
      } else {
        addNotification({
          title: "Enrollment Failed",
          description: err instanceof Error ? err.message : "Failed to add student.",
          type: "system",
        })
      }
    }
  }

  const handleSaveFees = async () => {
    if (!selectedStudent) return
    const updatedPaid = Number(editFeesPaid) || 0
    const updatedTotal = Number(editFeesTotal) || 0
    const fullyPaid = isFullyPaid(updatedPaid, updatedTotal)

    try {
      const updatedStudent = await api.updateStudentFees(selectedStudent.id, {
        feesPaid: updatedPaid,
        feesTotal: updatedTotal,
        nextDueDate: fullyPaid
          ? null
          : resolveNextDueDate({
              ...selectedStudent,
              feesPaid: updatedPaid,
              feesTotal: updatedTotal,
            }) || null,
      })

      setStudents(prev => prev.map(s => {
        if (s.id === selectedStudent.id) {
          return updatedStudent
        }
        return s
      }))

      setSelectedStudent(updatedStudent)
      setIsEditingFees(false)

      addNotification({
        title: "Student Fees Updated",
        description: `Updated fee ledger for ${selectedStudent.name}.`,
        type: "fees"
      })
    } catch (err: any) {
      console.error("Failed to update fees:", err)
      addNotification({
        title: "Update Failed",
        description: err.message || "Failed to update fees.",
        type: "system"
      })
    }
  }

  const handlePayInstallment = async (amount: number) => {
    if (!selectedStudent) return
    const newPaid = Math.min(selectedStudent.feesPaid + amount, selectedStudent.feesTotal)
    const fullyPaid = isFullyPaid(newPaid, selectedStudent.feesTotal)

    try {
      const updatedStudent = await api.updateStudentFees(selectedStudent.id, {
        feesPaid: newPaid,
        nextDueDate: fullyPaid
          ? null
          : resolveNextDueDate({
              ...selectedStudent,
              feesPaid: newPaid,
            }) || null,
      })

      setStudents(prev => prev.map(s => {
        if (s.id === selectedStudent.id) {
          return updatedStudent
        }
        return s
      }))

      setSelectedStudent(updatedStudent)

      addNotification({
        title: "Payment Recorded",
        description: `Recorded payment of ${formatCurrency(amount)} for ${selectedStudent.name}.`,
        type: "fees"
      })
    } catch (err: any) {
      console.error("Failed to record payment:", err)
      addNotification({
        title: "Payment Failed",
        description: err.message || "Failed to record payment.",
        type: "system"
      })
    }
  }

  const handleStatusUpdate = async (studentId: string, newStatus: Student["status"]) => {
    setStatusUpdatingId(studentId)
    const previousStudent = students.find((s) => s.id === studentId)
    try {
      const updatedStudent = await api.updateStudentStatus(studentId, newStatus)
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return updatedStudent
        }
        return s
      }))
      setSelectedStudent(prev => {
        if (!prev || prev.id !== studentId) return prev
        return updatedStudent
      })

      const accessEnabled = newStatus === "active"
      const matchingBatches = batches.filter((batch: any) =>
        batch.studentNames?.some(
          (name: string) =>
            name.trim().toLowerCase() === updatedStudent.name.trim().toLowerCase()
        )
      )

      if (matchingBatches.length > 0) {
        await Promise.all(
          matchingBatches.map((batch: any) =>
            api.updateBatch(String(batch.id || batch._id), {
              studentLmsAccess: {
                ...(batch.studentLmsAccess || {}),
                [updatedStudent.name]: accessEnabled,
              },
            })
          )
        )
        const batchesData = await api.getBatches().catch(() => [])
        setBatches(batchesData || [])
      }

      addNotification({
        title: accessEnabled ? "Access Enabled" : "Access Revoked",
        description: accessEnabled
          ? `${updatedStudent.name} can log in and use the LMS again.`
          : `${updatedStudent.name} can no longer log in or access the LMS.`,
        type: "admissions"
      })
    } catch (err: any) {
      console.error("Failed to update status:", err)
      if (previousStudent) {
        setStudents(prev => prev.map(s => (s.id === studentId ? previousStudent : s)))
        setSelectedStudent(prev => {
          if (!prev || prev.id !== studentId) return prev
          return previousStudent
        })
      }
      addNotification({
        title: "Update Failed",
        description: err.message || "Failed to update status.",
        type: "system"
      })
    } finally {
      setStatusUpdatingId(null)
    }
  }

  const getStatusBadge = (status: Student["status"]) => (
    <Badge
      variant={
        status === "active" ? "success" : status === "completed" ? "outline" : "warning"
      }
    >
      {status === "active" ? "Active" : status === "completed" ? "Completed" : "On Hold"}
    </Badge>
  )

  const renderStatusToggle = (student: Student) => {
    const isActive = student.status === "active"
    const isUpdating = statusUpdatingId === student.id
    const accessLabel =
      student.status === "active"
        ? "Active"
        : student.status === "completed"
          ? "Completed"
          : "No Access"

    return (
      <div
        className="flex items-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          role="switch"
          aria-checked={isActive}
          aria-label={`Toggle portal access for ${student.name}`}
          title={isActive ? "Turn off to revoke login and LMS access" : "Turn on to restore access"}
          disabled={isUpdating || student.status === "completed"}
          onClick={() => {
            if (student.status === "completed") return
            void handleStatusUpdate(student.id, isActive ? "on_hold" : "active")
          }}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 ${
            isActive ? "bg-emerald-500" : "bg-zinc-600"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
              isActive ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
        <span
          className={`text-[10px] font-semibold whitespace-nowrap ${
            student.status === "active"
              ? "text-emerald-600 dark:text-emerald-400"
              : student.status === "completed"
                ? "text-sky-600 dark:text-sky-400"
                : "text-amber-600 dark:text-amber-400"
          }`}
        >
          {isUpdating ? "Saving…" : accessLabel}
        </span>
      </div>
    )
  }

  const stats = React.useMemo(() => {
    if (!selectedStudentLogs || selectedStudentLogs.length === 0) {
      return {
        present: 0,
        absent: 0,
        late: 0,
        total: 0,
        rate: 0,
        hasLogs: false,
      }
    }
    const present = selectedStudentLogs.filter(l => l.status === 'present').length
    const late = selectedStudentLogs.filter(l => l.status === 'late').length
    const absent = selectedStudentLogs.filter(l => l.status === 'absent').length
    const total = selectedStudentLogs.length
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0
    return { present, absent, late, total, rate, hasLogs: true }
  }, [selectedStudentLogs])

  const selectedStudentBatch = React.useMemo(() => {
    if (!selectedStudent || !batches.length) return null
    return batches.find((b: any) =>
      b.studentNames?.some(
        (name: string) => name.trim().toLowerCase() === selectedStudent.name.trim().toLowerCase()
      )
    )
  }, [selectedStudent, batches])

  const handleAssignBatch = async (batchId: string) => {
    if (!selectedStudent || !batchId) return
    const batch = batches.find((b: any) => String(b.id || b._id) === batchId)
    if (!batch) return

    try {
      const studentNames = [...(batch.studentNames || [])]
      const alreadyAssigned = studentNames.some(
        (name: string) => name.trim().toLowerCase() === selectedStudent.name.trim().toLowerCase()
      )
      if (!alreadyAssigned) {
        studentNames.push(selectedStudent.name)
      }

      await api.updateBatch(String(batch.id || batch._id), {
        studentNames,
        enrolled: studentNames.length,
        studentLmsAccess: {
          ...(batch.studentLmsAccess || {}),
          [selectedStudent.name]: true,
        },
      })

      const batchesData = await api.getBatches().catch(() => [])
      setBatches(batchesData || [])

      addNotification({
        title: "Batch Assigned",
        description: `${selectedStudent.name} was added to ${batch.code}.`,
        type: "admissions",
      })
    } catch (err: any) {
      alert(err.message || "Failed to assign batch")
    }
  }

  const getInstallmentsList = (student: Student) => computeInstallmentRows(student)
  const getDocuments = (student: Student) => {
    const safeName = student.name.toLowerCase().replace(/\s+/g, "_")
    return [
      {
        name: `Admit_ID_${safeName}.pdf`,
        size: "340 KB",
        type: "Uploaded on enrollment"
      },
      {
        name: `Course_Agreement_${safeName}.pdf`,
        size: "185 KB",
        type: "Signed Agreement"
      }
    ]
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <span>Students Directory</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isTrainer
              ? "View students enrolled in your assigned batches, attendance, and progress."
              : "Administer student profiles, attendance analytics, document deposits, and installment schedules."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && !isTrainer && (
            <div className="flex items-center gap-1.5 animate-scale-in">
              <Button
                variant="outline"
                size="sm"
                icon={Download}
                onClick={() => handleBulkAction("export")}
                className="text-xs"
              >
                CSV ({selectedIds.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={BadgeDollarSign}
                onClick={() => handleBulkAction("remind")}
                className="text-xs text-amber-500 border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10"
              >
                Remind ({selectedIds.length})
              </Button>
            </div>
          )}
          {!isTrainer && (
            <Button variant="primary" size="sm" icon={Plus} disabled={studentsAtCapacity} onClick={() => setIsAddOpen(true)}>
              Enroll Student
            </Button>
          )}
        </div>
      </div>

      {studentsAtCapacity && policy && (
        <CapacityLimitNotice resource="students" policy={policy} />
      )}

      {/* Filter and Search Bar */}
      <div className={`grid gap-3 bg-card p-4 rounded-xl border border-border ${showCourseBatchFilters ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-3"}`}>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            placeholder="Search student or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 rounded-lg border border-border bg-card pl-9 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 text-xs"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </Select>
        </div>

        {showCourseBatchFilters && (
          <>
            <Select
              value={filterCourse}
              onChange={(e) => {
                setFilterCourse(e.target.value)
                setFilterBatch("all")
              }}
              className="h-9 text-xs"
            >
              <option value="all">All Courses</option>
              {courseFilterOptions.map((courseName) => (
                <option key={courseName} value={courseName}>
                  {courseName}
                </option>
              ))}
            </Select>
            <Select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="h-9 text-xs"
            >
              <option value="all">All Batches</option>
              {batchFilterOptions.map((batch) => (
                <option key={batch.id} value={String(batch.id)}>
                  {batch.courseName} ({batch.code})
                </option>
              ))}
            </Select>
          </>
        )}
      </div>

      {/* Student List Table */}
      <Card className="bg-card">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border text-muted-foreground uppercase font-semibold">
                  {!isTrainer && (
                    <th className="p-4 w-10">
                      <input
                        type="checkbox"
                        className="rounded border-border/80 text-primary focus:ring-primary cursor-pointer"
                        checked={paginatedStudents.length > 0 && selectedIds.length === paginatedStudents.length}
                        onChange={toggleSelectAll}
                      />
                    </th>
                  )}
                  <th className="p-4">Student</th>
                  {!isTrainer && <th className="p-4">Next Due Date</th>}
                  <th className="p-4">Course</th>
                  {isTrainer && <th className="p-4">Batch</th>}
                  <th className="p-4">Attendance</th>
                  {!isTrainer && <th className="p-4">Paid / Total Dues</th>}
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-right">Enrollment Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {paginatedStudents.length === 0 ? (
                  <tr>
                    <td colSpan={isTrainer ? 6 : 8} className="py-12 text-center text-muted-foreground">
                      No student records matched the filters.
                    </td>
                  </tr>
                ) : (
                  paginatedStudents.map((student) => {
                    const isSelected = selectedIds.includes(student.id)
                    const studentBatches = isTrainer ? getStudentBatches(student) : []
                    const displayCourse =
                      student.course ||
                      studentBatches[0]?.courseName ||
                      "—"
                    const displayBatch =
                      studentBatches.length > 0
                        ? studentBatches.map((batch) => batch.code).join(", ")
                        : "—"
                    return (
                      <tr 
                        key={student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                          isSelected ? "bg-primary/5" : ""
                        }`}
                      >
                        {!isTrainer && (
                          <td className="p-4 w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(student.id)}
                              className="rounded border-border/80 text-primary focus:ring-primary cursor-pointer"
                            />
                          </td>
                        )}
                        <td className="p-4 font-bold text-foreground">
                          <div>
                            <p className="hover:underline">{student.name}</p>
                            <div className="text-[10px] text-muted-foreground font-normal space-y-0.5">
                              <p>{student.email}</p>
                              <p>{student.phone}</p>
                              {!isTrainer && student.password && (
                                <p className="text-amber-500 font-mono font-semibold">Password: {student.password}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        {!isTrainer && (
                          <td className="p-4 text-muted-foreground font-mono">
                            {isFullyPaid(student.feesPaid, student.feesTotal) ? (
                              <span className="text-emerald-500 font-bold text-[10px] uppercase">Fully Paid</span>
                            ) : resolveNextDueDate(student) ? (
                              <span>{formatDate(resolveNextDueDate(student)!)}</span>
                            ) : (
                              <span className="text-muted-foreground/60">—</span>
                            )}
                          </td>
                        )}
                        <td className="p-4 text-foreground">{displayCourse}</td>
                        {isTrainer && (
                          <td className="p-4 text-foreground">{displayBatch}</td>
                        )}
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold ${student.attendanceRate < 75 ? "text-red-500" : "text-foreground"}`}>
                              {student.attendanceRate}%
                            </span>
                            <div className="h-1.5 w-16 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${student.attendanceRate < 75 ? "bg-red-500" : "bg-primary"}`} 
                                style={{ width: `${student.attendanceRate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        {!isTrainer && (
                          <td className="p-4 font-semibold text-foreground">
                            {formatCurrency(student.feesPaid)} / {formatCurrency(student.feesTotal)}
                          </td>
                        )}
                        <td className="p-4">
                          {isTrainer ? (
                            <Badge
                              variant={
                                student.status === "active"
                                  ? "success"
                                  : student.status === "completed"
                                    ? "outline"
                                    : "warning"
                              }
                            >
                              {student.status === "active"
                                ? "Active"
                                : student.status === "completed"
                                  ? "Completed"
                                  : "On Hold"}
                            </Badge>
                          ) : (
                            renderStatusToggle(student)
                          )}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">{formatDate(student.enrollmentDate)}</td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/10">
              <div className="text-[11px] text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{((currentPage - 1) * itemsPerPage) + 1}</span> to{" "}
                <span className="font-semibold text-foreground">
                  {Math.min(currentPage * itemsPerPage, filteredStudents.length)}
                </span>{" "}
                of <span className="font-semibold text-foreground">{filteredStudents.length}</span> students
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="h-7 text-[10px] px-2.5"
                >
                  Previous
                </Button>
                
                {/* Page numbers */}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "primary" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-7 w-7 text-[10px] p-0 ${currentPage === pageNum ? "shadow-xs" : ""}`}
                  >
                    {pageNum}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="h-7 text-[10px] px-2.5"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Profile Drawer Panel */}
      <AnimatePresence>
        {selectedStudent && (
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-2xl bg-card border-l border-border shadow-2xl p-6 flex flex-col justify-between animate-slide-in-bottom">
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-border/80">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <h2 className="text-base font-bold text-foreground">{selectedStudent.name}</h2>
                    <span className="text-[10px] text-muted-foreground">
                      ID: {selectedStudent.id}
                      {isTrainer ? (
                        <> • {getStudentBatches(selectedStudent).map((b) => `${b.courseName} (${b.batchName})`).join(", ") || selectedStudent.course}</>
                      ) : (
                        <> • {selectedStudent.course}</>
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isTrainer && (
                    <>
                      <span className="text-[10px] font-semibold text-muted-foreground">Status:</span>
                      {renderStatusToggle(selectedStudent)}
                      <select
                        value={selectedStudent.status}
                        onChange={(e) => handleStatusUpdate(selectedStudent.id, e.target.value as Student["status"])}
                        disabled={statusUpdatingId === selectedStudent.id}
                        className="h-7 rounded-md border border-border bg-card text-[10px] px-2 cursor-pointer font-medium focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring text-muted-foreground"
                      >
                        <option value="active">Active</option>
                        <option value="on_hold">On Hold</option>
                        <option value="completed">Completed</option>
                      </select>
                    </>
                  )}
                  {isTrainer && getStatusBadge(selectedStudent.status)}
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="overview">
                <TabsList className={`grid w-full h-9 ${isTrainer ? "grid-cols-3" : "grid-cols-4"}`}>
                  <TabsTrigger value="overview">Info</TabsTrigger>
                  <TabsTrigger value="attendance">Attd</TabsTrigger>
                  {!isTrainer && <TabsTrigger value="fees">Fees</TabsTrigger>}
                  <TabsTrigger value="docs">Docs</TabsTrigger>
                </TabsList>

                {/* Info Tab */}
                <TabsContent value="overview" className="space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <Card className="p-4 bg-muted/10">
                      <h4 className="font-semibold text-foreground uppercase text-[10px] text-muted-foreground mb-2">Student Info</h4>
                      <p className="flex items-center gap-1.5 py-1 text-muted-foreground">
                        <Mail className="h-3.5 w-3.5" /> {selectedStudent.email}
                      </p>
                      <p className="flex items-center gap-1.5 py-1 text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" /> {selectedStudent.phone}
                      </p>
                      <p className="flex items-center gap-1.5 py-1 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" /> Joined {formatDate(selectedStudent.enrollmentDate)}
                      </p>
                      {selectedStudent.password && (
                        <p className="flex items-center gap-1.5 py-1.5 text-amber-500 font-semibold bg-amber-500/5 px-2 rounded-md border border-amber-500/10 mt-2">
                          <span className="text-[10px] text-muted-foreground font-normal uppercase tracking-wider shrink-0">Password:</span>
                          <span className="font-mono text-xs">{selectedStudent.password}</span>
                        </p>
                      )}
                    </Card>

                    <Card className="p-4 bg-muted/10">
                      <h4 className="font-semibold text-foreground uppercase text-[10px] text-muted-foreground mb-2">Payment Details</h4>
                      <p className="font-semibold text-foreground">
                        {selectedStudent.feesPaid >= selectedStudent.feesTotal ? (
                          <span className="text-emerald-500 font-bold uppercase text-[10px]">Fully Paid</span>
                        ) : (
                          <span>Outstanding Dues</span>
                        )}
                      </p>
                      {selectedStudent.feesPaid < selectedStudent.feesTotal && resolveNextDueDate(selectedStudent) && (
                        <p className="flex items-center gap-1.5 py-1 text-muted-foreground mt-1 font-mono">
                          <CalendarRange className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Due: {formatDate(resolveNextDueDate(selectedStudent)!)}</span>
                        </p>
                      )}
                    </Card>
                  </div>

                  <Card className="p-4 bg-muted/10 text-xs">
                    <h4 className="font-semibold text-foreground uppercase text-[10px] text-muted-foreground mb-2">Batch Allocation</h4>
                    {selectedStudentBatch ? (
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">{selectedStudentBatch.code}</p>
                        <p className="text-muted-foreground">{selectedStudentBatch.courseName}</p>
                        <p className="text-[10px] text-muted-foreground">{selectedStudentBatch.schedule}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-amber-600 dark:text-amber-400 font-medium">
                          Not assigned to any batch yet. Assign a batch before marking attendance.
                        </p>
                        <Select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) handleAssignBatch(e.target.value)
                          }}
                          className="h-8.5 text-xs bg-card max-w-sm"
                        >
                          <option value="">Assign to batch...</option>
                          {batches.map((batch: any) => (
                            <option key={batch.id || batch._id} value={batch.id || batch._id}>
                              {batch.code} • {batch.courseName}
                            </option>
                          ))}
                        </Select>
                      </div>
                    )}
                  </Card>
                </TabsContent>

                {/* Attendance Tab */}
                <TabsContent value="attendance" className="pt-2 space-y-4">
                  {loadingLogs ? (
                    <div className="flex flex-col justify-center items-center py-12 space-y-2">
                      <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <p className="text-[10px] text-muted-foreground">Loading logs...</p>
                    </div>
                  ) : (
                    <>
                      {/* Overall Stat Banner */}
                      <Card className="bg-secondary/15 border-border/40 p-4">
                        <div className="flex items-center gap-6">
                          <div className="relative h-20 w-20 shrink-0 flex items-center justify-center">
                            <svg className="h-full w-full transform -rotate-90">
                              <circle
                                cx="40"
                                cy="40"
                                r="30"
                                className="stroke-secondary"
                                strokeWidth="6"
                                fill="transparent"
                              />
                              <circle
                                cx="40"
                                cy="40"
                                r="30"
                                className={
                                  stats.rate >= 90 ? "stroke-emerald-500" :
                                  stats.rate >= 75 ? "stroke-primary" : "stroke-red-500"
                                }
                                strokeWidth="6"
                                fill="transparent"
                                strokeDasharray={2 * Math.PI * 30}
                                strokeDashoffset={(2 * Math.PI * 30) - (stats.rate / 100) * (2 * Math.PI * 30)}
                                strokeLinecap="round"
                              />
                            </svg>
                            <span className="absolute text-sm font-black text-foreground">{stats.rate}%</span>
                          </div>

                          <div className="space-y-1">
                            <h4 className="font-bold text-xs text-foreground">Attendance Performance</h4>
                            <p className="text-[11px] text-muted-foreground leading-normal">
                              {!stats.hasLogs
                                ? "No attendance recorded yet. Assign this student to a batch, then mark attendance from the Attendance page."
                                : stats.rate >= 90
                                  ? "Excellent standing. Student is meeting all required curriculum attendance goals."
                                  : stats.rate >= 75
                                    ? "Satisfactory attendance. Recommend regular check-ins to prevent drop-off."
                                    : "Critical attendance alert! Rate is below the 75% graduation requirement threshold."}
                            </p>
                          </div>
                        </div>
                      </Card>

                      {/* Header metrics grid */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                        <div className="p-3 bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10">
                          <p className="text-lg font-black">{stats.present + stats.late}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">Attended Days</p>
                        </div>
                        <div className="p-3 bg-red-500/5 text-red-500 rounded-xl border border-red-500/10">
                          <p className="text-lg font-black">{stats.absent}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">Absent Days</p>
                        </div>
                        <div className="p-3 bg-secondary/35 rounded-xl border border-border/80 text-foreground">
                          <p className="text-lg font-black">{stats.total}</p>
                          <p className="text-[10px] text-muted-foreground font-normal">Total Sessions</p>
                        </div>
                      </div>

                      {!selectedStudentBatch && (
                        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-700 dark:text-amber-400">
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                          <span>This student is not allocated to a batch. Go to the Info tab and assign a batch first.</span>
                        </div>
                      )}

                      {/* Warning Banner */}
                      {stats.hasLogs && stats.rate < 75 && (
                        <div className="flex items-start gap-2 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-600 dark:text-red-400">
                          <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                          <span>Warning: Attendance rate has dropped below safety limits (75%). Action required.</span>
                        </div>
                      )}

                      {/* Attendance Log Ledger Timeline */}
                      <div className="space-y-2">
                        <h5 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wide flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span>Check-in Audit Logs</span>
                        </h5>
                        <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
                          {selectedStudentLogs.length === 0 ? (
                            <div className="text-center py-8 text-xs text-muted-foreground italic bg-secondary/10 border border-dashed border-border rounded-xl">
                              No attendance log ledger entries found.
                            </div>
                          ) : (
                            [...selectedStudentLogs]
                              .sort((a, b) => b.date.localeCompare(a.date))
                              .map((log) => {
                                let badgeColor = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                if (log.status === "absent") badgeColor = "bg-red-500/10 text-red-500 border-red-500/20"
                                if (log.status === "late") badgeColor = "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"

                                return (
                                  <div key={log.id || log._id} className="p-3 border border-border/60 rounded-xl flex items-center justify-between bg-card text-xs">
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-extrabold text-foreground">{formatDate(log.date)}</span>
                                        {selectedStudentBatch && (
                                          <span className="text-[9px] text-primary font-bold px-1.5 py-0.5 rounded bg-primary/5 border border-primary/10 uppercase">
                                            {selectedStudentBatch.code}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground font-semibold leading-normal">
                                        Topic: {(() => {
                                          if (!selectedStudentBatch || !selectedStudentBatch.sessions) return "General Lecture"
                                          const logDateStr = log.date.substring(0, 10)
                                          const match = selectedStudentBatch.sessions.find((s: any) => s && s.date && s.date.substring(0, 10) === logDateStr)
                                          return match ? match.topic : (selectedStudentBatch.nextSessionTopic || "General Lecture")
                                        })()}
                                      </p>
                                    </div>
                                    <Badge className={badgeColor}>
                                      {log.status === "present" ? "Present" : log.status === "absent" ? "Absent" : "Late"}
                                    </Badge>
                                  </div>
                                )
                              })
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Fees Tab */}
                <TabsContent value="fees" className="pt-2 space-y-4">
                  <div className="flex justify-between items-center text-xs p-3.5 rounded-lg border border-border bg-secondary/30">
                    <div>
                      <p className="text-muted-foreground">Collected Dues</p>
                      <p className="text-base font-bold mt-0.5">{formatCurrency(selectedStudent.feesPaid)} / {formatCurrency(selectedStudent.feesTotal)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {selectedStudent.feesPaid < selectedStudent.feesTotal ? (
                        <Badge variant="warning">Dues Outstanding</Badge>
                      ) : (
                        <Badge variant="success">Fully Paid</Badge>
                      )}
                      {!isTrainer && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px] px-2 cursor-pointer"
                          onClick={() => {
                            setEditFeesTotal(String(selectedStudent.feesTotal))
                            setEditFeesPaid(String(selectedStudent.feesPaid))
                            setIsEditingFees(!isEditingFees)
                          }}
                        >
                          {isEditingFees ? "Cancel" : "Update"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isEditingFees && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="p-3.5 border border-border rounded-lg bg-card space-y-3 overflow-hidden text-xs"
                    >
                      <p className="font-bold text-xs">Update Dues Ledger</p>
                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Total Fees (₹)</label>
                          <input
                            type="number"
                            value={editFeesTotal}
                            onChange={(e) => setEditFeesTotal(e.target.value)}
                            className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-muted-foreground">Fees Paid (₹)</label>
                          <input
                            type="number"
                            value={editFeesPaid}
                            onChange={(e) => setEditFeesPaid(e.target.value)}
                            className="w-full h-8.5 px-2.5 rounded-lg border border-border bg-card text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
                        {selectedStudent.feesPaid < selectedStudent.feesTotal && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/5 mr-auto cursor-pointer"
                            onClick={() => {
                              setEditFeesPaid(String(editFeesTotal))
                            }}
                          >
                            Mark Fully Paid
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          className="h-7 text-[10px] cursor-pointer"
                          onClick={handleSaveFees}
                        >
                          Save Changes
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-2 text-xs">
                    <h5 className="font-bold text-muted-foreground uppercase text-[10px] tracking-wide">Installment History</h5>
                    {getInstallmentsList(selectedStudent).map((inst) => (
                      <div key={inst.number} className="p-3 border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-bold">
                            Installment #{inst.number} - {inst.label}
                            <span className="text-[10px] text-muted-foreground font-normal ml-1">
                              ({inst.number}/{getInstallmentsList(selectedStudent).length})
                            </span>
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {inst.status === "paid"
                              ? `Paid: ${formatDate(inst.dueDate)}`
                              : inst.status === "overdue"
                                ? `Overdue: ${formatDate(inst.dueDate)}`
                                : `Due: ${formatDate(inst.dueDate)}`
                            }
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={
                            inst.status === "paid"
                              ? "font-semibold text-emerald-500"
                              : inst.status === "overdue"
                                ? "font-semibold text-red-500"
                                : "font-semibold text-amber-500"
                          }>
                            {inst.status === "paid"
                              ? `+${formatCurrency(inst.amount)}`
                              : inst.status === "partial"
                                ? `${formatCurrency(inst.dueAmount)} due (${formatCurrency(inst.paidAmount)} paid)`
                                : `${formatCurrency(inst.dueAmount || inst.amount)} (${inst.status === "overdue" ? "Overdue" : "Pending"})`
                            }
                          </span>
                          {inst.status !== "paid" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[9px] py-0 px-2 text-emerald-500 border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 cursor-pointer"
                              onClick={() => handlePayInstallment(inst.dueAmount || inst.amount)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Documents Tab */}
                <TabsContent value="docs" className="pt-2 space-y-2.5">
                  {getDocuments(selectedStudent).map((doc, idx) => (
                    <div key={idx} className="p-3 border border-border rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-bold">{doc.name}</p>
                          <span className="text-[9px] text-muted-foreground">{doc.size} • {doc.type}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" icon={FileDown} className="h-7 text-[10px]" onClick={() => alert(`Downloading ${doc.name}...`)}>
                        Download
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </div>

            {/* Actions */}
            <div className="border-t border-border pt-4 flex gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  setStudents((prev) => prev.filter((s) => s.id !== selectedStudent.id))
                  setSelectedStudent(null)
                }}
                icon={Trash2}
                className="w-full"
              >
                Deregister Student
              </Button>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Student Dialog */}
      <Dialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Enroll New Student"
        description="Fills initial database records. Default status is 'Active'."
      >
        <form onSubmit={handleAddStudent} className="space-y-4">
          {studentsAtCapacity && policy && (
            <CapacityLimitNotice resource="students" policy={policy} variant="inline" />
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
            <Input
              placeholder="Student name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card text-xs h-9.5"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                placeholder="name@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Phone</label>
              <Input
                placeholder="+1 555-0123"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Course Program</label>
              <Select
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                className="bg-card text-xs h-9.5"
              >
                {courses.map((c) => (
                  <option key={c.id || c._id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Course Pricing ($)</label>
              <Input
                type="number"
                value={feesTotal}
                onChange={(e) => setFeesTotal(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Billing Scheme / Plan</label>
              <Select
                value={paymentScheme}
                onChange={(e) => setPaymentScheme(e.target.value as any)}
                className="bg-card text-xs h-9.5"
              >
                <option value="full">Full Payment Upfront</option>
                <option value="part1">Installment: Part 1 Only (33%)</option>
                <option value="part2">Installment: Part 1 & 2 (66%)</option>
                <option value="custom">Custom Initial Deposit</option>
              </Select>
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Initial Paid Amount ($)</label>
              <Input
                type="number"
                disabled={paymentScheme !== "custom"}
                value={feesPaid}
                onChange={(e) => setFeesPaid(e.target.value)}
                className={`bg-card text-xs h-9.5 ${paymentScheme !== "custom" ? "opacity-75 cursor-not-allowed bg-zinc-950/20" : ""}`}
              />
            </div>
          </div>

          {Number(feesTotal) - Number(feesPaid) > 0 && (
            <div className="p-2.5 rounded-lg border border-amber-500/25 bg-amber-500/5 text-[10px] text-amber-500 flex items-center justify-between font-medium">
              <span>Outstanding Dues Pending:</span>
              <span className="font-mono font-bold">${(Number(feesTotal) - Number(feesPaid)).toFixed(2)}</span>
            </div>
          )}

          {Number(feesTotal) - Number(feesPaid) > 0 && (
            <div className="grid grid-cols-2 gap-3.5 border-t border-border/40 pt-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Next Payment Due Date</label>
                <Input
                  type="date"
                  value={addNextDueDate}
                  onChange={(e) => setAddNextDueDate(e.target.value)}
                  className="bg-card text-xs h-9.5"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground">Number of Dues / Installments</label>
                <Select
                  value={addInstallmentCount}
                  onChange={(e) => setAddInstallmentCount(e.target.value)}
                  className="bg-card text-xs h-9.5"
                >
                  <option value="1">1 (Single Payment)</option>
                  <option value="2">2 Dues</option>
                  <option value="3">3 Dues</option>
                  <option value="4">4 Dues</option>
                  <option value="5">5 Dues</option>
                  <option value="6">6 Dues</option>
                  <option value="8">8 Dues</option>
                  <option value="10">10 Dues</option>
                  <option value="12">12 Dues</option>
                </Select>
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={studentsAtCapacity}>
              Enroll Student
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
