"use client"
import * as React from "react"
import { Briefcase, Plus, Calendar, Clock, MapPin, IndianRupee, Search, ClipboardList, CheckCircle2, UserCheck, XCircle, ArrowUpRight, ArrowLeft, Send, Mail, UploadCloud, Loader2, Sparkles, Cpu, Check, Video, Link2, Phone, CalendarCheck, AlertCircle, Trash2 } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { Select } from "@/components/ui/Select"
import { Dialog } from "@/components/ui/Dialog"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { useStore } from "@/store/useStore"
import { api, fetchAPI } from "@/lib/api"
import { PageFeatureGate } from "@/components/shared/FeatureGate"

interface Job {
  id: string
  title: string
  company: string
  location: string
  type: "Full-time" | "Part-time" | "Internship"
  salary: string
  description: string
  requirements: string[]
  postedDate: string
  deadline: string
  active: boolean
  targetBatchIds?: string[]
  targetBatchCodes?: string[]
}

function jobTargetsAllBatches(job: Job) {
  return !job.targetBatchIds || job.targetBatchIds.length === 0
}

function jobMatchesStudentBatches(job: Job, studentBatchIds: string[]) {
  if (jobTargetsAllBatches(job)) return true
  return (job.targetBatchIds || []).some((batchId) => studentBatchIds.includes(String(batchId)))
}

function formatJobBatchLabel(job: Job) {
  if (jobTargetsAllBatches(job)) return "All batches"
  if (job.targetBatchCodes?.length) return job.targetBatchCodes.join(", ")
  return `${job.targetBatchIds?.length || 0} batch(es)`
}

interface InterviewDetails {
  date: string
  time: string
  mode: "online" | "offline"
  locationOrLink: string
}

interface JobApplication {
  id: string
  jobId: string
  studentId: string
  studentName: string
  studentEmail: string
  coverLetter: string
  appliedDate: string
  status: "Pending" | "InterviewScheduled" | "Interviewing" | "Selected" | "Rejected"
  interview?: InterviewDetails
}

const initialJobs: Job[] = [
  {
    id: "job-1",
    title: "Junior Full Stack Developer",
    company: "Altron Tech Solutions",
    location: "New York City, NY (Hybrid)",
    type: "Full-time",
    salary: "₹6,00,000 - ₹8,50,000 / year",
    description: "We are seeking a Junior Full Stack Developer skilled in React, Node.js, and TypeScript to join our core product team. You will work on expanding our customer dashboard and implementing new microservices.",
    requirements: ["Proficient in JavaScript/TypeScript", "Experience with React and TailwindCSS", "Basic understanding of REST APIs and databases (PostgreSQL/MongoDB)"],
    postedDate: "2026-05-18",
    deadline: "2026-06-15",
    active: true
  },
  {
    id: "job-2",
    title: "UI/UX Designer Apprentice",
    company: "Apex Design Hub",
    location: "Remote",
    type: "Internship",
    salary: "₹500 - ₹700 / hour",
    description: "Looking for a passionate junior designer to collaborate on wireframes, prototyping, and visual assets. This role works closely with product managers and developers to craft state-of-the-art mobile and web experiences.",
    requirements: ["Portfolio showing digital design projects", "Figma expertise", "Strong communication and visual storytelling skills"],
    postedDate: "2026-05-19",
    deadline: "2026-06-20",
    active: true
  },
  {
    id: "job-3",
    title: "Backend API Engineer",
    company: "Vertex Cloud Systems",
    location: "San Francisco, CA (Onsite)",
    type: "Full-time",
    salary: "₹9,50,000 - ₹11,50,000 / year",
    description: "Scale our cloud backend databases and API routes. Focus is on performance, indexing, security gating, and integration with payment gateways.",
    requirements: ["Strong knowledge of Node.js and Express/NestJS", "SQL query optimization", "Familiarity with Docker and AWS deployment"],
    postedDate: "2026-05-15",
    deadline: "2026-06-10",
    active: true
  }
]

const initialApplications: JobApplication[] = [
  {
    id: "app-1",
    jobId: "job-2",
    studentId: "u-4", // Emily Parker (Student User id in store)
    studentName: "Emily Parker",
    studentEmail: "emily@apexacademy.com",
    coverLetter: "I have been designing custom web layouts for the past year and would love to work with your design team. I am very proficient in Figma.",
    appliedDate: "2026-05-20",
    status: "Interviewing"
  },
  {
    id: "app-2",
    jobId: "job-1",
    studentId: "student-temp-1",
    studentName: "David Miller",
    studentEmail: "david.m@student.com",
    coverLetter: "I recently built a full stack app with React and NestJS. Looking forward to discussing this opportunity.",
    appliedDate: "2026-05-19",
    status: "Pending"
  }
]

export default function JobPortalPage() {
  const { user, addNotification } = useStore()
  const isStudent = user?.role === "student"

  const [jobs, setJobs] = React.useState<Job[]>([])
  const [applications, setApplications] = React.useState<JobApplication[]>([])
  const [batches, setBatches] = React.useState<any[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsData, appsData, batchesData] = await Promise.all([
          api.getJobs(),
          api.getApplications(),
          api.getBatches().catch(() => []),
        ])
        if (jobsData) setJobs(jobsData)
        if (appsData) setApplications(appsData)
        if (batchesData) setBatches(batchesData)
      } catch (err) {
        console.error("Error fetching jobs data:", err)
      }
    }
    fetchData()
  }, [])

  const studentBatchIds = React.useMemo(() => {
    if (!isStudent || !user?.name || !batches.length) return []
    const normalizedName = user.name.trim().toLowerCase()
    return batches
      .filter((batch: any) =>
        (batch.studentNames || []).some(
          (name: string) => name.trim().toLowerCase() === normalizedName
        )
      )
      .map((batch: any) => String(batch.id || batch._id))
  }, [isStudent, user?.name, batches])

  const visibleJobs = React.useMemo(() => {
    if (!isStudent) return jobs
    return jobs.filter((job) => jobMatchesStudentBatches(job, studentBatchIds))
  }, [jobs, isStudent, studentBatchIds])

  // Recruiter States (Owner/Trainer)
  const [isPostOpen, setIsPostOpen] = React.useState(false)
  const [selectedJobForApplicants, setSelectedJobForApplicants] = React.useState<Job | null>(null)

  // Interview Scheduling States
  const [scheduleTarget, setScheduleTarget] = React.useState<JobApplication | null>(null)
  const [interviewDate, setInterviewDate] = React.useState("")
  const [interviewTime, setInterviewTime] = React.useState("")
  const [interviewMode, setInterviewMode] = React.useState<"online" | "offline">("online")
  const [interviewLocationOrLink, setInterviewLocationOrLink] = React.useState("")

  // Application Detail Drawer (Applications Feed)
  const [feedDetailApp, setFeedDetailApp] = React.useState<JobApplication | null>(null)

  // Recruiter Job Form
  const [jobTitle, setJobTitle] = React.useState("")
  const [jobCompany, setJobCompany] = React.useState("")
  const [jobLocation, setJobLocation] = React.useState("")
  const [jobType, setJobType] = React.useState<"Full-time" | "Part-time" | "Internship">("Full-time")
  const [jobSalary, setJobSalary] = React.useState("")
  const [jobDesc, setJobDesc] = React.useState("")
  const [jobReqs, setJobReqs] = React.useState("")
  const [jobDeadline, setJobDeadline] = React.useState("")
  const [jobTargetBatchIds, setJobTargetBatchIds] = React.useState<string[]>([])
  const [allBatchesSelected, setAllBatchesSelected] = React.useState(true)
  const [deletingJobId, setDeletingJobId] = React.useState<string | null>(null)
  const [isGeneratingJobContent, setIsGeneratingJobContent] = React.useState(false)

  // Student States
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterType, setFilterType] = React.useState("All")
  const [selectedJobForDetail, setSelectedJobForDetail] = React.useState<Job | null>(null)
  const [isApplyOpen, setIsApplyOpen] = React.useState(false)
  const [coverLetter, setCoverLetter] = React.useState("")

  // AI Matching States
  const [resumeUploaded, setResumeUploaded] = React.useState(false)
  const [isAnalyzing, setIsAnalyzing] = React.useState(false)
  const [analysisProgress, setAnalysisProgress] = React.useState(0)
  const [analysisProfile, setAnalysisProfile] = React.useState<"react" | "design" | "backend" | null>(null)
  const [uploadedFileName, setUploadedFileName] = React.useState("")

  const handleDeleteJob = async (job: Job) => {
    if (
      !window.confirm(
        `Delete "${job.title}" at ${job.company}? All applications for this posting will also be removed.`
      )
    ) {
      return
    }

    setDeletingJobId(job.id)
    try {
      await api.deleteJob(job.id)
      setJobs((prev) => prev.filter((item) => item.id !== job.id))
      setApplications((prev) => prev.filter((item) => item.jobId !== job.id))
      if (selectedJobForApplicants?.id === job.id) {
        setSelectedJobForApplicants(null)
      }
      addNotification({
        title: "Job deleted",
        description: `"${job.title}" has been removed from the portal.`,
        type: "system",
      })
    } catch (err) {
      console.error("Failed to delete job:", err)
      alert(err instanceof Error ? err.message : "Failed to delete job")
    } finally {
      setDeletingJobId(null)
    }
  }

  const handlePostJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobTitle || !jobCompany || !jobLocation || !jobSalary || !jobDesc) {
      alert("Please fill in all required fields.")
      return
    }

    if (!allBatchesSelected && jobTargetBatchIds.length === 0) {
      alert("Select at least one batch, or choose All Batches.")
      return
    }

    const selectedBatches = allBatchesSelected
      ? []
      : batches.filter((batch: any) =>
          jobTargetBatchIds.includes(String(batch.id || batch._id))
        )

    const newJobPayload = {
      title: jobTitle,
      company: jobCompany,
      location: jobLocation,
      type: jobType,
      salary: jobSalary.trim().startsWith("₹") ? jobSalary.trim() : `₹${jobSalary.trim()}`,
      description: jobDesc,
      requirements: jobReqs ? jobReqs.split(",").map(r => r.trim()) : ["Relevant skills"],
      postedDate: new Date().toISOString().split("T")[0],
      deadline: jobDeadline || "2026-07-01",
      active: true,
      targetBatchIds: allBatchesSelected
        ? []
        : selectedBatches.map((batch: any) => String(batch.id || batch._id)),
      targetBatchCodes: allBatchesSelected
        ? []
        : selectedBatches.map((batch: any) => batch.code),
    }

    try {
      const savedJob = await api.createJob(newJobPayload);
      setJobs([savedJob, ...jobs])
      setIsPostOpen(false)
      addNotification({
        title: "Job Posted Successfully",
        description: allBatchesSelected
          ? `Role "${jobTitle}" is visible to all batches.`
          : `Role "${jobTitle}" is visible to ${selectedBatches.map((b: any) => b.code).join(", ")}.`,
        type: "system"
      })

      // Reset Form
      setJobTitle("")
      setJobCompany("")
      setJobLocation("")
      setJobType("Full-time")
      setJobSalary("")
      setJobDesc("")
      setJobReqs("")
      setJobDeadline("")
      setJobTargetBatchIds([])
      setAllBatchesSelected(true)
    } catch (err) {
      alert("Error posting job.");
    }
  }

  const toggleJobTargetBatch = (batchId: string) => {
    setAllBatchesSelected(false)
    setJobTargetBatchIds((prev) =>
      prev.includes(batchId)
        ? prev.filter((id) => id !== batchId)
        : [...prev, batchId]
    )
  }

  const handleGenerateJobContent = async () => {
    if (!jobTitle.trim()) {
      alert("Enter a job title first so AI can draft the description and skills.")
      return
    }

    setIsGeneratingJobContent(true)
    try {
      const result = await api.generateJobContent({
        title: jobTitle.trim(),
        company: jobCompany.trim() || undefined,
        type: jobType,
        location: jobLocation.trim() || undefined,
      })

      setJobDesc(result.description || "")
      setJobReqs(
        Array.isArray(result.requirements)
          ? result.requirements.join(", ")
          : String(result.requirements || "")
      )

      addNotification({
        title: "AI Draft Ready",
        description: result.warning
          ? result.warning
          : `Generated description and skills for "${jobTitle.trim()}". Review before publishing.`,
        type: "system",
      })
    } catch (err) {
      console.error("Failed to generate job content:", err)
      alert(err instanceof Error ? err.message : "Failed to generate job content with AI.")
    } finally {
      setIsGeneratingJobContent(false)
    }
  }

  const handleApplyJob = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJobForDetail) return

    const appPayload = {
      studentName: user?.name || "Emily Parker",
      studentEmail: user?.email || "emily@apexacademy.com",
      coverLetter: coverLetter || "I am highly interested in this role and have completed matching courses in my academy program.",
      appliedDate: new Date().toISOString().split("T")[0],
      status: "Pending"
    }

    try {
      const savedApp = await api.applyForJob(selectedJobForDetail.id, appPayload)
      setApplications([savedApp, ...applications])
      setIsApplyOpen(false)
      setSelectedJobForDetail(null)
      setCoverLetter("")

      addNotification({
        title: "Application Submitted",
        description: `Your application for "${selectedJobForDetail.title}" at ${selectedJobForDetail.company} was submitted.`,
        type: "assignments"
      })

      alert("Success: Your job application has been submitted!")
    } catch (err) {
      console.error("Failed to apply for job:", err)
      alert("Failed to submit job application. Please try again.")
    }
  }

  const updateApplicationStatus = async (appId: string, newStatus: "Pending" | "InterviewScheduled" | "Interviewing" | "Selected" | "Rejected") => {
    try {
      const updatedApp = await api.updateApplicationStatus(appId, newStatus)
      setApplications(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app))
      if (feedDetailApp?.id === appId) {
        setFeedDetailApp(prev => prev ? { ...prev, status: newStatus } : prev)
      }

      const application = applications.find(a => a.id === appId)
      addNotification({
        title: "Application Status Updated",
        description: `Candidate status for "${application?.studentName}" changed to ${newStatus}.`,
        type: "system"
      })
    } catch (err) {
      console.error("Failed to update status:", err)
      alert("Failed to update candidate status.")
    }
  }

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!scheduleTarget || !interviewDate || !interviewTime || !interviewLocationOrLink) {
      alert("Please fill in all interview details.")
      return
    }

    const interviewDetails = {
      date: interviewDate,
      time: interviewTime,
      mode: interviewMode,
      locationOrLink: interviewLocationOrLink
    }

    try {
      await fetchAPI(`/jobs/applications/${scheduleTarget.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: "InterviewScheduled",
          interview: interviewDetails
        })
      })

      setApplications(prev => prev.map(app =>
        app.id === scheduleTarget.id
          ? { ...app, status: "InterviewScheduled", interview: interviewDetails }
          : app
      ))

      // Also update feedDetailApp if it's the same app
      if (feedDetailApp?.id === scheduleTarget.id) {
        setFeedDetailApp(prev => prev ? { ...prev, status: "InterviewScheduled", interview: interviewDetails } : prev)
      }

      addNotification({
        title: "Interview Scheduled",
        description: `Interview for ${scheduleTarget.studentName} scheduled on ${interviewDate} at ${interviewTime}.`,
        type: "assignments"
      })

      // Reset
      setScheduleTarget(null)
      setInterviewDate("")
      setInterviewTime("")
      setInterviewMode("online")
      setInterviewLocationOrLink("")
    } catch (err) {
      console.error("Failed to schedule interview:", err)
      alert("Failed to schedule interview.")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Selected":
        return <Badge variant="success" className="gap-1"><UserCheck className="h-3 w-3" /> Offer Made</Badge>
      case "Interviewing":
        return <Badge variant="warning" className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1"><Clock className="h-3 w-3" /> Interviewing</Badge>
      case "InterviewScheduled":
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 gap-1"><CalendarCheck className="h-3 w-3" /> Interview Scheduled</Badge>
      case "Rejected":
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>
      default:
        return <Badge variant="secondary" className="gap-1"><ClipboardList className="h-3 w-3" /> Pending</Badge>
    }
  }

  // Status pipeline steps for visual timeline
  const getStatusStep = (status: string) => {
    switch (status) {
      case "Pending": return 0
      case "InterviewScheduled": return 1
      case "Interviewing": return 2
      case "Selected": return 3
      case "Rejected": return -1
      default: return 0
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case "Full-time":
        return <Badge variant="default">Full-time</Badge>
      case "Internship":
        return <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">Internship</Badge>
      default:
        return <Badge className="bg-orange-500/10 text-orange-400 border-orange-500/20">Part-time</Badge>
    }
  }

  // Simulated AI File parsing flow
  const startSimulatedAnalysis = (profileType: "react" | "design" | "backend", customFileName?: string) => {
    setIsAnalyzing(true)
    setAnalysisProgress(0)
    setAnalysisProfile(profileType)
    setResumeUploaded(false)
    setUploadedFileName(customFileName || `${profileType}_resume_formatted.pdf`)

    const interval = setInterval(() => {
      setAnalysisProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setIsAnalyzing(false)
          setResumeUploaded(true)
          addNotification({
            title: "AI Analysis Complete",
            description: "Resume parsed successfully. Job matches identified.",
            type: "system"
          })
          return 100
        }
        return prev + 25
      })
    }, 450)
  }

  // Retrieve matching score results based on current profile state
  const getAIRecommendations = () => {
    if (!analysisProfile) return []

    switch (analysisProfile) {
      case "react":
        return [
          {
            jobId: "job-1", // Junior Full Stack Developer
            score: 96,
            reason: "Matches all core skills (React, TypeScript, TailwindCSS, REST APIs) in your project experience.",
            coverNote: "Hi hiring team! Based on my uploaded resume, I have a 96% profile match for this position. I specialize in Full-stack React & TypeScript development, which align perfectly with your technical stack. I would love to showcase my portfolio project showing similar API configurations."
          },
          {
            jobId: "job-3", // Backend API Engineer
            score: 75,
            reason: "Strong backend JavaScript/Node.js compatibility. Missing specific NestJS and Docker cloud scaling components.",
            coverNote: "Hello! My resume matches 75% of your Backend engineering skills list. I possess Node.js and SQL database skills from my React Fullstack projects and would love to adapt to NestJS and Docker environments."
          },
          {
            jobId: "job-2", // UI/UX Designer Apprentice
            score: 22,
            reason: "Minor overlap with interface layouts design. Significant skill gap in wireframing and Figma workflow.",
            coverNote: "Greetings. I have a 22% score correlation. Although my focus is Frontend engineering, I have minor web styling capabilities."
          }
        ]
      case "design":
        return [
          {
            jobId: "job-2", // UI/UX Designer Apprentice
            score: 98,
            reason: "Perfect skill correlation: Figma mockups, interactive prototyping, and user journey layouts.",
            coverNote: "Dear hiring team! My design profile matching score is 98%. I have worked extensively in Figma designing prototypes and digital portfolios. I am eager to apply my wireframing skills to Apex Design Hub."
          },
          {
            jobId: "job-1", // Junior Full Stack Developer
            score: 35,
            reason: "Matches visual design and styling elements. Lack of core programming languages (Node.js/SQL) in history.",
            coverNote: "Hi there! I match 35% of your stack (Tailwind CSS interface mockup layouts). I can support your developer team on styling."
          },
          {
            jobId: "job-3", // Backend API Engineer
            score: 5,
            reason: "No overlapping backend databases or cloud hosting technologies found in designer history.",
            coverNote: "Hello. I have a 5% matching score, but I'm eager to learn node development."
          }
        ]
      case "backend":
        return [
          {
            jobId: "job-3", // Backend API Engineer
            score: 94,
            reason: "Demonstrated skills in database query indexing, Node.js server frameworks, and virtual container hosting.",
            coverNote: "Dear recruiter. My resume shows a 94% matching profile. I have deep experience building secure Node.js APIs, configuring SQL queries, and docker containers. I look forward to supporting your microservice performance benchmarks."
          },
          {
            jobId: "job-1", // Junior Full Stack Developer
            score: 82,
            reason: "Matches server development, JSON endpoints, and SQL storage requirements. Missing React client UI history.",
            coverNote: "Hi! My background is 82% matched with this role, covering Node.js database servers. I have basic React layouts knowledge as well."
          },
          {
            jobId: "job-2", // UI/UX Designer Apprentice
            score: 10,
            reason: "No compatibility with Figma wireframes or design prototypes.",
            coverNote: "Hello. I am a backend specialist with a 10% design compatibility score."
          }
        ]
    }
  }

  const aiMatches = getAIRecommendations()

  return (
    <PageFeatureGate feature="enableJobPortal">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            <span>Academy Job Portal</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isStudent
              ? "Discover placement opportunities, submit your applications, and track recruiter responses."
              : "Post new job requirements, manage candidates, and review incoming graduate profiles."}
          </p>
        </div>
        {!isStudent && (
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setIsPostOpen(true)}>
            Post a Job
          </Button>
        )}
      </div>

      {!isStudent ? (
        /* OWNER / TRAINER RECRUITER VIEW */
        <div className="space-y-6">
          {/* Recruiter Dashboard Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Total Listings</span>
                <p className="text-2xl font-black mt-1 text-foreground">{jobs.length}</p>
                <span className="text-[10px] text-emerald-400 mt-1 block">Live vacancies</span>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Applications</span>
                <p className="text-2xl font-black mt-1 text-foreground">{applications.length}</p>
                <span className="text-[10px] text-primary mt-1 block">Received candidates</span>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Interview Stages</span>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {applications.filter(a => a.status === "Interviewing").length}
                </p>
                <span className="text-[10px] text-amber-400 mt-1 block">Scheduled reviews</span>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Offers Sent</span>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {applications.filter(a => a.status === "Selected").length}
                </p>
                <span className="text-[10px] text-emerald-500 mt-1 block">Hired students</span>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="listings">
            <TabsList className="bg-secondary/60 border border-border/80 w-80 grid grid-cols-2 mb-4">
              <TabsTrigger value="listings">Active Listings</TabsTrigger>
              <TabsTrigger value="applications">Applications Feed</TabsTrigger>
            </TabsList>

            <TabsContent value="listings" className="mt-0">
              {selectedJobForApplicants ? (
                /* Applicants Details for Selected Job */
                <Card className="bg-card">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/40 pb-4">
                    <div>
                      <button
                        onClick={() => setSelectedJobForApplicants(null)}
                        className="text-xs text-primary font-semibold hover:underline flex items-center gap-1 mb-1.5 cursor-pointer"
                      >
                        <ArrowLeft className="h-3 w-3" /> Back to job lists
                      </button>
                      <CardTitle className="text-base font-extrabold text-foreground">
                        Applicants for: {selectedJobForApplicants.title}
                      </CardTitle>
                      <CardDescription>{selectedJobForApplicants.company}</CardDescription>
                    </div>
                    {getTypeBadge(selectedJobForApplicants.type)}
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {applications.filter(a => a.jobId === selectedJobForApplicants.id).length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground text-xs">
                        No candidates have applied for this vacancy yet.
                      </div>
                    ) : (
                      applications
                        .filter(a => a.jobId === selectedJobForApplicants.id)
                        .map((app) => (
                          <div key={app.id} className="p-4 rounded-xl border border-border bg-secondary/20 space-y-3">
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <div>
                                <h4 className="text-sm font-bold text-foreground">{app.studentName}</h4>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                  <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  {app.studentEmail}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-muted-foreground mr-1.5">Applied: {app.appliedDate}</span>
                                {getStatusBadge(app.status)}
                              </div>
                            </div>

                            <div className="bg-secondary/40 p-3 rounded-lg border border-border/30 text-xs text-muted-foreground leading-relaxed">
                              <span className="block font-semibold text-foreground text-[10px] uppercase tracking-wider mb-1">Cover Note</span>
                              {app.coverLetter}
                            </div>

                            <div className="flex gap-2 pt-1">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={CalendarCheck}
                                onClick={() => setScheduleTarget(app)}
                                className="text-xs border-blue-500/20 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                              >
                                Schedule Interview
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={CheckCircle2}
                                onClick={() => updateApplicationStatus(app.id, "Selected")}
                                className="text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                              >
                                Make Offer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={XCircle}
                                onClick={() => updateApplicationStatus(app.id, "Rejected")}
                                className="text-xs border-red-500/20 text-red-400 hover:bg-red-500/10 cursor-pointer"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                        ))
                    )}
                  </CardContent>
                </Card>
              ) : (
                /* Recruiter Active Jobs Grid */
                <div className="grid gap-4 sm:grid-cols-2">
                  {jobs.map((job) => {
                    const applicantCount = applications.filter(a => a.jobId === job.id).length
                    return (
                      <Card key={job.id} className="bg-card flex flex-col justify-between hover:border-border transition-all duration-200">
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{job.company}</span>
                              <CardTitle className="text-base font-extrabold text-foreground mt-0.5">{job.title}</CardTitle>
                            </div>
                            {getTypeBadge(job.type)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xs text-muted-foreground">
                          <div className="space-y-2">
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{job.location}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-foreground font-semibold">{job.salary}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span>Deadline: {job.deadline}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 shrink-0" />
                              <span>Visible to: {formatJobBatchLabel(job)}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40 gap-2">
                            <Badge variant="outline" className="text-xs py-0.5 px-2 bg-muted/40">
                              {applicantCount} Applicant{applicantCount !== 1 ? "s" : ""}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                icon={Trash2}
                                disabled={deletingJobId === job.id}
                                onClick={() => void handleDeleteJob(job)}
                                className="text-xs border-red-500/20 text-red-500 hover:bg-red-500/10 cursor-pointer"
                              >
                                {deletingJobId === job.id ? "Deleting…" : "Delete"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                icon={ArrowUpRight}
                                onClick={() => setSelectedJobForApplicants(job)}
                                className="text-xs cursor-pointer"
                              >
                                View Candidates
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="applications" className="mt-0 space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Pending", count: applications.filter(a => a.status === "Pending").length, color: "text-muted-foreground", bg: "bg-secondary/40" },
                  { label: "Interview Scheduled", count: applications.filter(a => a.status === "InterviewScheduled").length, color: "text-blue-400", bg: "bg-blue-500/5" },
                  { label: "Interviewing", count: applications.filter(a => a.status === "Interviewing").length, color: "text-amber-400", bg: "bg-amber-500/5" },
                  { label: "Offer Made", count: applications.filter(a => a.status === "Selected").length, color: "text-emerald-400", bg: "bg-emerald-500/5" },
                ].map(stat => (
                  <div key={stat.label} className={`rounded-xl border border-border/40 p-3 ${stat.bg}`}>
                    <p className={`text-xl font-black ${stat.color}`}>{stat.count}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
                  </div>
                ))}
              </div>

              <Card className="bg-card">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-base font-extrabold">All Candidate Applications</CardTitle>
                  <CardDescription>Global tracking feed of graduate placements. Click a candidate to manage their pipeline.</CardDescription>
                </CardHeader>
                <div className="divide-y divide-border/40">
                  {applications.length === 0 ? (
                    <div className="py-14 text-center text-muted-foreground text-xs">No applications yet.</div>
                  ) : (
                    applications.map((app) => {
                      const job = jobs.find(j => j.id === app.jobId)
                      const step = getStatusStep(app.status)
                      const isRejected = app.status === "Rejected"
                      const pipelineSteps = [
                        { label: "Pending", icon: ClipboardList },
                        { label: "Scheduled", icon: CalendarCheck },
                        { label: "Interviewing", icon: Clock },
                        { label: "Closed", icon: CheckCircle2 },
                      ]

                      return (
                        <div key={app.id} className="p-4 space-y-3">
                          {/* Candidate Row */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Avatar */}
                              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                                {app.studentName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-foreground text-sm truncate">{app.studentName}</p>
                                <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                                  <Mail className="h-3 w-3 shrink-0" />
                                  {app.studentEmail}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  Applied for <strong className="text-foreground/80">{job?.title}</strong> · {app.appliedDate}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {getStatusBadge(app.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setFeedDetailApp(app)}
                                className="text-xs cursor-pointer"
                              >
                                Manage
                              </Button>
                            </div>
                          </div>

                          {/* Pipeline Timeline */}
                          {!isRejected ? (
                            <div className="flex items-center gap-0 pl-0 pt-1">
                              {pipelineSteps.map((s, idx) => {
                                const done = step > idx
                                const active = step === idx
                                const Icon = s.icon
                                return (
                                  <React.Fragment key={s.label}>
                                    <div className="flex flex-col items-center gap-1">
                                      <div className={`h-6 w-6 rounded-full flex items-center justify-center border transition-all ${
                                        done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                                        active ? "bg-primary/15 border-primary/40 text-primary" :
                                        "bg-secondary/30 border-border/30 text-muted-foreground/50"
                                      }`}>
                                        <Icon className="h-3 w-3" />
                                      </div>
                                      <span className={`text-[9px] font-medium ${
                                        done ? "text-emerald-400" : active ? "text-primary" : "text-muted-foreground/50"
                                      }`}>{s.label}</span>
                                    </div>
                                    {idx < pipelineSteps.length - 1 && (
                                      <div className={`flex-1 h-[2px] mb-4 mx-1 rounded-full transition-all ${
                                        done ? "bg-emerald-500/40" : "bg-border/30"
                                      }`} />
                                    )}
                                  </React.Fragment>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-[10px] text-red-400">
                              <XCircle className="h-3.5 w-3.5" />
                              Application closed — candidate was not selected.
                            </div>
                          )}

                          {/* Scheduled Interview Info */}
                          {app.interview && app.status !== "Rejected" && (
                            <div className="ml-0 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs space-y-1.5">
                              <p className="font-semibold text-blue-300 flex items-center gap-1.5">
                                <CalendarCheck className="h-3.5 w-3.5" />
                                Interview Scheduled
                              </p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {app.interview.date}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {app.interview.time}
                                </span>
                                <span className="flex items-center gap-1 col-span-2 sm:col-span-1">
                                  {app.interview.mode === "online" ? (
                                    <><Video className="h-3 w-3 text-blue-400" /> <span className="text-blue-300 font-medium truncate">{app.interview.locationOrLink}</span></>
                                  ) : (
                                    <><MapPin className="h-3 w-3 text-amber-400" /> <span className="text-foreground/80 truncate">{app.interview.locationOrLink}</span></>
                                  )}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      ) : (
        /* STUDENT APPLICANT VIEW */
        <div className="space-y-6">
          {/* Student Status Grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Open Roles</span>
                <p className="text-2xl font-black mt-1 text-foreground">{visibleJobs.length}</p>
                <span className="text-[10px] text-primary mt-1 block">Active placements</span>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Applied Vacancies</span>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {applications.filter(a => a.studentId === user?.id).length}
                </p>
                <span className="text-[10px] text-amber-400 mt-1 block">Submitted resumes</span>
              </CardContent>
            </Card>
            <Card className="bg-card">
              <CardContent className="p-4">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase">Pending Interview Calls</span>
                <p className="text-2xl font-black mt-1 text-foreground">
                  {applications.filter(a => a.studentId === user?.id && a.status === "Interviewing").length}
                </p>
                <span className="text-[10px] text-emerald-400 mt-1 block">Hiring callbacks</span>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="jobs">
            <TabsList className="bg-secondary/60 border border-border/80 w-full max-w-lg grid grid-cols-3 mb-4">
              <TabsTrigger value="jobs">Job Listings</TabsTrigger>
              <TabsTrigger value="applied">My Applications</TabsTrigger>
              <TabsTrigger value="ai-match" className="gap-1.5 flex items-center">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
                <span>AI Job Matcher</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Standard Job Listings */}
            <TabsContent value="jobs" className="mt-0 space-y-4">
              {/* Search and Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search roles, tech stack, or companies..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-card pl-9 text-xs"
                  />
                </div>
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-card text-xs w-full sm:w-44"
                >
                  <option value="All">All Job Types</option>
                  <option value="Full-time">Full-time</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Internship">Internship</option>
                </Select>
              </div>

              {/* Jobs Listing Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleJobs
                  .filter((job) => {
                    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      job.description.toLowerCase().includes(searchQuery.toLowerCase())
                    const matchesType = filterType === "All" || job.type === filterType
                    return matchesSearch && matchesType
                  }).length === 0 ? (
                  <div className="sm:col-span-2 text-center py-12 text-muted-foreground text-xs border border-dashed border-border rounded-xl">
                    No job listings for your batch right now. Check back later or contact placement support.
                  </div>
                ) : null}
                {visibleJobs
                  .filter((job) => {
                    const matchesSearch = job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      job.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      job.description.toLowerCase().includes(searchQuery.toLowerCase())
                    const matchesType = filterType === "All" || job.type === filterType
                    return matchesSearch && matchesType
                  })
                  .map((job) => {
                    const hasApplied = applications.some(a => a.jobId === job.id && a.studentId === user?.id)
                    const applicationRecord = applications.find(a => a.jobId === job.id && a.studentId === user?.id)

                    return (
                      <Card key={job.id} className="bg-card flex flex-col justify-between hover:border-border transition-all duration-200">
                        <CardHeader className="pb-3 border-b border-border/40">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">{job.company}</span>
                              <CardTitle className="text-base font-extrabold text-foreground mt-0.5">{job.title}</CardTitle>
                            </div>
                            {getTypeBadge(job.type)}
                          </div>
                        </CardHeader>
                        <CardContent className="pt-4 space-y-4 text-xs text-muted-foreground">
                          <div className="space-y-2">
                            <p className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span>{job.location}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <IndianRupee className="h-4 w-4 text-primary shrink-0" />
                              <span className="text-foreground font-semibold">{job.salary}</span>
                            </p>
                            <p className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 shrink-0" />
                              <span>Apply before: {job.deadline}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-border/40">
                            {hasApplied ? (
                              <div className="flex items-center gap-1.5">
                                <span className="h-2 w-2 bg-emerald-400 rounded-full" />
                                <span className="text-[10px] font-bold text-foreground">Applied</span>
                                <span className="text-[10px] opacity-75">({applicationRecord?.status})</span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">Posted: {job.postedDate}</span>
                            )}
                            <Button
                              variant={hasApplied ? "outline" : "primary"}
                              size="sm"
                              onClick={() => {
                                setSelectedJobForDetail(job)
                                setIsApplyOpen(false)
                              }}
                              className="text-xs cursor-pointer"
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </TabsContent>

            {/* Tab 2: My Applications */}
            <TabsContent value="applied" className="mt-0">
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="text-base font-extrabold">My Applications History</CardTitle>
                  <CardDescription>Real-time review updates on roles you applied to.</CardDescription>
                </CardHeader>
                <CardContent className="divide-y divide-border/50 p-0">
                  {applications.filter(a => a.studentId === user?.id).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-xs">
                      You have not submitted any job applications yet. Go to Job Listings to apply!
                    </div>
                  ) : (
                    applications
                      .filter(a => a.studentId === user?.id)
                      .map((app) => {
                        const job = jobs.find(j => j.id === app.jobId)
                        return (
                          <div key={app.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 text-xs">
                            <div className="space-y-1">
                              <p className="font-bold text-foreground text-sm">{job?.title || "Role Vacancy"}</p>
                              <p className="text-muted-foreground">{job?.company} • {job?.location}</p>
                              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Submitted: {app.appliedDate}
                              </p>
                            </div>

                            <div className="flex items-center gap-4 shrink-0">
                              {getStatusBadge(app.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (job) setSelectedJobForDetail(job)
                                }}
                                className="text-xs cursor-pointer"
                              >
                                View Job
                              </Button>
                            </div>
                          </div>
                        )
                      })
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab 3: AI Resume Matcher & suggestions */}
            <TabsContent value="ai-match" className="mt-0 space-y-6">
              <Card className="bg-card border-primary/20">
                <CardHeader className="pb-3 border-b border-border/40">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Cpu className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-extrabold text-foreground flex items-center gap-1.5">
                        <span>AI Placement Recommendation Engine</span>
                        <Badge variant="default" className="text-[9px] py-0.5 bg-primary/20 text-primary border-primary/25 font-bold uppercase tracking-wider animate-pulse">Beta</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Upload your candidate resume or choose a preset mock profile to analyze matches against live job specifications.
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-5 space-y-5">

                  {/* Upload Drop Zone / Mock Selectors */}
                  {!isAnalyzing && !resumeUploaded && (
                    <div className="space-y-4">
                      {/* Interactive Drag & Drop Box */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/70 hover:border-primary/50 bg-muted/30 hover:bg-muted/50 rounded-xl p-8 cursor-pointer transition-all">
                        <UploadCloud className="h-9 w-9 text-muted-foreground mb-2.5" />
                        <span className="text-xs font-bold text-foreground">Click to upload your resume</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Accepts PDF, DOCX (Max 5MB)</span>
                        <input
                          type="file"
                          accept=".pdf,.docx,.doc"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) {
                              // Simulate scan based on matching name keywords
                              const fname = file.name.toLowerCase()
                              let matchedProfile: "react" | "design" | "backend" = "react"
                              if (fname.includes("design") || fname.includes("ui") || fname.includes("ux") || fname.includes("figma")) {
                                matchedProfile = "design"
                              } else if (fname.includes("back") || fname.includes("api") || fname.includes("node") || fname.includes("database")) {
                                matchedProfile = "backend"
                              }
                              startSimulatedAnalysis(matchedProfile, file.name)
                            }
                          }}
                        />
                      </label>

                      {/* Mock Profile Shortcuts */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">
                          Or try out the AI parser with a sample student resume:
                        </span>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <button
                            type="button"
                            onClick={() => startSimulatedAnalysis("react", "Fullstack_Developer_Emily.pdf")}
                            className="p-3 rounded-lg border border-border bg-secondary/10 hover:border-primary/40 hover:bg-secondary/30 text-left transition-all cursor-pointer"
                          >
                            <span className="block text-xs font-bold text-foreground">React Fullstack Profile</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">React, TS, SQL, Tailwind</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startSimulatedAnalysis("design", "UIUX_Product_Designer_Emily.pdf")}
                            className="p-3 rounded-lg border border-border bg-secondary/10 hover:border-primary/40 hover:bg-secondary/30 text-left transition-all cursor-pointer"
                          >
                            <span className="block text-xs font-bold text-foreground">UI/UX Designer Profile</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">Figma, Prototyping, Portfolios</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => startSimulatedAnalysis("backend", "Node_Backend_Engineer_Emily.pdf")}
                            className="p-3 rounded-lg border border-border bg-secondary/10 hover:border-primary/40 hover:bg-secondary/30 text-left transition-all cursor-pointer"
                          >
                            <span className="block text-xs font-bold text-foreground">Node/API Backend Specialist</span>
                            <span className="block text-[10px] text-muted-foreground mt-0.5">NestJS, Docker, AWS, APIs</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scanning Animation */}
                  {isAnalyzing && (
                    <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-foreground">AI Resume Parser Analyzing: {uploadedFileName}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {analysisProgress < 40 && "Extracting skill weights..."}
                          {analysisProgress >= 40 && analysisProgress < 85 && "Correlating credentials with 3 active job specs..."}
                          {analysisProgress >= 85 && "Generating match scores..."}
                        </p>
                      </div>
                      <div className="h-1.5 w-64 bg-secondary border border-border/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${analysisProgress}%` }}
                        />
                      </div>
                      <span className="text-xs text-primary font-mono font-bold">{analysisProgress}%</span>
                    </div>
                  )}

                  {/* Parse Results & Match List */}
                  {resumeUploaded && !isAnalyzing && (
                    <div className="space-y-5">
                      {/* Extracted Details */}
                      <div className="p-4 rounded-xl border border-border bg-secondary/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-primary uppercase tracking-wider block">Parsed Document</span>
                          <span className="text-xs font-bold text-foreground">{uploadedFileName}</span>
                          <p className="text-[10px] text-muted-foreground leading-normal mt-1">
                            Detected specialization: <strong className="text-foreground uppercase">{analysisProfile === "react" ? "React Developer" : analysisProfile === "design" ? "Product Designer" : "Backend Engineer"}</strong>
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setResumeUploaded(false)
                              setAnalysisProfile(null)
                            }}
                            className="text-xs cursor-pointer"
                          >
                            Re-upload Resume
                          </Button>
                        </div>
                      </div>

                      {/* AI Extracted Skills */}
                      <div className="space-y-2">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Extracted Skill Matrix tags:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {analysisProfile === "react" && ["React.js", "TypeScript", "JavaScript", "Tailwind CSS", "REST APIs", "Git"].map(s => (
                            <Badge key={s} variant="outline" className="bg-secondary text-foreground py-0.5 px-2 border-border/60">{s}</Badge>
                          ))}
                          {analysisProfile === "design" && ["Figma Pro", "Wireframing", "Visual Prototyping", "User Research", "Adobe XD"].map(s => (
                            <Badge key={s} variant="outline" className="bg-secondary text-foreground py-0.5 px-2 border-border/60">{s}</Badge>
                          ))}
                          {analysisProfile === "backend" && ["Node.js", "NestJS", "Express", "SQL Databases", "Docker Containers", "AWS Cloud"].map(s => (
                            <Badge key={s} variant="outline" className="bg-secondary text-foreground py-0.5 px-2 border-border/60">{s}</Badge>
                          ))}
                        </div>
                      </div>

                      {/* Correlation matches */}
                      <div className="space-y-3 pt-2">
                        <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          Matching Jobs (Sorted by AI Suitability Score):
                        </span>
                        <div className="space-y-3">
                          {aiMatches
                            .sort((a, b) => b.score - a.score)
                            .map((match) => {
                              const job = jobs.find(j => j.id === match.jobId)
                              if (!job) return null
                              const alreadyApplied = applications.some(a => a.jobId === job.id && a.studentId === user?.id)

                              return (
                                <div key={match.jobId} className="p-4 rounded-xl border border-border/80 bg-secondary/15 hover:bg-secondary/25 transition-all space-y-3">
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                                    <div>
                                      <h4 className="text-xs font-bold text-muted-foreground uppercase">{job.company}</h4>
                                      <h3 className="text-sm font-bold text-foreground mt-0.5">{job.title}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <div className={`text-xs font-black px-2.5 py-1 rounded-lg flex items-center gap-1 ${match.score >= 90
                                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        : match.score >= 70
                                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                          : "bg-muted text-muted-foreground border border-border/40"
                                        }`}>
                                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                                        <span>{match.score}% Match</span>
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-muted-foreground leading-relaxed bg-secondary/25 p-2.5 rounded-lg border border-border/25">
                                    <strong className="text-primary text-[9px] uppercase tracking-wider block mb-0.5">AI MATCH RATIONALE</strong>
                                    {match.reason}
                                  </p>

                                  <div className="flex justify-between items-center pt-1">
                                    <div className="text-[10px] text-muted-foreground">
                                      <span>Salary: {job.salary}</span>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                          setSelectedJobForDetail(job)
                                          setIsApplyOpen(false)
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        View Details
                                      </Button>
                                      {alreadyApplied ? (
                                        <Badge variant="outline" className="text-xs py-0.5 px-2 bg-emerald-500/5 text-emerald-400 border-emerald-500/20 gap-1 font-semibold">
                                          <Check className="h-3 w-3" /> Applied
                                        </Badge>
                                      ) : (
                                        <Button
                                          variant="primary"
                                          size="sm"
                                          icon={Send}
                                          onClick={() => {
                                            setSelectedJobForDetail(job)
                                            setCoverLetter(match.coverNote)
                                            setIsApplyOpen(true)
                                          }}
                                          className="text-xs cursor-pointer"
                                        >
                                          Apply with AI Cover Note
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                        </div>
                      </div>

                    </div>
                  )}

                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Recruiter: Create Job Dialog */}
      <Dialog
        isOpen={isPostOpen}
        onClose={() => setIsPostOpen(false)}
        title="Post New Vacancy"
        description="Choose which batch(es) should see this role on the student job portal."
      >
        <form onSubmit={handlePostJob} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Job Title</label>
              <Input
                placeholder="e.g. Frontend Developer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Company Name</label>
              <Input
                placeholder="e.g. Acme Corp"
                value={jobCompany}
                onChange={(e) => setJobCompany(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Campus / Job Location</label>
              <Input
                placeholder="e.g. Remote or NYC office"
                value={jobLocation}
                onChange={(e) => setJobLocation(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Salary Budget (INR)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">₹</span>
                <Input
                  placeholder="e.g. 6 LPA - 8 LPA or 500/hr"
                  value={jobSalary}
                  onChange={(e) => setJobSalary(e.target.value)}
                  className="bg-card text-xs h-9.5 pl-7"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3.5">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Job Type</label>
              <Select
                value={jobType}
                onChange={(e) => setJobType(e.target.value as any)}
                className="bg-card text-xs h-9.5"
              >
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
                <option value="Internship">Internship</option>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Apply Deadline</label>
              <Input
                type="date"
                value={jobDeadline}
                onChange={(e) => setJobDeadline(e.target.value)}
                className="bg-card text-xs h-9.5"
              />
            </div>
          </div>

          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                AI Job Posting Helper
              </p>
              <p className="text-[10px] text-muted-foreground">
                Uses the job title{jobCompany ? ", company," : ""} and role type to draft the description and required skills.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={isGeneratingJobContent ? Loader2 : Sparkles}
              disabled={isGeneratingJobContent || !jobTitle.trim()}
              onClick={() => void handleGenerateJobContent()}
              className={`text-xs shrink-0 border-primary/20 text-primary hover:bg-primary/10 ${
                isGeneratingJobContent ? "[&_svg]:animate-spin" : ""
              }`}
            >
              {isGeneratingJobContent ? "Generating…" : "Generate with AI"}
            </Button>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Job Description</label>
            <textarea
              placeholder="Roles, responsibilities, daily workflows..."
              value={jobDesc}
              onChange={(e) => setJobDesc(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground">Key Skills / Requirements (Comma-separated)</label>
            <Input
              placeholder="React, TypeScript, Figma, Tailwind"
              value={jobReqs}
              onChange={(e) => setJobReqs(e.target.value)}
              className="bg-card text-xs h-9.5"
            />
          </div>

          <div className="space-y-2 border-t border-border/40 pt-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-muted-foreground">Target Batch(es)</label>
              <span className="text-[10px] text-muted-foreground">Required</span>
            </div>

            <label className="flex items-center gap-2 rounded-lg border border-border/70 bg-secondary/20 px-3 py-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allBatchesSelected}
                onChange={(e) => {
                  setAllBatchesSelected(e.target.checked)
                  if (e.target.checked) {
                    setJobTargetBatchIds([])
                  }
                }}
                className="rounded border-border/80 text-primary focus:ring-primary cursor-pointer"
              />
              <span className="text-xs font-medium text-foreground">All Batches</span>
            </label>

            {!allBatchesSelected && (
              <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-lg border border-border/70 bg-card p-2">
                {batches.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground px-2 py-3 text-center">
                    No batches found. Create a batch first under Courses.
                  </p>
                ) : (
                  batches.map((batch: any) => {
                    const batchId = String(batch.id || batch._id)
                    const checked = jobTargetBatchIds.includes(batchId)
                    return (
                      <label
                        key={batchId}
                        className={`flex items-start gap-2 rounded-md px-2 py-2 cursor-pointer transition-colors ${
                          checked ? "bg-primary/5 border border-primary/20" : "hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleJobTargetBatch(batchId)}
                          className="mt-0.5 rounded border-border/80 text-primary focus:ring-primary cursor-pointer"
                        />
                        <span className="min-w-0">
                          <span className="block text-xs font-semibold text-foreground">{batch.code}</span>
                          <span className="block text-[10px] text-muted-foreground truncate">
                            {batch.courseName} • {batch.schedule}
                          </span>
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsPostOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Publish Role
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Student: Job Details and Apply Dialog */}
      <Dialog
        isOpen={!!selectedJobForDetail}
        onClose={() => {
          setSelectedJobForDetail(null)
          setIsApplyOpen(false)
        }}
        title={selectedJobForDetail?.title || "Job Details"}
        description={selectedJobForDetail?.company || "Recruiting Company"}
      >
        {selectedJobForDetail && (
          <div className="space-y-5 text-xs text-muted-foreground leading-normal">
            {!isApplyOpen ? (
              /* Description View */
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 p-3 bg-secondary/20 border border-border/40 rounded-xl">
                  <div>
                    <span className="block font-semibold text-[10px] text-muted-foreground uppercase">Location</span>
                    <span className="text-foreground font-medium flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3.5 w-3.5" /> {selectedJobForDetail.location}
                    </span>
                  </div>
                  <div>
                    <span className="block font-semibold text-[10px] text-muted-foreground uppercase">Salary Budget (INR)</span>
                    <span className="text-primary font-bold flex items-center gap-1 mt-0.5">
                      <IndianRupee className="h-3.5 w-3.5" /> {selectedJobForDetail.salary}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Role Overview</h4>
                  <p className="bg-secondary/15 p-3 rounded-lg border border-border/30 text-foreground leading-relaxed">
                    {selectedJobForDetail.description}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <h4 className="font-bold text-foreground text-xs uppercase tracking-wider">Key Requirements</h4>
                  <ul className="list-disc pl-4 space-y-1 text-foreground">
                    {selectedJobForDetail.requirements.map((req, idx) => (
                      <li key={idx}>{req}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-between items-center">
                  <span className="text-[10px] text-muted-foreground">Deadline: {selectedJobForDetail.deadline}</span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedJobForDetail(null)}
                    >
                      Close
                    </Button>
                    {isStudent && (
                      <Button
                        variant="primary"
                        size="sm"
                        icon={Send}
                        disabled={applications.some(a => a.jobId === selectedJobForDetail.id && a.studentId === user?.id)}
                        onClick={() => setIsApplyOpen(true)}
                        className="cursor-pointer"
                      >
                        {applications.some(a => a.jobId === selectedJobForDetail.id && a.studentId === user?.id)
                          ? "Already Applied"
                          : "Apply Now"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* Application Form View */
              <form onSubmit={handleApplyJob} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Write custom Cover Note / Application message</label>
                  <p className="text-[10px] text-muted-foreground">
                    Introduce yourself, tell the hiring team about your portfolio projects, or why you are a good fit.
                  </p>
                  <textarea
                    rows={4}
                    placeholder="Hello hiring team, I am interested in..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    className="w-full rounded-lg border border-border bg-card p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="pt-3 border-t border-border/50 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsApplyOpen(false)}
                  >
                    Back to Details
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    icon={Send}
                  >
                    Submit Application
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Dialog>

      {/* Recruiter: Manage Application Detail Dialog */}
      <Dialog
        isOpen={!!feedDetailApp}
        onClose={() => setFeedDetailApp(null)}
        title={feedDetailApp?.studentName || "Application"}
        description={feedDetailApp ? `Application for ${jobs.find(j => j.id === feedDetailApp.jobId)?.title || "role"}` : ""}
      >
        {feedDetailApp && (() => {
          const job = jobs.find(j => j.id === feedDetailApp.jobId)
          // Sync with live applications state
          const liveApp = applications.find(a => a.id === feedDetailApp.id) || feedDetailApp
          const step = getStatusStep(liveApp.status)

          return (
            <div className="space-y-5 text-xs text-muted-foreground">
              {/* Candidate Info */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/20 border border-border/30">
                <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                  {feedDetailApp.studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                </div>
                <div>
                  <p className="font-bold text-foreground text-sm">{feedDetailApp.studentName}</p>
                  <p className="flex items-center gap-1 text-muted-foreground mt-0.5">
                    <Mail className="h-3 w-3" /> {feedDetailApp.studentEmail}
                  </p>
                  <p className="mt-0.5 text-[10px]">
                    Applied: {feedDetailApp.appliedDate} &bull; {job?.company}
                  </p>
                </div>
              </div>

              {/* Current Status */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Current Status</span>
                {getStatusBadge(liveApp.status)}
              </div>

              {/* Pipeline Tracker */}
              {liveApp.status !== "Rejected" && (() => {
                const pipelineSteps = [
                  { label: "Pending", icon: ClipboardList },
                  { label: "Scheduled", icon: CalendarCheck },
                  { label: "Interviewing", icon: Clock },
                  { label: "Closed", icon: CheckCircle2 },
                ]
                return (
                  <div className="flex items-center gap-0">
                    {pipelineSteps.map((s, idx) => {
                      const done = step > idx
                      const active = step === idx
                      const Icon = s.icon
                      return (
                        <React.Fragment key={s.label}>
                          <div className="flex flex-col items-center gap-1">
                            <div className={`h-7 w-7 rounded-full flex items-center justify-center border transition-all ${
                              done ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" :
                              active ? "bg-primary/15 border-primary/40 text-primary" :
                              "bg-secondary/30 border-border/30 text-muted-foreground/40"
                            }`}>
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <span className={`text-[9px] font-medium ${
                              done ? "text-emerald-400" : active ? "text-primary" : "text-muted-foreground/40"
                            }`}>{s.label}</span>
                          </div>
                          {idx < pipelineSteps.length - 1 && (
                            <div className={`flex-1 h-[2px] mb-5 mx-1 rounded-full ${
                              done ? "bg-emerald-500/40" : "bg-border/30"
                            }`} />
                          )}
                        </React.Fragment>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Interview Details (if scheduled) */}
              {liveApp.interview && (
                <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 space-y-2">
                  <p className="font-bold text-blue-300 flex items-center gap-1.5 text-xs">
                    <CalendarCheck className="h-3.5 w-3.5" /> Interview Details
                  </p>
                  <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                    <div>
                      <span className="text-[9px] font-semibold uppercase text-muted-foreground/70 block">Date</span>
                      <span className="text-foreground font-medium flex items-center gap-1"><Calendar className="h-3 w-3" /> {liveApp.interview.date}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-semibold uppercase text-muted-foreground/70 block">Time</span>
                      <span className="text-foreground font-medium flex items-center gap-1"><Clock className="h-3 w-3" /> {liveApp.interview.time}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[9px] font-semibold uppercase text-muted-foreground/70 block mb-0.5">
                        {liveApp.interview.mode === "online" ? "Meeting Link" : "Venue Address"}
                      </span>
                      <span className={`flex items-center gap-1.5 font-medium break-all ${liveApp.interview.mode === "online" ? "text-blue-300" : "text-foreground"}`}>
                        {liveApp.interview.mode === "online"
                          ? <><Video className="h-3.5 w-3.5 shrink-0" /> {liveApp.interview.locationOrLink}</>
                          : <><MapPin className="h-3.5 w-3.5 shrink-0 text-amber-400" /> {liveApp.interview.locationOrLink}</>
                        }
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Cover Letter */}
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 block mb-1">Cover Note</span>
                <p className="bg-secondary/20 border border-border/30 rounded-lg p-3 text-foreground/80 leading-relaxed">
                  {feedDetailApp.coverLetter}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border/40 space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Update Pipeline Stage</p>
                <div className="flex flex-wrap gap-2">
                  {liveApp.status === "Pending" && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={CalendarCheck}
                      onClick={() => {
                        setScheduleTarget(liveApp)
                        setFeedDetailApp(null)
                      }}
                      className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10 cursor-pointer"
                    >
                      Schedule Interview
                    </Button>
                  )}
                  {liveApp.status === "InterviewScheduled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Clock}
                      onClick={() => { updateApplicationStatus(feedDetailApp.id, "Interviewing"); setFeedDetailApp(null) }}
                      className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                    >
                      Mark as Interviewing
                    </Button>
                  )}
                  {(liveApp.status === "Interviewing" || liveApp.status === "InterviewScheduled") && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={CheckCircle2}
                      onClick={() => { updateApplicationStatus(feedDetailApp.id, "Selected"); setFeedDetailApp(null) }}
                      className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                    >
                      Make Offer
                    </Button>
                  )}
                  {liveApp.status !== "Rejected" && liveApp.status !== "Selected" && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={XCircle}
                      onClick={() => { updateApplicationStatus(feedDetailApp.id, "Rejected"); setFeedDetailApp(null) }}
                      className="text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                    >
                      Reject
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setFeedDetailApp(null)}>Close</Button>
              </div>
            </div>
          )
        })()}
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog
        isOpen={!!scheduleTarget}
        onClose={() => setScheduleTarget(null)}
        title="Schedule Interview"
        description={scheduleTarget ? `Set up interview details for ${scheduleTarget.studentName}` : ""}
      >
        <form onSubmit={handleScheduleInterview} className="space-y-4 text-xs">
          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Interview Date</label>
              <Input
                type="date"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">Interview Time</label>
              <Input
                type="time"
                value={interviewTime}
                onChange={(e) => setInterviewTime(e.target.value)}
                className="bg-card text-xs h-9"
                required
              />
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">Interview Mode</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setInterviewMode("online"); setInterviewLocationOrLink("") }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  interviewMode === "online"
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border"
                }`}
              >
                <Video className="h-4 w-4" />
                Online
              </button>
              <button
                type="button"
                onClick={() => { setInterviewMode("offline"); setInterviewLocationOrLink("") }}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  interviewMode === "offline"
                    ? "border-amber-500/60 bg-amber-500/10 text-amber-400"
                    : "border-border/40 bg-secondary/20 text-muted-foreground hover:border-border"
                }`}
              >
                <MapPin className="h-4 w-4" />
                Offline
              </button>
            </div>
          </div>

          {/* Conditional: Link or Address */}
          <div className="space-y-1">
            {interviewMode === "online" ? (
              <>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Video className="h-3.5 w-3.5 text-primary" /> Meeting Link
                </label>
                <Input
                  type="url"
                  placeholder="https://meet.google.com/abc-xyz or Zoom link..."
                  value={interviewLocationOrLink}
                  onChange={(e) => setInterviewLocationOrLink(e.target.value)}
                  className="bg-card text-xs h-9"
                  required
                />
              </>
            ) : (
              <>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" /> Venue Address
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 42 Tech Park Road, Floor 3, New York, NY 10001"
                  value={interviewLocationOrLink}
                  onChange={(e) => setInterviewLocationOrLink(e.target.value)}
                  className="bg-card text-xs h-9"
                  required
                />
              </>
            )}
          </div>

          {/* Candidate Summary */}
          {scheduleTarget && (
            <div className="p-3 bg-secondary/20 rounded-xl border border-border/30 flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                {scheduleTarget.studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
              </div>
              <div>
                <p className="font-bold text-foreground text-xs">{scheduleTarget.studentName}</p>
                <p className="text-[10px] text-muted-foreground">{scheduleTarget.studentEmail}</p>
              </div>
            </div>
          )}

          <div className="pt-2 border-t border-border/40 flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setScheduleTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" icon={CalendarCheck}>
              Confirm Schedule
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
    </PageFeatureGate>
  )
}
