"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  BookOpen, Video, FileText, HelpCircle, Calendar, Award,
  FolderGit2, Bot, Plus, Search, CheckCircle, 
  Clock, ArrowRight, User, AlertCircle, Play, ChevronDown, ChevronRight, Download, 
  ExternalLink, Check, Trash2, Edit2, PlayCircle, Eye, Settings2, 
  Send, Sparkles, Trophy, Star, SendHorizontal, Brain, 
  CheckCheck, RefreshCw, Layers, MapPin,
  ClipboardCheck, Upload, Users, Shield, Building2, MonitorPlay, LayoutGrid
} from "lucide-react"

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Input } from "@/components/ui/Input"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs"
import { Dialog } from "@/components/ui/Dialog"
import { useStore, CourseLMS } from "@/store/useStore"
import { api } from "@/lib/api"
import {
  mapBatchToCourseLMS,
  courseToBatchPayload,
  canStudentAccessCourse,
  hydrateLmsModuleState,
  buildLmsContentFromState,
  mergeCourseUpdate,
  syncStudentLmsAccess,
  getStudentLmsAccessValue,
  countActiveEnrolledStudents,
  createVideoItem,
  createCourseNote,
  createAssignmentItem,
  formatAssignmentTasksFromAi,
  formatAssignmentCriteriaFromAi,
  createQuizPack,
  getQuizSubmission,
  getQuizPackTopic,
  isDuplicateQuizTopic,
  suggestNextQuizTopic,
  collectQuizGenerationContext,
  QUIZ_TOPIC_SUGGESTIONS,
  getYoutubeEmbedUrl,
  getVideoSourceLabel,
  isVideoDurationMissing,
  probeLocalVideoFileDuration,
  resolveVideoDetailsFromSrc,
  normalizeVideoResources,
  resolveMediaUrl,
  resolveStudentKey,
  type LmsVideoItem,
  type LmsCourseNote,
  type LmsQuizPack,
} from "@/lib/lms"
import { useCenterPolicy } from "@/hooks/useCenterPolicy"

// Mock Initial Data for LMS State
// CourseLMS interface is moved to useStore.ts

type CourseMode = "online" | "offline"

interface AssignmentItem {
  id: string
  title: string
  deadline: string
  status: string
  grade: string
  feedback: string
  tasks?: string
  criteria?: string
  difficulty?: string
  submissions?: Record<string, { status: string; grade: string; feedback: string }>
}

interface QuizQuestion {
  q: string
  options: string[]
  correct: number
  explanation?: string
  difficulty?: string
}

interface CodingTestCase {
  case: string
  expected: string
  got?: string
  status?: string
}

interface CodingChallenge {
  id: string
  title: string
  difficulty: string
  starterCode: string
  constraints?: string[]
  sampleInput?: string
  expectedOutput?: string
  hiddenTests?: string[]
  explanation?: string
  testCases: CodingTestCase[]
}

interface ProjectItem {
  id: string
  title: string
  description: string
  milestoneCount: number
  currentMilestone: number
  percentage: number
  deadline: string
  techStack?: string
}

interface TestCaseOutput {
  passed: number
  total: number
  details: CodingTestCase[]
}

interface AiGeneratedPreview {
  title?: string
  difficulty?: string
  problemStatement?: string
  tasks?: string[]
  expectedOutcomes?: string[]
  evaluationCriteria?: string[]
  timer?: string
  negativeMarking?: string
  questions?: QuizQuestion[] | string[]
  languageSupport?: string[]
  challenge?: CodingChallenge
  description?: string
  techStack?: string
  requirements?: string[]
  milestones?: string[]
  databaseIdeas?: string[]
  rubric?: string[]
  company?: string
  rounds?: string[]
  resumeSuggestions?: string[]
  assessmentPlan?: string
}

const INITIAL_COURSES: CourseLMS[] = [] // Using store data now

function getCapacityPercent(enrolled: number, capacity: number) {
  if (!capacity) return 0
  return Math.min(100, Math.round((enrolled / capacity) * 100))
}

function getCapacityBarClass(percent: number) {
  if (percent >= 90) return "bg-destructive"
  if (percent >= 70) return "bg-amber-500"
  return "bg-primary"
}

function getPlatformLabel(platform?: string) {
  if (platform === "gmeet") return "Google Meet"
  if (platform === "teams") return "MS Teams"
  if (platform === "zoom") return "Zoom"
  if (platform === "discord") return "Discord"
  return "Live Session"
}

function countEnabledModules(features: CourseLMS["features"]) {
  return Object.entries(features).filter(([key, enabled]) => key !== "codingTests" && enabled).length
}

// Initial data moved to useStore.ts

export default function LMSPage({ defaultTab }: { defaultTab?: string }) {
  const searchParams = useSearchParams()
  const { user, activeTenant, lmsCourses, setLmsCourses } = useStore()
  const { enableLmsAiTutor } = useCenterPolicy()
  const showAiTutor = (course: CourseLMS) => Boolean(course.features.aiTutor && enableLmsAiTutor)
  
  // Filter courses by tenant (students always see their enrolled batches)
  const tenantCourses = React.useMemo(() => {
    if (user?.role === "student") return lmsCourses
    return lmsCourses.filter(c => !c.tenantId || c.tenantId === activeTenant?.name)
  }, [lmsCourses, activeTenant, user?.role])

  
  // Dynamic role select for demonstration/development
  const [activeRole, setActiveRole] = React.useState<"admin" | "trainer" | "student">("admin")

  // Sync activeRole with global user store role
  React.useEffect(() => {
    if (user?.role) {
      if (user.role === "student") {
        setActiveRole("student")
      } else if (user.role === "trainer") {
        setActiveRole("trainer")
      } else {
        setActiveRole("admin")
      }
    }
  }, [user?.role])

  const DUMMY_COURSE: CourseLMS = {
    id: "",
    title: "",
    code: "",
    batch: "",
    trainer: "",
    schedule: "",
    enrolled: 0,
    capacity: 0,
    studentNames: [],
    mode: "online",
    features: {
      videos: false,
      assignments: false,
      quizzes: false,
      codingTests: false,
      projects: false,
      aiTutor: false,
    },
    lmsPortalAccess: false,
    studentLmsAccess: {}
  }

  const [courses, setCourses] = React.useState<CourseLMS[]>(tenantCourses)
  const [selectedCourse, setSelectedCourse] = React.useState<CourseLMS>(tenantCourses[0] || DUMMY_COURSE)
  const [loading, setLoading] = React.useState(true)
  const [courseSearchQuery, setCourseSearchQuery] = React.useState("")

  const displayedCoursesList = React.useMemo(() => {
    if (!user) return []
    const studentName = user.name || ""
    if (user.role === "student") {
      return courses.filter((course) => canStudentAccessCourse(course, studentName))
    }
    return courses
  }, [courses, user])

  const filteredCoursesList = React.useMemo(() => {
    const query = courseSearchQuery.trim().toLowerCase()
    if (!query) return displayedCoursesList
    return displayedCoursesList.filter((course) =>
      course.title.toLowerCase().includes(query) ||
      course.code.toLowerCase().includes(query) ||
      course.trainer.toLowerCase().includes(query) ||
      (course.centerName || "").toLowerCase().includes(query) ||
      course.schedule.toLowerCase().includes(query)
    )
  }, [displayedCoursesList, courseSearchQuery])

  const lmsCourseStats = React.useMemo(() => ({
    total: displayedCoursesList.length,
    enrolled: displayedCoursesList.reduce((sum, course) => sum + course.enrolled, 0),
    portalEnabled: displayedCoursesList.filter((course) => course.lmsPortalAccess).length,
    online: displayedCoursesList.filter((course) => course.mode === "online").length,
  }), [displayedCoursesList])

  // Synchronize state with store when tenantCourses updates
  React.useEffect(() => {
    if (tenantCourses && tenantCourses.length > 0) {
      setCourses(tenantCourses)
      setSelectedCourse(prev => {
        if (!prev || prev.id === "" || !tenantCourses.some(c => c.id === prev.id)) {
          return tenantCourses[0]
        }
        const updated = tenantCourses.find(c => c.id === prev.id)
        return updated || tenantCourses[0]
      })
    }
  }, [tenantCourses])


  
  // Navigation Tabs
  const [lmsTab, setLmsTab] = React.useState(
    defaultTab === "dashboard" ? "courses" : defaultTab || "courses"
  )

  // Synchronize history state with tab
  React.useEffect(() => {
    const tabRouteMap: Record<string, string> = {
      courses: "/lms",
      "course-home": "/lms/home",
      videos: "/lms/videolectures",
      assignments: "/lms/assignments",
      quizzes: "/lms/quizzes",
      projects: "/lms/projects",
      ai: "/lms/aitutor",
      notes: "/lms/notes",
      certificates: "/lms/certificates"
    }
    const route = tabRouteMap[lmsTab]
    if (route && typeof window !== "undefined" && window.location.pathname !== route) {
      window.history.pushState(null, "", route)
    }
  }, [lmsTab])

  // Features configuration states
  const [editingCourse, setEditingCourse] = React.useState<CourseLMS | null>(null)
  const [showConfigModal, setShowConfigModal] = React.useState(false)

  // Sub-module states
  // 1. Videos watch states
  const [currentVideoId, setCurrentVideoId] = React.useState<string | null>(null)
  const [videoPostTitle, setVideoPostTitle] = React.useState("")
  const [videoPostDescription, setVideoPostDescription] = React.useState("")
  const [videoPostUrl, setVideoPostUrl] = React.useState("")
  const [videoPostFile, setVideoPostFile] = React.useState<File | null>(null)
  const [isPostingVideo, setIsPostingVideo] = React.useState(false)
  const [videoUploadMode, setVideoUploadMode] = React.useState<"url" | "file">("url")
  const [videoUrlPreview, setVideoUrlPreview] = React.useState<{
    title: string
    duration: string
    loading: boolean
  } | null>(null)
  const [videoFilePreviewDuration, setVideoFilePreviewDuration] = React.useState("")
  const videoPostTitleRef = React.useRef(videoPostTitle)
  videoPostTitleRef.current = videoPostTitle
  const [notePostTitle, setNotePostTitle] = React.useState("")
  const [notePostFile, setNotePostFile] = React.useState<File | null>(null)
  const [isUploadingNote, setIsUploadingNote] = React.useState(false)

  // Dynamic module content keyed by batch/course id (loaded from API)
  const [videosList, setVideosList] = React.useState<Record<string, LmsVideoItem[]>>({})
  const [courseNotes, setCourseNotes] = React.useState<Record<string, LmsCourseNote[]>>({})
  const [courseAssignments, setCourseAssignments] = React.useState<Record<string, AssignmentItem[]>>({})
  const [submittingFile, setSubmittingFile] = React.useState("")
  const [reviewingAssignment, setReviewingAssignment] = React.useState<AssignmentItem | null>(null)
  const [reviewingStudentName, setReviewingStudentName] = React.useState("")
  const [isQuizQuestionsExpanded, setIsQuizQuestionsExpanded] = React.useState(true)
  const [isQuizReportExpanded, setIsQuizReportExpanded] = React.useState(true)
  const [expandedQuizQuestion, setExpandedQuizQuestion] = React.useState<number | null>(null)
  const [expandedQuizStudent, setExpandedQuizStudent] = React.useState<string | null>(null)
  const [isQuizCreatorOpen, setIsQuizCreatorOpen] = React.useState(false)
  const [quizCreatorTopic, setQuizCreatorTopic] = React.useState("")
  const [quizCreatorTitle, setQuizCreatorTitle] = React.useState("")
  const [quizCreatorQuestions, setQuizCreatorQuestions] = React.useState<QuizQuestion[]>([
    { q: "", options: ["", "", "", ""], correct: 0 }
  ])
  const [isAiFilling, setIsAiFilling] = React.useState(false)
  const [isAssignmentCreatorOpen, setIsAssignmentCreatorOpen] = React.useState(false)
  const [assignmentTitle, setAssignmentTitle] = React.useState("")
  const [assignmentDeadline, setAssignmentDeadline] = React.useState("")
  const [assignmentTasks, setAssignmentTasks] = React.useState("")
  const [assignmentCriteria, setAssignmentCriteria] = React.useState("")
  const [assignmentDifficulty, setAssignmentDifficulty] = React.useState("Medium")
  const [isAssignmentAiFilling, setIsAssignmentAiFilling] = React.useState(false)
  const [isPostingAssignment, setIsPostingAssignment] = React.useState(false)

  const [courseQuizSubmissions, setCourseQuizSubmissions] = React.useState<
    Record<string, Record<string, Record<string, { completed: boolean; score: number; total: number }>>>
  >({})

  // 3. Quiz State per course
  const [selectedQuizId, setSelectedQuizId] = React.useState<string | null>(null)
  const [quizStarted, setQuizStarted] = React.useState(false)
  const [quizTimer, setQuizTimer] = React.useState(600) // 10 mins
  const [currentQuestion, setCurrentQuestion] = React.useState(0)
  const [quizAnswers, setQuizAnswers] = React.useState<{ [key: number]: number }>({})
  const [quizCompleted, setQuizCompleted] = React.useState(false)

  const [courseQuizPacks, setCourseQuizPacks] = React.useState<Record<string, LmsQuizPack[]>>({})

  // 4. Coding Challenge State per course
  const [selectedLanguage, setSelectedLanguage] = React.useState("javascript")
  const [codeContent, setCodeContent] = React.useState(`function twoSum(nums, target) {\n  // Write your code here\n  return [];\n}`)
  const [testCaseOutput, setTestCaseOutput] = React.useState<TestCaseOutput | null>(null)
  const [isRunningCode, setIsRunningCode] = React.useState(false)

  const [courseCodingChallenges, setCourseCodingChallenges] = React.useState<Record<string, CodingChallenge[]>>({})

  // 5. Projects list per course
  const [courseProjects, setCourseProjects] = React.useState<Record<string, ProjectItem[]>>({})

  // AI Generator modal state
  const [aiGenModal, setAiGenModal] = React.useState<{ isOpen: boolean; type: "assignments" | "quizzes" | "codingTests" | "projects" | null }>({ isOpen: false, type: null })
  const [aiGenCourseId, setAiGenCourseId] = React.useState("")
  const [aiGenTopic, setAiGenTopic] = React.useState("")
  const [aiGenNumItems, setAiGenNumItems] = React.useState(3)
  const [aiGenDifficulty, setAiGenDifficulty] = React.useState("Medium")
  const [aiGenProvider, setAiGenProvider] = React.useState("Gemini")
  const [isAiGenerating, setIsAiGenerating] = React.useState(false)
  const [aiGeneratedPreview, setAiGeneratedPreview] = React.useState<AiGeneratedPreview | string | null>(null)

  // AI Tutor state
  const [aiChat, setAiChat] = React.useState<{ role: "user" | "assistant", content: string }[]>([
    { role: "assistant", content: "Hi! I am your AI Copilot. Paste any code block, ask for doubt explanation, or generate a review of your MERN backend code." }
  ])
  const [chatInput, setChatInput] = React.useState("")
  const [isAiLoading, setIsAiLoading] = React.useState(false)

  const applyModuleState = React.useCallback((mappedCourses: CourseLMS[]) => {
    const moduleState = hydrateLmsModuleState(mappedCourses)
    setVideosList(moduleState.videosList)
    setCourseAssignments(moduleState.courseAssignments)
    setCourseQuizPacks(moduleState.courseQuizPacks)
    setCourseQuizSubmissions(moduleState.courseQuizSubmissions)
    setCourseCodingChallenges(moduleState.courseCodingChallenges)
    setCourseProjects(moduleState.courseProjects)
    setCourseNotes(moduleState.courseNotes)
  }, [])

  const refreshCoursesFromApi = React.useCallback(async (preserveCourseId?: string) => {
    setLoading(true)
    try {
      const fetchedBatches = await api.getBatches()
      if (fetchedBatches && fetchedBatches.length > 0) {
        const mappedCourses: CourseLMS[] = fetchedBatches.map((batch: any) =>
          mapBatchToCourseLMS(batch, activeTenant?.name)
        )
        setLmsCourses(mappedCourses)
        setCourses(mappedCourses)
        applyModuleState(mappedCourses)

        setSelectedCourse((prev) => {
          const targetId = preserveCourseId || prev?.id
          const updated = targetId
            ? mappedCourses.find((course) => course.id === targetId)
            : mappedCourses[0]
          return updated || mappedCourses[0] || DUMMY_COURSE
        })
      } else {
        setLmsCourses([])
        setCourses([])
      }
    } catch (err) {
      console.error("Error fetching LMS courses:", err)
    } finally {
      setLoading(false)
    }
  }, [activeTenant?.name, applyModuleState, setLmsCourses])

  React.useEffect(() => {
    const batchId = searchParams.get("batch") || undefined
    void refreshCoursesFromApi(batchId)
  }, [refreshCoursesFromApi, searchParams])

  React.useEffect(() => {
    if ((lmsTab === "course-home" || lmsTab === "notes" || lmsTab === "assignments") && selectedCourse?.id) {
      void refreshCoursesFromApi(selectedCourse.id)
    }
  }, [lmsTab, selectedCourse?.id, refreshCoursesFromApi])

  React.useEffect(() => {
    if (aiGenCourseId) return
    const defaultCourseId = selectedCourse?.id || courses[0]?.id
    if (defaultCourseId) setAiGenCourseId(defaultCourseId)
  }, [aiGenCourseId, selectedCourse?.id, courses])

  const activeStudentName = React.useMemo(() => {
    if (user?.name) return user.name
    return selectedCourse.studentNames?.[0] || ""
  }, [user?.name, selectedCourse.studentNames])

  const formatModuleCount = (count: number, singular: string, plural?: string) =>
    `${count} ${count === 1 ? singular : plural ?? `${singular}s`}`

  const batchNotes = React.useMemo(
    () => courseNotes[selectedCourse.id] || [],
    [courseNotes, selectedCourse.id]
  )

  const getModuleCount = React.useCallback(
    (courseId: string, module: "videos" | "assignments" | "quizzes" | "codingTests" | "projects") => {
      if (!courseId) return 0
      switch (module) {
        case "videos":
          return videosList[courseId]?.length || 0
        case "assignments":
          return courseAssignments[courseId]?.length || 0
        case "quizzes":
          return courseQuizPacks[courseId]?.length || 0
        case "codingTests":
          return courseCodingChallenges[courseId]?.length || 0
        case "projects":
          return courseProjects[courseId]?.length || 0
        default:
          return 0
      }
    },
    [
      videosList,
      courseAssignments,
      courseQuizPacks,
      courseCodingChallenges,
      courseProjects,
    ]
  )

  const activeEnrolledCount = React.useMemo(
    () => countActiveEnrolledStudents(selectedCourse),
    [selectedCourse]
  )

  // Reset active tab to 'course-home' if selected course doesn't have the current tab's feature
  React.useEffect(() => {
    if (!selectedCourse?.features) return
    const featureTabMap: Record<string, keyof CourseLMS["features"]> = {
      videos: "videos",
      assignments: "assignments",
      quizzes: "quizzes",
      projects: "projects",
      ai: "aiTutor",
    }
    const featureKey = featureTabMap[lmsTab]
    if (featureKey && !selectedCourse.features[featureKey]) {
      window.setTimeout(() => setLmsTab("course-home"), 0)
    }
  }, [selectedCourse, lmsTab])

  const batchQuizPacks = React.useMemo(
    () => courseQuizPacks[selectedCourse.id] || [],
    [courseQuizPacks, selectedCourse.id]
  )

  const activeQuizPack = React.useMemo(() => {
    if (!batchQuizPacks.length) return null
    return batchQuizPacks.find((pack) => pack.id === selectedQuizId) || batchQuizPacks[0]
  }, [batchQuizPacks, selectedQuizId])

  React.useEffect(() => {
    if (!batchQuizPacks.length) {
      setSelectedQuizId(null)
      return
    }
    if (!selectedQuizId || !batchQuizPacks.some((pack) => pack.id === selectedQuizId)) {
      setSelectedQuizId(batchQuizPacks[0].id)
    }
  }, [batchQuizPacks, selectedQuizId, selectedCourse.id])

  React.useEffect(() => {
    setQuizStarted(false)
    setQuizCompleted(false)
    setQuizAnswers({})
    setCurrentQuestion(0)
    if (!selectedCourse?.id || !activeQuizPack?.id || !activeStudentName) return
    const submission = getQuizSubmission(
      courseQuizSubmissions[selectedCourse.id],
      activeQuizPack.id,
      activeStudentName
    )
    setQuizCompleted(Boolean(submission?.completed))
  }, [selectedQuizId, selectedCourse.id, activeQuizPack?.id, activeStudentName, courseQuizSubmissions])

  const activeQuizQuestions = activeQuizPack?.questions || []
  const activeQuizMeta = activeQuizPack
    ? {
        title: activeQuizPack.title,
        timerMinutes: activeQuizPack.timerMinutes,
        negativeMarking: activeQuizPack.negativeMarking,
      }
    : { title: `${selectedCourse.title} Knowledge Check` }
  const activeQuizTimerSeconds =
    (activeQuizMeta.timerMinutes || Math.max(activeQuizQuestions.length * 3, 10)) * 60

  const openQuizCreatorDialog = React.useCallback(() => {
    const nextTopic = suggestNextQuizTopic(batchQuizPacks)
    const quizNumber = batchQuizPacks.length + 1
    setQuizCreatorTopic(nextTopic)
    setQuizCreatorTitle(nextTopic ? `${nextTopic} Quiz` : `${selectedCourse.title} Quiz ${quizNumber}`)
    setQuizCreatorQuestions([{ q: "", options: ["", "", "", ""], correct: 0 }])
    setIsQuizCreatorOpen(true)
  }, [batchQuizPacks, selectedCourse.title])

  const validateQuizTopic = React.useCallback(
    (topic: string) => {
      const trimmed = topic.trim()
      if (!trimmed) {
        alert("Enter a quiz topic before generating or publishing.")
        return false
      }
      if (isDuplicateQuizTopic(trimmed, batchQuizPacks)) {
        alert("A quiz with this topic already exists. Choose a different topic for each quiz test.")
        return false
      }
      return true
    },
    [batchQuizPacks]
  )

  const lmsModuleState = React.useMemo(
    () => ({
      videosList,
      courseAssignments,
      courseQuizPacks,
      courseQuizSubmissions,
      courseCodingChallenges,
      courseProjects,
      courseNotes,
    }),
    [
      videosList,
      courseAssignments,
      courseQuizPacks,
      courseQuizSubmissions,
      courseCodingChallenges,
      courseProjects,
      courseNotes,
    ]
  )

  const applyCourseUpdate = React.useCallback((updatedCourse: CourseLMS) => {
    const nextCourses = mergeCourseUpdate(courses, updatedCourse)
    setCourses(nextCourses)
    setLmsCourses(nextCourses)
    setSelectedCourse(updatedCourse)
  }, [courses, setLmsCourses])

  const persistCourse = React.useCallback(async (course: CourseLMS, lmsContent?: CourseLMS["lmsContent"]) => {
    if (!course.id) return course
    try {
      const payload = courseToBatchPayload(course, lmsContent ?? course.lmsContent)
      const saved = await api.updateBatch(course.id, payload)
      const mapped = mapBatchToCourseLMS(saved, activeTenant?.name)
      applyCourseUpdate(mapped)
      return mapped
    } catch (err) {
      console.error("Failed to persist LMS course settings:", err)
      return course
    }
  }, [activeTenant?.name, applyCourseUpdate])

  const persistLmsContent = React.useCallback(async (
    courseId: string,
    overrides?: Partial<{
      videosList: Record<string, LmsVideoItem[]>
      courseAssignments: Record<string, AssignmentItem[]>
      courseQuizPacks: Record<string, LmsQuizPack[]>
      courseQuizSubmissions: Record<
        string,
        Record<string, Record<string, { completed: boolean; score: number; total: number }>>
      >
      courseCodingChallenges: Record<string, CodingChallenge[]>
      courseProjects: Record<string, ProjectItem[]>
      courseNotes: Record<string, LmsCourseNote[]>
    }>
  ) => {
    const course = courses.find((item) => item.id === courseId)
    if (!course) return
    const state = { ...lmsModuleState, ...overrides }
    const lmsContent = buildLmsContentFromState(courseId, state)
    await persistCourse({ ...course, lmsContent }, lmsContent)
  }, [courses, lmsModuleState, persistCourse])

  const courseVideos = React.useMemo(
    () => videosList[selectedCourse.id] || [],
    [videosList, selectedCourse.id]
  )

  const activeVideo = React.useMemo(() => {
    if (!courseVideos.length) return null
    return courseVideos.find((video) => video.id === currentVideoId) || courseVideos[0]
  }, [courseVideos, currentVideoId])

  React.useEffect(() => {
    if (videoUploadMode !== "url") {
      setVideoUrlPreview(null)
      return
    }

    const url = videoPostUrl.trim()
    if (!url || !/^https?:\/\//i.test(url)) {
      setVideoUrlPreview(null)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      void (async () => {
        setVideoUrlPreview({ title: "", duration: "", loading: true })
        try {
          const details = await resolveVideoDetailsFromSrc(url, api.fetchVideoMetadata)
          if (cancelled) return

          setVideoUrlPreview({
            title: details.title || "",
            duration: details.duration,
            loading: false,
          })

          if (!videoPostTitleRef.current.trim() && details.title) {
            setVideoPostTitle(details.title)
          }
        } catch (err) {
          if (!cancelled) {
            console.warn("Failed to preview video metadata:", err)
            setVideoUrlPreview(null)
          }
        }
      })()
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [videoPostUrl, videoUploadMode])

  React.useEffect(() => {
    if (videoUploadMode !== "file" || !videoPostFile) {
      setVideoFilePreviewDuration("")
      return
    }

    let cancelled = false
    void probeLocalVideoFileDuration(videoPostFile).then((duration) => {
      if (!cancelled && duration) setVideoFilePreviewDuration(duration)
    })

    return () => {
      cancelled = true
    }
  }, [videoPostFile, videoUploadMode])

  React.useEffect(() => {
    if (!courseVideos.length) {
      setCurrentVideoId(null)
      return
    }
    if (!currentVideoId || !courseVideos.some((video) => video.id === currentVideoId)) {
      setCurrentVideoId(courseVideos[0].id)
    }
  }, [courseVideos, currentVideoId, selectedCourse.id])

  const probedVideoIdsRef = React.useRef<Set<string>>(new Set())

  const videosNeedingDurationKey = React.useMemo(
    () =>
      courseVideos
        .filter((video) => isVideoDurationMissing(video.duration))
        .map((video) => video.id)
        .join("|"),
    [courseVideos]
  )

  React.useEffect(() => {
    probedVideoIdsRef.current.clear()
  }, [selectedCourse.id])

  React.useEffect(() => {
    if (!selectedCourse.id || !videosNeedingDurationKey) return

    const enrichVideos = async () => {
      const pending = courseVideos.filter(
        (video) =>
          isVideoDurationMissing(video.duration) && !probedVideoIdsRef.current.has(video.id)
      )
      if (!pending.length) return

      pending.forEach((video) => probedVideoIdsRef.current.add(video.id))

      let changed = false
      const nextVideos = [...courseVideos]

      for (const video of pending) {
        const index = nextVideos.findIndex((item) => item.id === video.id)
        if (index < 0) continue

        try {
          const details = await resolveVideoDetailsFromSrc(video.src, api.fetchVideoMetadata)
          nextVideos[index] = {
            ...nextVideos[index],
            duration: details.duration,
            ...(details.title && !nextVideos[index].title.trim()
              ? { title: details.title }
              : {}),
            ...(details.description && !nextVideos[index].description?.trim()
              ? { description: details.description }
              : {}),
          }
          changed = true
        } catch (err) {
          console.warn("Failed to enrich video duration:", err)
          nextVideos[index] = { ...nextVideos[index], duration: "Unknown" }
          changed = true
        }
      }

      if (!changed) return

      setVideosList((prev) => {
        const updated = { ...prev, [selectedCourse.id]: nextVideos }
        void persistLmsContent(selectedCourse.id, { videosList: updated })
        return updated
      })
    }

    void enrichVideos()
  }, [videosNeedingDurationKey, selectedCourse.id, courseVideos, persistLmsContent])

  const resetVideoPostForm = React.useCallback(() => {
    setVideoPostTitle("")
    setVideoPostDescription("")
    setVideoPostUrl("")
    setVideoPostFile(null)
    setVideoUploadMode("url")
    setVideoUrlPreview(null)
    setVideoFilePreviewDuration("")
  }, [])

  const handlePostVideoLecture = React.useCallback(async () => {
    const resolvedTitle = videoPostTitle.trim() || videoUrlPreview?.title?.trim() || ""
    if (!selectedCourse.id || !resolvedTitle) return

    setIsPostingVideo(true)
    try {
      let src = videoPostUrl.trim()
      let resolvedDuration = "—"

      let resolvedDescription = videoPostDescription.trim()

      if (videoUploadMode === "file") {
        if (!videoPostFile) {
          alert("Choose a video file to upload.")
          return
        }
        if (videoFilePreviewDuration) {
          resolvedDuration = videoFilePreviewDuration
        } else {
          const localDuration = await probeLocalVideoFileDuration(videoPostFile)
          if (localDuration) resolvedDuration = localDuration
        }
        const uploaded = await api.uploadLmsMedia(selectedCourse.id, videoPostFile)
        src = uploaded.url
        if (isVideoDurationMissing(resolvedDuration)) {
          const details = await resolveVideoDetailsFromSrc(uploaded.url, api.fetchVideoMetadata)
          resolvedDuration = details.duration
        }
      } else if (!src) {
        alert("Paste a video URL or switch to file upload.")
        return
      } else {
        const details = await resolveVideoDetailsFromSrc(src, api.fetchVideoMetadata)
        resolvedDuration = details.duration
        if (!resolvedDescription && details.description) {
          resolvedDescription = details.description
        }
      }

      const newVideo = createVideoItem({
        title: resolvedTitle,
        src,
        description: resolvedDescription,
        duration: resolvedDuration,
      })

      const nextVideos = [...courseVideos, newVideo]
      setVideosList((prev) => ({ ...prev, [selectedCourse.id]: nextVideos }))
      setCurrentVideoId(newVideo.id)
      await persistLmsContent(selectedCourse.id, {
        videosList: { ...videosList, [selectedCourse.id]: nextVideos },
      })
      resetVideoPostForm()
    } catch (err) {
      console.error("Failed to post video lecture:", err)
      alert(err instanceof Error ? err.message : "Failed to post video lecture")
    } finally {
      setIsPostingVideo(false)
    }
  }, [
    courseVideos,
    persistLmsContent,
    resetVideoPostForm,
    selectedCourse.id,
    videoPostDescription,
    videoPostFile,
    videoPostTitle,
    videoPostUrl,
    videoUploadMode,
    videoUrlPreview?.title,
    videoFilePreviewDuration,
    videosList,
  ])

  const handleDeleteVideoLecture = React.useCallback(async (videoId: string) => {
    if (!selectedCourse.id) return
    const nextVideos = courseVideos.filter((video) => video.id !== videoId)
    setVideosList((prev) => ({ ...prev, [selectedCourse.id]: nextVideos }))
    if (currentVideoId === videoId) {
      setCurrentVideoId(nextVideos[0]?.id || null)
    }
    await persistLmsContent(selectedCourse.id, {
      videosList: { ...videosList, [selectedCourse.id]: nextVideos },
    })
  }, [courseVideos, currentVideoId, persistLmsContent, selectedCourse.id, videosList])

  const handleUploadCourseNote = React.useCallback(async () => {
    if (!selectedCourse.id || !notePostTitle.trim() || !notePostFile) {
      alert("Enter a PDF title and choose a file to upload.")
      return
    }

    setIsUploadingNote(true)
    try {
      const uploaded = await api.uploadLmsMedia(selectedCourse.id, notePostFile)
      const newNote = createCourseNote({
        title: notePostTitle,
        fileName: notePostFile.name,
        url: uploaded.url,
      })
      const nextNotes = [...batchNotes, newNote]
      setCourseNotes((prev) => ({ ...prev, [selectedCourse.id]: nextNotes }))
      await persistLmsContent(selectedCourse.id, {
        courseNotes: { ...courseNotes, [selectedCourse.id]: nextNotes },
      })
      setNotePostTitle("")
      setNotePostFile(null)
    } catch (err) {
      console.error("Failed to upload course note:", err)
      alert(err instanceof Error ? err.message : "Failed to upload PDF")
    } finally {
      setIsUploadingNote(false)
    }
  }, [batchNotes, courseNotes, notePostFile, notePostTitle, persistLmsContent, selectedCourse.id])

  const handleDeleteCourseNote = React.useCallback(async (noteId: string) => {
    if (!selectedCourse.id) return
    const nextNotes = batchNotes.filter((note) => note.id !== noteId)
    setCourseNotes((prev) => ({ ...prev, [selectedCourse.id]: nextNotes }))
    await persistLmsContent(selectedCourse.id, {
      courseNotes: { ...courseNotes, [selectedCourse.id]: nextNotes },
    })
  }, [batchNotes, courseNotes, persistLmsContent, selectedCourse.id])

  const publishQuizPack = React.useCallback(
    async (pack: LmsQuizPack, courseId: string) => {
      const nextPacks = [...(courseQuizPacks[courseId] || []), pack]
      setCourseQuizPacks((prev) => ({ ...prev, [courseId]: nextPacks }))
      setSelectedQuizId(pack.id)
      await persistLmsContent(courseId, {
        courseQuizPacks: { ...courseQuizPacks, [courseId]: nextPacks },
      })
    },
    [courseQuizPacks, persistLmsContent]
  )

  const publishAssignment = React.useCallback(
    async (assignment: AssignmentItem, courseId: string) => {
      const nextAssignments = [...(courseAssignments[courseId] || []), assignment]
      setCourseAssignments((prev) => ({ ...prev, [courseId]: nextAssignments }))
      await persistLmsContent(courseId, {
        courseAssignments: { ...courseAssignments, [courseId]: nextAssignments },
      })
    },
    [courseAssignments, persistLmsContent]
  )

  const syncAssignmentsForCourse = React.useCallback(
    async (courseId: string, nextAssignments: AssignmentItem[]) => {
      setCourseAssignments((prev) => ({ ...prev, [courseId]: nextAssignments }))
      await persistLmsContent(courseId, {
        courseAssignments: { ...courseAssignments, [courseId]: nextAssignments },
      })
    },
    [courseAssignments, persistLmsContent]
  )

  const resetAssignmentForm = React.useCallback(() => {
    setAssignmentTitle("")
    setAssignmentDeadline("")
    setAssignmentTasks("")
    setAssignmentCriteria("")
    setAssignmentDifficulty("Medium")
  }, [])

  const generateAssignmentWithGemini = React.useCallback(async () => {
    const topic = assignmentTitle.trim()
    if (!topic) {
      alert("Enter an assignment title before generating with AI.")
      return
    }

    setIsAssignmentAiFilling(true)
    try {
      const result = await api.generateLmsContent({
        type: "assignments",
        topic,
        courseName: selectedCourse.title,
        difficulty: assignmentDifficulty,
      })

      if (result.title) {
        setAssignmentTitle(String(result.title))
      }
      if (result.difficulty) {
        setAssignmentDifficulty(String(result.difficulty))
      }

      setAssignmentTasks(formatAssignmentTasksFromAi(result))
      setAssignmentCriteria(formatAssignmentCriteriaFromAi(result.evaluationCriteria || []))

      if (!assignmentDeadline) {
        const defaultDeadline = new Date()
        defaultDeadline.setDate(defaultDeadline.getDate() + 10)
        setAssignmentDeadline(defaultDeadline.toISOString().split("T")[0])
      }

      if (result.warning) alert(result.warning)
    } catch (err) {
      console.error("Assignment AI generation failed:", err)
      alert(err instanceof Error ? err.message : "Failed to generate assignment with AI")
    } finally {
      setIsAssignmentAiFilling(false)
    }
  }, [assignmentDeadline, assignmentDifficulty, assignmentTitle, selectedCourse.title])

  const handlePostAssignment = React.useCallback(async () => {
    if (!selectedCourse.id || !assignmentTitle.trim()) return

    setIsPostingAssignment(true)
    try {
      const newAssignment = createAssignmentItem({
        title: assignmentTitle,
        deadline: assignmentDeadline,
        tasks: assignmentTasks,
        criteria: assignmentCriteria,
        difficulty: assignmentDifficulty,
        studentNames: selectedCourse.studentNames,
      })

      await publishAssignment(newAssignment, selectedCourse.id)
      resetAssignmentForm()
      setIsAssignmentCreatorOpen(false)
    } catch (err) {
      console.error("Failed to post assignment:", err)
      alert(err instanceof Error ? err.message : "Failed to post assignment")
    } finally {
      setIsPostingAssignment(false)
    }
  }, [
    assignmentCriteria,
    assignmentDeadline,
    assignmentDifficulty,
    assignmentTasks,
    assignmentTitle,
    publishAssignment,
    resetAssignmentForm,
    selectedCourse.id,
    selectedCourse.studentNames,
  ])

  const handleDeleteAssignment = React.useCallback(
    async (assignmentId: string) => {
      if (!selectedCourse.id) return
      const currentAssignments = courseAssignments[selectedCourse.id] || []
      const assignment = currentAssignments.find((item) => item.id === assignmentId)
      if (!assignment) return

      if (
        !window.confirm(
          `Delete assignment "${assignment.title}"? This will remove it for all students.`
        )
      ) {
        return
      }

      const nextAssignments = currentAssignments.filter((item) => item.id !== assignmentId)

      if (reviewingAssignment?.id === assignmentId) {
        setReviewingAssignment(null)
        setReviewingStudentName("")
      }
      if (submittingFile === assignmentId) {
        setSubmittingFile("")
      }

      await syncAssignmentsForCourse(selectedCourse.id, nextAssignments)
    },
    [
      courseAssignments,
      reviewingAssignment?.id,
      selectedCourse.id,
      submittingFile,
      syncAssignmentsForCourse,
    ]
  )

  const handleDeleteQuizPack = React.useCallback(
    async (quizId: string) => {
      if (!selectedCourse.id) return
      const nextPacks = (courseQuizPacks[selectedCourse.id] || []).filter((pack) => pack.id !== quizId)
      const nextCourseSubs = { ...(courseQuizSubmissions[selectedCourse.id] || {}) }
      delete nextCourseSubs[quizId]
      const nextSubmissions = {
        ...courseQuizSubmissions,
        [selectedCourse.id]: nextCourseSubs,
      }
      setCourseQuizPacks((prev) => ({ ...prev, [selectedCourse.id]: nextPacks }))
      setCourseQuizSubmissions(nextSubmissions)
      if (selectedQuizId === quizId) {
        setSelectedQuizId(nextPacks[0]?.id || null)
      }
      await persistLmsContent(selectedCourse.id, {
        courseQuizPacks: { ...courseQuizPacks, [selectedCourse.id]: nextPacks },
        courseQuizSubmissions: nextSubmissions,
      })
    },
    [courseQuizPacks, courseQuizSubmissions, persistLmsContent, selectedCourse.id, selectedQuizId]
  )

  const finalizeQuizSubmission = React.useCallback(async (correctCount: number) => {
    if (!selectedCourse?.id || !activeStudentName || !activeQuizQuestions.length || !activeQuizPack?.id) return
    const studentKey = resolveStudentKey(
      courseQuizSubmissions[selectedCourse.id]?.[activeQuizPack.id] || {},
      activeStudentName
    )
    const submission = {
      completed: true,
      score: correctCount,
      total: activeQuizQuestions.length,
    }
    const nextSubmissions = {
      ...courseQuizSubmissions,
      [selectedCourse.id]: {
        ...(courseQuizSubmissions[selectedCourse.id] || {}),
        [activeQuizPack.id]: {
          ...(courseQuizSubmissions[selectedCourse.id]?.[activeQuizPack.id] || {}),
          [studentKey]: submission,
        },
      },
    }
    setCourseQuizSubmissions(nextSubmissions)
    setQuizCompleted(true)
    setQuizStarted(false)
    try {
      await persistLmsContent(selectedCourse.id, { courseQuizSubmissions: nextSubmissions })
    } catch (err) {
      console.error("Failed to persist quiz submission:", err)
    }
  }, [
    activeQuizPack?.id,
    activeQuizQuestions.length,
    activeStudentName,
    courseQuizSubmissions,
    persistLmsContent,
    selectedCourse?.id,
  ])

  // Auto Timer for Quiz
  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    if (quizStarted && quizTimer > 0 && !quizCompleted && selectedCourse?.id) {
      interval = setInterval(() => {
        setQuizTimer(prev => {
          if (prev <= 1) {
            const correctCount = activeQuizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length
            void finalizeQuizSubmission(correctCount)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [quizStarted, quizTimer, quizCompleted, activeQuizQuestions, quizAnswers, selectedCourse?.id, finalizeQuizSubmission])

  // Mock code runner logic
  const handleRunCode = () => {
    setIsRunningCode(true)
    setTimeout(() => {
      setIsRunningCode(false)
      if (codeContent.includes("target") || codeContent.includes("return")) {
        setTestCaseOutput({
          passed: 3,
          total: 3,
          details: [
            { case: "nums = [2,7,11,15], target = 9", expected: "[0,1]", got: "[0,1]", status: "pass" },
            { case: "nums = [3,2,4], target = 6", expected: "[1,2]", got: "[1,2]", status: "pass" },
            { case: "nums = [3,3], target = 6", expected: "[0,1]", got: "[0,1]", status: "pass" }
          ]
        })
      } else {
        setTestCaseOutput({
          passed: 0,
          total: 3,
          details: [
            { case: "nums = [2,7,11,15], target = 9", expected: "[0,1]", got: "[]", status: "fail" }
          ]
        })
      }
    }, 1200)
  }

  // Mock AI Copilot response
  const handleSendAiMessage = () => {
    if (!chatInput.trim()) return
    const userMsg = chatInput
    setAiChat(prev => [...prev, { role: "user", content: userMsg }])
    setChatInput("")
    setIsAiLoading(true)

    setTimeout(() => {
      setIsAiLoading(false)
      let reply = ""
      if (userMsg.toLowerCase().includes("code") || userMsg.toLowerCase().includes("review")) {
        reply = "🔍 **AI Code Review Output**:\n- Performance: Time complexity O(N^2) can be optimized to O(N) using a HashMap.\n- Cleanliness: Use object destructuring for variables.\n- Security: Secure parameters to prevent SQL injection/NoSQL injection."
      } else if (userMsg.toLowerCase().includes("quiz")) {
        reply = "✍️ **AI Generated Quiz question**:\nWhat is the purpose of React keys?\n1) To update DOM states\n2) To help identify unique elements in virtual DOM reconciliations.\n(Say '1' or '2' to answer!)"
      } else {
        reply = "💡 **AI Explanation**: To configure standard routes in Express, make sure to import Router from 'express' and invoke router.get(). Remember to export this module and bind it using app.use('/api', router) in your main server file."
      }
      setAiChat(prev => [...prev, { role: "assistant", content: reply }])
    }, 1000)
  }

  const openAiGenerator = (type: "assignments" | "quizzes" | "codingTests" | "projects") => {
    setAiGenCourseId(selectedCourse.id)
    setAiGenTopic("")
    setAiGenDifficulty("Medium")
    setAiGenNumItems(type === "quizzes" ? 10 : 3)
    setAiGeneratedPreview(null)
    setAiGenModal({ isOpen: true, type })
  }

  const generateAiContent = async () => {
    if (!aiGenModal.type) return
    const course = courses.find(c => c.id === aiGenCourseId) || selectedCourse
    const topic = aiGenTopic.trim() || `${course.title} fundamentals`
    setIsAiGenerating(true)
    try {
      if (aiGenModal.type === "quizzes") {
        if (!aiGenTopic.trim()) {
          alert("Enter a unique quiz topic before generating.")
          setIsAiGenerating(false)
          return
        }
        const coursePacks = courseQuizPacks[course.id] || []
        if (isDuplicateQuizTopic(aiGenTopic, coursePacks)) {
          alert("A quiz with this topic already exists. Choose a different topic.")
          setIsAiGenerating(false)
          return
        }
        const { existingTopics, excludeQuestions } = collectQuizGenerationContext(coursePacks)
        const result = await api.generateLmsContent({
          type: "quizzes",
          topic: aiGenTopic.trim(),
          courseName: course.title,
          difficulty: aiGenDifficulty,
          count: aiGenNumItems,
          existingTopics,
          excludeQuestions,
        })
        setAiGeneratedPreview({
          title: result.title,
          timer: `${result.timerMinutes} minutes`,
          negativeMarking: result.negativeMarking,
          questions: result.questions,
        })
        if (result.warning) alert(result.warning)
        setIsAiGenerating(false)
        return
      }

      if (aiGenModal.type === "assignments") {
        const result = await api.generateLmsContent({
          type: "assignments",
          topic,
          courseName: course.title,
          difficulty: aiGenDifficulty,
        })
        setAiGeneratedPreview({
          title: result.title || `${topic} Applied Assignment`,
          difficulty: result.difficulty || aiGenDifficulty,
          problemStatement: result.problemStatement,
          tasks: result.tasks,
          expectedOutcomes: result.expectedOutcomes,
          evaluationCriteria: result.evaluationCriteria,
        })
        if (result.warning) alert(result.warning)
        setIsAiGenerating(false)
        return
      }

      const count = Math.max(1, aiGenNumItems)
      if (aiGenModal.type === "codingTests") {
        setAiGeneratedPreview({
          title: `${topic} Coding Challenge Pack`,
          languageSupport: ["JavaScript", "Python", "C++"],
          difficulty: aiGenDifficulty,
          challenge: {
            id: "c-" + Date.now(),
            title: `${topic}: Build the Core Function`,
            difficulty: aiGenDifficulty,
            starterCode: `function solve(input) {\n  // Parse input and implement ${topic}\n  return input;\n}`,
            constraints: ["1 <= n <= 10^5", "Time limit: 2 seconds", "Memory limit: 256 MB"],
            sampleInput: "5\n1 2 3 4 5",
            expectedOutput: "15",
            hiddenTests: ["Large input boundary case", "Duplicate values", "Empty edge case"],
            explanation: `Use an efficient traversal and validate edge cases before returning the result.`,
            testCases: [
              { case: "input = [1,2,3,4,5]", expected: "15" },
              { case: "input = [10,-2,4]", expected: "12" }
            ]
          }
        })
      }
      if (aiGenModal.type === "projects") {
        setAiGeneratedPreview({
          title: `${topic} Capstone Project`,
          description: `Build a production-style ${course.title} project focused on ${topic}.`,
          techStack: course.title.includes("UI") ? "Figma, FigJam, Notion" : "Next.js, Node.js, PostgreSQL, Prisma",
          requirements: ["Authentication-ready flows", "Admin/trainer review screens", "Analytics-ready data model"],
          milestones: ["Discovery and scope", "Prototype and schema", "Core implementation", "Testing and final review"],
          databaseIdeas: ["users", "submissions", "rubrics", "activity_logs"],
          rubric: ["Functionality 35%", "Architecture 25%", "UX quality 20%", "Documentation 20%"]
        })
      }
    } catch (err) {
      console.error("AI generation failed:", err)
      alert(err instanceof Error ? err.message : "AI generation failed")
    } finally {
      setIsAiGenerating(false)
    }
  }

  const generateQuizWithGemini = async (options?: {
    topic?: string
    count?: number
    applyToCreator?: boolean
  }) => {
    const course = selectedCourse
    const topic = (options?.topic || quizCreatorTopic).trim()
    const count = options?.count || 10

    if (!validateQuizTopic(topic)) return

    const { existingTopics, excludeQuestions } = collectQuizGenerationContext(batchQuizPacks)

    if (options?.applyToCreator) {
      setIsAiFilling(true)
    } else {
      setIsAiGenerating(true)
    }

    try {
      const result = await api.generateLmsContent({
        type: "quizzes",
        topic,
        courseName: course.title,
        difficulty: aiGenDifficulty,
        count,
        existingTopics,
        excludeQuestions,
      })

      if (options?.applyToCreator) {
        setQuizCreatorTopic(topic)
        setQuizCreatorTitle(result.title || `${topic} Quiz`)
        setQuizCreatorQuestions(result.questions)
      } else {
        setAiGeneratedPreview({
          title: result.title,
          timer: `${result.timerMinutes} minutes`,
          negativeMarking: result.negativeMarking,
          questions: result.questions,
        })
      }
      if (result.warning) alert(result.warning)
    } catch (err) {
      console.error("Gemini quiz generation failed:", err)
      alert(err instanceof Error ? err.message : "Failed to generate quiz with Gemini")
    } finally {
      if (options?.applyToCreator) {
        setIsAiFilling(false)
      } else {
        setIsAiGenerating(false)
      }
    }
  }

  const publishAiGeneratedContent = async () => {
    if (!aiGenModal.type || !aiGeneratedPreview) return
    if (typeof aiGeneratedPreview === "string") return
    const courseId = aiGenCourseId
    if (aiGenModal.type === "assignments") {
      const targetCourse = courses.find(c => c.id === courseId) || selectedCourse
      const tasks = [
        aiGeneratedPreview.problemStatement,
        ...(aiGeneratedPreview.tasks || []).map((task, index) => `${index + 1}. ${task}`),
      ]
        .filter(Boolean)
        .join("\n\n")
      const criteria = formatAssignmentCriteriaFromAi(aiGeneratedPreview.evaluationCriteria || [])
      const newAssignment = createAssignmentItem({
        title: aiGeneratedPreview.title || "AI Generated Assignment",
        tasks,
        criteria,
        difficulty: aiGeneratedPreview.difficulty || aiGenDifficulty,
        studentNames: targetCourse?.studentNames || [],
      })
      await publishAssignment(newAssignment, courseId)
    }
    if (aiGenModal.type === "quizzes") {
      if (!aiGenTopic.trim()) {
        alert("Quiz topic is required.")
        return
      }
      const coursePacks = courseQuizPacks[courseId] || []
      if (isDuplicateQuizTopic(aiGenTopic, coursePacks)) {
        alert("A quiz with this topic already exists. Choose a different topic.")
        return
      }
      const generatedQuestions = Array.isArray(aiGeneratedPreview.questions) && typeof aiGeneratedPreview.questions[0] !== "string"
        ? aiGeneratedPreview.questions as QuizQuestion[]
        : []
      const newPack = createQuizPack({
        title: aiGeneratedPreview.title || `${aiGenTopic.trim()} Quiz`,
        topic: aiGenTopic.trim(),
        questions: generatedQuestions,
        timerMinutes:
          Number(String(aiGeneratedPreview.timer || "").replace(/\D/g, "")) ||
          generatedQuestions.length * 3,
        negativeMarking: aiGeneratedPreview.negativeMarking || "1 mark penalty for wrong answers",
      })
      await publishQuizPack(newPack, courseId)
    }
    if (aiGenModal.type === "codingTests") {
      const generatedChallenge = aiGeneratedPreview.challenge
      if (!generatedChallenge) return
      setCourseCodingChallenges(prev => ({
        ...prev,
        [courseId]: [...(prev[courseId] || []), generatedChallenge]
      }))
      if (generatedChallenge.starterCode) {
        setCodeContent(generatedChallenge.starterCode)
      }
    }
    if (aiGenModal.type === "projects") {
      setCourseProjects(prev => ({
        ...prev,
        [courseId]: [
          ...(prev[courseId] || []),
          {
            id: "p-" + Date.now(),
            title: aiGeneratedPreview.title || "AI Generated Project",
            description: aiGeneratedPreview.description || "AI generated project brief",
            milestoneCount: aiGeneratedPreview.milestones?.length || 4,
            currentMilestone: 0,
            percentage: 0,
            deadline: "July 15, 2026",
            techStack: aiGeneratedPreview.techStack
          }
        ]
      }))
    }
    setAiGenModal({ isOpen: false, type: null })
    setAiGeneratedPreview(null)
    const tabMap: Record<string, string> = {
      assignments: "assignments",
      quizzes: "quizzes",
      codingTests: "code",
      projects: "projects",
    }
    const targetTab = tabMap[aiGenModal.type || ""] || "course-home"
    setLmsTab(targetTab)
  }


  return (
    <div className="space-y-6">
      {!loading && user?.role === "student" && displayedCoursesList.length === 0 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-black shadow-xs">
          <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-black">LMS Access Required</p>
            <p className="text-xs text-black mt-1 leading-relaxed">
              LMS access is not enabled for your account yet. Contact your trainer or institute admin.
            </p>
          </div>
        </div>
      )}
      {/* Top Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <span>LMS Ecosystem</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">
            Manage video modules, evaluate code submissions, launch real-time online compilers, and verify course certificates.
          </p>
        </div>
        {activeRole === "admin" && lmsTab === "courses" && (
          <Badge variant="outline" className="border-primary/20 text-primary text-[10px] shrink-0">
            <Shield className="h-3 w-3 mr-1 inline" />
            Administrator View
          </Badge>
        )}
      </div>

      {/* Main Tab Controls */}
      <Tabs value={lmsTab} onValueChange={(val) => setLmsTab(val)} className="w-full">
        <div className="overflow-x-auto pb-1">
          <TabsList className="flex min-w-max h-9 gap-1 bg-muted/60 p-1 border border-border/40">
            <TabsTrigger value="courses" className="flex items-center gap-1.5 text-xs py-1"><BookOpen className="h-3.5 w-3.5" />Courses</TabsTrigger>
          </TabsList>
        </div>

        {/* ------------------ COURSE HOME (Module Cards Grid) ------------------ */}
        <TabsContent value="course-home" className="space-y-6">
          {/* Breadcrumb / course header */}
          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
            <button
              onClick={() => setLmsTab("courses")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              Back to Courses
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-bold text-foreground">{selectedCourse.title}</span>
            <Badge variant="outline" className="text-[9px] font-mono ml-1">{selectedCourse.code}</Badge>
            <Badge variant={selectedCourse.mode === "online" ? "info" : "outline"} className="text-[9px]">
              {selectedCourse.mode === "online" ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Module cards grid */}
          <div>
            <h3 className="text-sm font-bold text-foreground mb-4">
              {activeRole === "student" ? "Select a Module to Begin" : "Manage Course Modules & Content"}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">

              {/* Video Lectures */}
              {selectedCourse.features.videos && (
                <button
                  onClick={() => setLmsTab("videos")}
                  className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Video className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Video Lectures</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeRole === "student" ? "Watch course videos" : "Post video lectures & notes"}
                    </p>
                    <p className="text-[10px] text-primary/80 mt-1 font-semibold">
                      {formatModuleCount(getModuleCount(selectedCourse.id, "videos"), "video")}
                    </p>
                  </div>
                </button>
              )}

              {/* PDF Notes */}
              <button
                onClick={() => setLmsTab("notes")}
                className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
              >
                <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="h-6 w-6 text-rose-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">PDF Notes</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {activeRole === "student" ? "Download lecture notes" : "Post notes & handouts"}
                  </p>
                  <p className="text-[10px] text-primary/80 mt-1 font-semibold">
                    {formatModuleCount(batchNotes.length, "PDF", "PDFs")}
                  </p>
                </div>
              </button>

              {/* Assignments */}
              {selectedCourse.features.assignments && (
                <button
                  onClick={() => setLmsTab("assignments")}
                  className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FileText className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Assignments</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeRole === "student" ? "Submit & track tasks" : "Post assignments & grade submissions"}
                    </p>
                    <p className="text-[10px] text-primary/80 mt-1 font-semibold">
                      {formatModuleCount(getModuleCount(selectedCourse.id, "assignments"), "assignment")}
                    </p>
                  </div>
                </button>
              )}

              {/* Quizzes */}
              {selectedCourse.features.quizzes && (
                <button
                  onClick={() => setLmsTab("quizzes")}
                  className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <HelpCircle className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Quizzes</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeRole === "student" ? "Test your knowledge" : "Post quizzes & evaluate results"}
                    </p>
                    <p className="text-[10px] text-primary/80 mt-1 font-semibold">
                      {formatModuleCount(getModuleCount(selectedCourse.id, "quizzes"), "quiz", "quizzes")}
                    </p>
                  </div>
                </button>
              )}


              {/* Projects */}
              {selectedCourse.features.projects && (
                <button
                  onClick={() => setLmsTab("projects")}
                  className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <FolderGit2 className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">Projects</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeRole === "student" ? "Build real projects" : "Post project milestones & specs"}
                    </p>
                    <p className="text-[10px] text-primary/80 mt-1 font-semibold">
                      {formatModuleCount(getModuleCount(selectedCourse.id, "projects"), "project")}
                    </p>
                  </div>
                </button>
              )}

              {/* AI Tutor */}
              {selectedCourse && showAiTutor(selectedCourse) && (
                <button
                  onClick={() => setLmsTab("ai")}
                  className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
                >
                  <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Bot className="h-6 w-6 text-cyan-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">AI Tutor</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {activeRole === "student" ? "Get AI assistance" : "Configure AI tutor guidelines"}
                    </p>
                  </div>
                </button>
              )}

              {/* Certificates — always available */}
              <button
                onClick={() => setLmsTab("certificates")}
                className="group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 text-center"
              >
                <div className="h-12 w-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Award className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Certificates</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {activeRole === "student" ? "Download your cert" : "Configure templates & rules"}
                  </p>
                </div>
              </button>

            </div>
          </div>

          {(activeRole === "admin" || activeRole === "trainer") && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-foreground">Course Access & Controls</CardTitle>
                    <CardDescription className="text-xs">
                      Enrollment, feature availability, and completion rules for this batch.
                    </CardDescription>
                  </div>
                  <Button
                    variant="primary"
                    className="h-8 text-xs gap-1.5 self-start md:self-auto"
                    onClick={() => {
                      if (selectedCourse.features.videos) setLmsTab("videos")
                      else if (selectedCourse.features.assignments) setLmsTab("assignments")
                      else if (selectedCourse.features.quizzes) setLmsTab("quizzes")
                      else if (selectedCourse.features.projects) setLmsTab("projects")
                      else if (selectedCourse && showAiTutor(selectedCourse)) setLmsTab("ai")
                      else setLmsTab("certificates")
                    }}
                  >
                    <PlayCircle className="h-3.5 w-3.5" /> Enter Course
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-foreground">Enrolled Students</h4>
                      <Badge variant="outline" className="text-[9px]">
                        {activeEnrolledCount} active
                        {selectedCourse.studentNames.length > 0
                          ? ` / ${selectedCourse.studentNames.length} enrolled`
                          : ""}
                      </Badge>
                    </div>
                    {selectedCourse.studentNames.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-3 py-4 text-xs text-muted-foreground">
                        No students enrolled in this batch yet. Assign students from the Students page after lead conversion.
                      </div>
                    ) : (
                    <div className="grid gap-2">
                          {(selectedCourse?.studentNames || []).map((name: string) => {
                            const isActive = getStudentLmsAccessValue(selectedCourse.studentLmsAccess, name)
                            return (
                        <button
                          key={name}
                          type="button"
                          onClick={async () => {
                            const updatedAccess = syncStudentLmsAccess(selectedCourse.studentNames, {
                              ...selectedCourse.studentLmsAccess,
                              [name]: !isActive,
                            })
                            const updatedCourse = { ...selectedCourse, studentLmsAccess: updatedAccess }
                            applyCourseUpdate(updatedCourse)
                            await persistCourse(updatedCourse)
                          }}
                          className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/10 px-3 py-2 text-xs w-full text-left hover:bg-muted/20 transition-colors"
                        >
                          <span className="font-semibold text-foreground">{name}</span>
                          <span className={`text-[10px] font-bold ${isActive ? "text-emerald-500" : "text-red-500"}`}>
                            {isActive ? "Active" : "Blocked"}
                          </span>
                        </button>
                            )
                          })}
                    </div>
                    )}
                  </div>

                  <div className="space-y-3 lg:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-xs font-bold text-foreground">Feature Toggles</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={selectedCourse.lmsPortalAccess ? "success" : "destructive"} className="text-[9px]">
                          LMS Portal {selectedCourse.lmsPortalAccess ? "Enabled" : "Disabled"}
                        </Badge>
                        <button
                          type="button"
                          onClick={async () => {
                            const updatedCourse = {
                              ...selectedCourse,
                              lmsPortalAccess: !selectedCourse.lmsPortalAccess,
                            }
                            applyCourseUpdate(updatedCourse)
                            await persistCourse(updatedCourse)
                          }}
                          className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            selectedCourse.lmsPortalAccess ? "bg-primary" : "bg-zinc-700"
                          }`}
                          aria-label="Toggle LMS portal access"
                        >
                          <span
                            className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                              selectedCourse.lmsPortalAccess ? "translate-x-3" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                      {(Object.entries(selectedCourse.features) as Array<[keyof CourseLMS["features"], boolean]>)
                        .filter(([feat]) => feat !== "codingTests")
                        .map(([feat, enabled]) => (
                        <div key={feat} className="flex items-center justify-between rounded-lg border border-border/50 bg-card px-3 py-2 text-xs">
                          <span className="capitalize font-semibold text-foreground flex items-center gap-2">
                            <span className={enabled ? "text-emerald-500" : "text-red-500/80"}>
                              {enabled ? "✓" : "✗"}
                            </span>
                            <span>{feat.replace(/([A-Z])/g, " $1")}</span>
                          </span>
                          {(activeRole === "admin" || activeRole === "trainer") ? (
                            <button
                              onClick={async () => {
                                const updatedFeatures = { ...selectedCourse.features, [feat]: !enabled }
                                const updatedCourse = { ...selectedCourse, features: updatedFeatures }
                                applyCourseUpdate(updatedCourse)
                                await persistCourse(updatedCourse)
                              }}
                              className={`relative inline-flex h-4 w-7 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                enabled ? "bg-primary" : "bg-zinc-700"
                              }`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                  enabled ? "translate-x-3" : "translate-x-0"
                                }`}
                              />
                            </button>
                          ) : (
                            <Badge variant={enabled ? "success" : "outline"} className="text-[8px]">
                              {enabled ? "On" : "Off"}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ------------------ COURSE MANAGEMENT ------------------ */}
        <TabsContent value="courses" className="space-y-5">
          {loading ? (
            <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4">
              <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <p className="text-xs text-muted-foreground">Loading LMS courses and batch portals...</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <LayoutGrid className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Active Batches</p>
                      <p className="text-xl font-bold text-foreground">{lmsCourseStats.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Enrolled Students</p>
                      <p className="text-xl font-bold text-foreground">{lmsCourseStats.enrolled}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <MonitorPlay className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">LMS Portals On</p>
                      <p className="text-xl font-bold text-foreground">{lmsCourseStats.portalEnabled}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-card border-border/60">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <Video className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Online Batches</p>
                      <p className="text-xl font-bold text-foreground">{lmsCourseStats.online}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-card border border-border rounded-xl p-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Course Portals</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Open a batch portal to manage modules, content, and student LMS access.
                  </p>
                </div>
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search batch, course, instructor..."
                    value={courseSearchQuery}
                    onChange={(e) => setCourseSearchQuery(e.target.value)}
                    className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {filteredCoursesList.length === 0 ? (
                <Card className="bg-card border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center px-4">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/60 border border-border">
                      <BookOpen className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold text-foreground">
                      {courseSearchQuery ? "No matching course portals" : "No enrolled courses yet"}
                    </p>
                    <p className="mt-1 max-w-md text-xs text-muted-foreground leading-relaxed">
                      {courseSearchQuery
                        ? "Try a different search term or clear the filter to see all batches."
                        : "Create batches from Courses & Batches, then enable LMS portal access for students."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredCoursesList.map((course) => {
                    const capacityPercent = getCapacityPercent(course.enrolled, course.capacity)
                    const enabledModules = countEnabledModules(course.features)
                    const isSelected = selectedCourse.id === course.id

                    return (
                      <Card
                        key={course.id}
                        className={`group bg-card overflow-hidden flex flex-col transition-all duration-200 hover:shadow-md hover:border-primary/40 border border-border/50 ${
                          isSelected ? "ring-1 ring-primary/40 border-primary/50 shadow-xs" : ""
                        }`}
                      >
                        <div
                          className={`h-1 ${
                            course.mode === "offline"
                              ? "bg-gradient-to-r from-amber-500 to-orange-500"
                              : "bg-gradient-to-r from-primary via-sky-500 to-cyan-500"
                          }`}
                        />

                        <CardHeader className="pb-3 space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="outline" className="text-[9px] font-mono">
                                  {course.code}
                                </Badge>
                                <Badge variant="success" className="text-[9px]">Open</Badge>
                                <Badge
                                  variant="outline"
                                  className={
                                    course.mode === "offline"
                                      ? "text-[9px] bg-amber-500/5 border-amber-500/20 text-amber-600"
                                      : "text-[9px] bg-blue-500/5 border-blue-500/20 text-blue-600"
                                  }
                                >
                                  {course.mode === "offline" ? "Offline" : "Online"}
                                </Badge>
                              </div>
                              <CardTitle className="text-base font-bold text-foreground leading-snug truncate">
                                {course.title}
                              </CardTitle>
                              <CardDescription className="text-[11px] mt-0.5 line-clamp-1">
                                {course.batch || course.title}
                              </CardDescription>
                            </div>
                            <div
                              className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center border ${
                                course.lmsPortalAccess
                                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                                  : "bg-muted/40 border-border text-muted-foreground"
                              }`}
                              title={course.lmsPortalAccess ? "LMS portal enabled" : "LMS portal disabled"}
                            >
                              <BookOpen className="h-4 w-4" />
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-0 flex-1">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                              <p className="text-[9px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Schedule
                              </p>
                              <p className="text-[11px] font-medium text-foreground mt-1 capitalize line-clamp-2">
                                {course.schedule || "Not set"}
                              </p>
                            </div>
                            <div className="rounded-lg border border-border/50 bg-muted/20 px-2.5 py-2">
                              <p className="text-[9px] uppercase font-semibold text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Instructor
                              </p>
                              <p className="text-[11px] font-medium text-foreground mt-1 line-clamp-2">
                                {course.trainer || "Unassigned"}
                              </p>
                            </div>
                          </div>

                          {course.mode === "offline" ? (
                            <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                              <span className="flex items-center gap-2 text-[11px] font-medium text-foreground">
                                <MapPin className="h-3.5 w-3.5 text-amber-600" />
                                In-Person Training
                              </span>
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md font-mono uppercase">
                                Room {course.roomName || "TBD"}
                              </span>
                            </div>
                          ) : course.meetLink ? (
                            <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
                              <span className="flex items-center gap-2 text-[11px] font-medium text-foreground min-w-0">
                                <Video className="h-3.5 w-3.5 text-primary shrink-0" />
                                <span className="truncate">{getPlatformLabel(course.platform)}</span>
                              </span>
                              <a
                                href={course.meetLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-md hover:bg-primary/20 transition-colors"
                              >
                                Launch
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          ) : null}

                          {activeRole !== "student" && (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[10px] font-medium">
                                <span className="text-muted-foreground">
                                  {course.enrolled} / {course.capacity} students
                                </span>
                                <span className={capacityPercent >= 90 ? "text-destructive" : "text-muted-foreground"}>
                                  {capacityPercent}% full
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full transition-all ${getCapacityBarClass(capacityPercent)}`}
                                  style={{ width: `${capacityPercent}%` }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[10px] text-muted-foreground px-0.5">
                            <span>{enabledModules} modules enabled</span>
                            <span className={course.lmsPortalAccess ? "text-emerald-600 font-semibold" : "text-muted-foreground"}>
                              {course.lmsPortalAccess ? "Portal active" : "Portal off"}
                            </span>
                          </div>

                          {(activeRole === "admin" || activeRole === "trainer") && (
                            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold text-foreground">LMS Portal Access</p>
                                <p className="text-[10px] text-muted-foreground">Student login for this batch</p>
                              </div>
                              <button
                                type="button"
                                onClick={async () => {
                                  const updatedCourse = { ...course, lmsPortalAccess: !course.lmsPortalAccess }
                                  applyCourseUpdate(updatedCourse)
                                  await persistCourse(updatedCourse)
                                }}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  course.lmsPortalAccess ? "bg-primary" : "bg-muted-foreground/30"
                                }`}
                                aria-label="Toggle LMS portal access"
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition duration-200 ease-in-out ${
                                    course.lmsPortalAccess ? "translate-x-4" : "translate-x-0"
                                  }`}
                                />
                              </button>
                            </div>
                          )}
                        </CardContent>

                        <CardFooter className="pt-0 pb-4 px-4 flex gap-2 border-t border-border/40 bg-muted/5">
                          <Button
                            variant="primary"
                            size="sm"
                            className="flex-1 h-8 text-xs gap-1.5"
                            icon={PlayCircle}
                            onClick={() => {
                              setSelectedCourse(course)
                              setLmsTab("course-home")
                            }}
                          >
                            Enter Course
                          </Button>
                          {activeRole === "admin" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 shrink-0"
                              onClick={() => {
                                setEditingCourse(course)
                                setShowConfigModal(true)
                              }}
                              title="Configure course"
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* Module/Features Config Dialog */}
          {showConfigModal && editingCourse && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs">
              <Card className="w-full max-w-md bg-card p-6 shadow-xl animate-scale-in">
                <CardHeader className="p-0 pb-4 border-b border-border">
                  <CardTitle className="text-sm font-bold text-foreground">Configure Course: {editingCourse.title}</CardTitle>
                  <CardDescription className="text-xs">Enable/disable features and assign controls.</CardDescription>
                </CardHeader>
                <div className="py-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Assign Trainer</label>
                      <input 
                        type="text" 
                        value={editingCourse.trainer} 
                        onChange={(e) => setEditingCourse({...editingCourse, trainer: e.target.value})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Timetable Schedule</label>
                      <input 
                        type="text" 
                        value={editingCourse.schedule} 
                        onChange={(e) => setEditingCourse({...editingCourse, schedule: e.target.value})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Class Capacity</label>
                      <input 
                        type="number" 
                        value={editingCourse.capacity} 
                        onChange={(e) => setEditingCourse({...editingCourse, capacity: Number(e.target.value)})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">Class Mode</label>
                      <select 
                        value={editingCourse.mode} 
                        onChange={(e) => setEditingCourse({...editingCourse, mode: e.target.value as CourseMode})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                      </select>
                    </div>
                  </div>

                  {editingCourse.mode === "online" ? (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Meet Link</label>
                      <input 
                        type="text" 
                        value={editingCourse.meetLink || ""} 
                        onChange={(e) => setEditingCourse({...editingCourse, meetLink: e.target.value})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Room Name / Code</label>
                      <input 
                        type="text" 
                        value={editingCourse.roomName || ""} 
                        onChange={(e) => setEditingCourse({...editingCourse, roomName: e.target.value})}
                        className="w-full h-8 px-3 rounded-lg border border-border bg-card text-xs"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground">Enabled Modules</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(editingCourse.features) as Array<keyof CourseLMS["features"]>)
                        .filter((feat) => feat !== "codingTests")
                        .map((feat) => (
                        <label key={feat} className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={editingCourse.features[feat]}
                            onChange={(e) => {
                              setEditingCourse({
                                ...editingCourse,
                                features: {
                                  ...editingCourse.features,
                                  [feat]: e.target.checked
                                }
                              })
                            }}
                            className="rounded border-border bg-card text-primary focus:ring-primary"
                          />
                          <span className="capitalize">{feat.replace(/([A-Z])/g, " $1")}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-border">
                  <Button variant="outline" className="h-8 text-xs" onClick={() => setShowConfigModal(false)}>Cancel</Button>
                  <Button variant="primary" className="h-8 text-xs" onClick={async () => {
                    await persistCourse(editingCourse)
                    setShowConfigModal(false)
                  }}>Save Configurations</Button>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ------------------ VIDEO LEARNING MODULE ------------------ */}
        <TabsContent value="videos" className="space-y-6">
          {(activeRole === "admin" || activeRole === "trainer") && (
            <Card className="overflow-hidden border border-border/80 shadow-sm">
              <div className="h-1 bg-gradient-to-r from-primary via-sky-500 to-cyan-500" />
              <CardContent className="p-0">
                <div className="flex flex-col lg:flex-row lg:divide-x divide-border/60">
                  <div className="lg:w-[280px] shrink-0 p-5 bg-muted/20 space-y-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-foreground">Post a Video Lecture</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Add a lecture to <span className="font-semibold text-foreground">{selectedCourse.title}</span>
                        <span className="text-muted-foreground"> · {selectedCourse.code}</span>
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card/80 p-3 space-y-2 text-[10px] text-muted-foreground">
                      <p className="font-bold uppercase tracking-wider text-foreground/70">Quick tips</p>
                      <p>• Paste a YouTube or direct video link</p>
                      <p>• Or upload MP4, WebM, MOV (max 250MB)</p>
                      <p>• Students see it instantly in the playlist</p>
                    </div>
                  </div>

                  <div className="flex-1 p-5 space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Lecture title
                      </label>
                      <Input
                        value={videoPostTitle}
                        onChange={(e) => setVideoPostTitle(e.target.value)}
                        placeholder="e.g. Express Routing setup"
                        className="h-10 text-sm bg-card border-border/80"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Description
                      </label>
                      <textarea
                        value={videoPostDescription}
                        onChange={(e) => setVideoPostDescription(e.target.value)}
                        placeholder="What students will learn in this lecture…"
                        className="min-h-[88px] w-full rounded-lg border border-border/80 bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Video source
                      </label>

                      <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-border/60">
                          <button
                            type="button"
                            onClick={() => setVideoUploadMode("url")}
                            className={`relative flex items-start gap-3 p-4 text-left transition-all ${
                              videoUploadMode === "url"
                                ? "bg-primary/5 ring-1 ring-inset ring-primary/30"
                                : "bg-muted/10 hover:bg-muted/25"
                            }`}
                          >
                            {videoUploadMode === "url" && (
                              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
                            )}
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                                videoUploadMode === "url"
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border/60 bg-background text-muted-foreground"
                              }`}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className={`text-sm font-semibold ${videoUploadMode === "url" ? "text-primary" : "text-foreground"}`}>
                                Paste link
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                YouTube, Vimeo, or direct video URL
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => setVideoUploadMode("file")}
                            className={`relative flex items-start gap-3 p-4 text-left transition-all ${
                              videoUploadMode === "file"
                                ? "bg-primary/5 ring-1 ring-inset ring-primary/30"
                                : "bg-muted/10 hover:bg-muted/25"
                            }`}
                          >
                            {videoUploadMode === "file" && (
                              <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-primary" />
                            )}
                            <div
                              className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                                videoUploadMode === "file"
                                  ? "border-primary/30 bg-primary/10 text-primary"
                                  : "border-border/60 bg-background text-muted-foreground"
                              }`}
                            >
                              <Upload className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className={`text-sm font-semibold ${videoUploadMode === "file" ? "text-primary" : "text-foreground"}`}>
                                Upload file
                              </p>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                MP4, WebM, MOV · max 250MB
                              </p>
                            </div>
                          </button>
                        </div>

                        <div className="border-t border-border/60 bg-muted/5 p-4">
                          {videoUploadMode === "url" ? (
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-muted-foreground">Video URL</p>
                              <div className="flex items-center gap-2 rounded-lg border border-border/80 bg-background px-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-shadow">
                                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <input
                                  type="url"
                                  value={videoPostUrl}
                                  onChange={(e) => setVideoPostUrl(e.target.value)}
                                  placeholder="https://youtube.com/watch?v=…"
                                  className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
                                />
                              </div>
                              {videoUrlPreview?.loading ? (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                  Fetching video details…
                                </p>
                              ) : videoUrlPreview ? (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                                  Detected
                                  {!isVideoDurationMissing(videoUrlPreview.duration)
                                    ? ` · ${videoUrlPreview.duration}`
                                    : ""}
                                  {videoUrlPreview.title ? ` · ${videoUrlPreview.title}` : ""}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[10px] font-medium text-muted-foreground">Video file</p>
                              <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border/80 bg-background px-4 py-6 transition-colors hover:border-primary/40 hover:bg-primary/5">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-transform group-hover:scale-105">
                                  <Upload className="h-5 w-5" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm font-semibold text-foreground">
                                    {videoPostFile ? videoPostFile.name : "Click to browse or drop video here"}
                                  </p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {videoPostFile
                                      ? `${(videoPostFile.size / (1024 * 1024)).toFixed(1)} MB selected${
                                          videoFilePreviewDuration ? ` · ${videoFilePreviewDuration}` : ""
                                        }`
                                      : "Supported: MP4, WebM, MOV, AVI"}
                                  </p>
                                </div>
                                {videoPostFile && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      setVideoPostFile(null)
                                    }}
                                    className="text-[11px] font-medium text-red-500 hover:text-red-600"
                                  >
                                    Remove file
                                  </button>
                                )}
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,.mp4,.webm,.mov,.avi"
                                  className="hidden"
                                  onChange={(e) => setVideoPostFile(e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                      <Button
                        variant="outline"
                        className="h-9 text-xs px-4"
                        onClick={resetVideoPostForm}
                        disabled={isPostingVideo}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="primary"
                        className="h-9 text-xs px-5 gap-2 font-semibold"
                        disabled={
                          isPostingVideo ||
                          !(videoPostTitle.trim() || videoUrlPreview?.title?.trim()) ||
                          (videoUploadMode === "url" ? !videoPostUrl.trim() : !videoPostFile)
                        }
                        onClick={() => void handlePostVideoLecture()}
                      >
                        {isPostingVideo ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Posting…
                          </>
                        ) : (
                          <>
                            <PlayCircle className="h-4 w-4" /> Post Lecture
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden bg-black/95 border-none">
                <div className="aspect-video relative w-full bg-zinc-950">
                  {!activeVideo ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <Video className="h-10 w-10 text-zinc-500 mb-3" />
                      <p className="text-xs font-semibold text-zinc-200">No video lectures posted yet</p>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        {activeRole === "student"
                          ? "Your trainer has not published lectures for this batch."
                          : "Post the first lecture using the form above."}
                      </p>
                    </div>
                  ) : getYoutubeEmbedUrl(activeVideo.src) ? (
                    <iframe
                      src={getYoutubeEmbedUrl(activeVideo.src) || undefined}
                      title={activeVideo.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video
                      key={activeVideo.id}
                      src={resolveMediaUrl(activeVideo.src)}
                      controls
                      className="w-full h-full object-contain bg-black"
                    />
                  )}
                </div>
              </Card>

              {activeVideo ? (
                <div>
                  <h3 className="text-sm font-bold text-foreground">{activeVideo.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeVideo.description || "No description provided for this lecture."}
                  </p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-[9px] flex items-center gap-1">
                      <Clock className="h-3 w-3" />{" "}
                      {isVideoDurationMissing(activeVideo.duration)
                        ? "Auto-detecting…"
                        : activeVideo.duration}{" "}
                      Duration
                    </Badge>
                    {normalizeVideoResources(activeVideo.resources).length > 0 ? (
                      <Badge variant="success" className="text-[9px] flex items-center gap-1">
                        <Check className="h-3 w-3" />{" "}
                        {normalizeVideoResources(activeVideo.resources).length} resource
                        {normalizeVideoResources(activeVideo.resources).length === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Course Playlists ({courseVideos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 max-h-[380px] overflow-y-auto">
                  {courseVideos.length === 0 ? (
                    <p className="p-4 text-xs text-muted-foreground">No lectures in this playlist yet.</p>
                  ) : (
                    <div className="divide-y divide-border">
                      {courseVideos.map((video, index) => (
                        <div
                          key={video.id}
                          className={`p-3 text-xs space-y-1 ${
                            activeVideo?.id === video.id ? "bg-primary/5 text-primary" : "hover:bg-muted/40"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setCurrentVideoId(video.id)}
                              className="flex-1 text-left space-y-1"
                            >
                              <div className="flex justify-between font-semibold gap-2">
                                <span>
                                  Lesson #{index + 1}: {video.title}
                                </span>
                                {video.isCompleted ? (
                                  <CheckCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                ) : (
                                  <PlayCircle className="h-3.5 w-3.5 text-primary shrink-0" />
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {isVideoDurationMissing(video.duration)
                                    ? "Auto-detecting…"
                                    : video.duration}
                                </span>
                                <span>·</span>
                                <span>{getVideoSourceLabel(video.src)}</span>
                                {video.createdAt ? (
                                  <>
                                    <span>·</span>
                                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                  </>
                                ) : null}
                              </div>
                              {video.description ? (
                                <p className="text-[9px] text-muted-foreground line-clamp-2 leading-relaxed">
                                  {video.description}
                                </p>
                              ) : null}
                            </button>
                            {(activeRole === "admin" || activeRole === "trainer") && (
                              <button
                                type="button"
                                onClick={() => void handleDeleteVideoLecture(video.id)}
                                className="text-red-500 hover:text-red-400 shrink-0"
                                aria-label={`Delete ${video.title}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="mt-4">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-[10px] font-bold text-muted-foreground uppercase">Lesson Resources</h4>
                  {!activeVideo || normalizeVideoResources(activeVideo.resources).length === 0 ? (
                    <p className="text-xs text-muted-foreground">No resources for this video</p>
                  ) : (
                    normalizeVideoResources(activeVideo.resources).map((resource) => (
                      <div key={`${resource.name}-${resource.url}`} className="flex items-center justify-between text-xs gap-2">
                        <span className="text-foreground truncate">{resource.name}</span>
                        <a
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="inline-flex"
                        >
                          <Button variant="outline" className="h-6 text-[9px] px-2 flex items-center gap-1">
                            <Download className="h-3 w-3" /> Download
                          </Button>
                        </a>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------ PDF NOTES MODULE ------------------ */}
        <TabsContent value="notes" className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-border/40">
            <button
              onClick={() => setLmsTab("course-home")}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors font-medium"
            >
              <ChevronRight className="h-3.5 w-3.5 rotate-180" />
              Back to Course Home
            </button>
            <span className="text-muted-foreground">/</span>
            <span className="text-xs font-bold text-foreground">{selectedCourse.title}</span>
            <Badge variant="outline" className="text-[9px] font-mono">{selectedCourse.code}</Badge>
          </div>

          {(activeRole === "admin" || activeRole === "trainer") && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Post PDF Notes</p>
                  <p className="text-[10px] text-muted-foreground">
                    Upload lecture notes, handouts, and reference PDFs for this batch
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {(activeRole === "admin" || activeRole === "trainer") && (
                <Card className="border-rose-500/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold">Upload New PDF</CardTitle>
                    <CardDescription className="text-xs">
                      Add course notes that enrolled students can download anytime.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">PDF Title</label>
                        <Input
                          value={notePostTitle}
                          onChange={(e) => setNotePostTitle(e.target.value)}
                          placeholder="e.g. Express Routing Notes"
                          className="h-8 text-xs bg-card"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase text-muted-foreground">PDF File</label>
                        <label className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-rose-500/30 bg-card px-3 h-8 cursor-pointer hover:bg-rose-500/5">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {notePostFile ? notePostFile.name : "Choose PDF file…"}
                          </span>
                          <Upload className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            onChange={(e) => setNotePostFile(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        className="h-8 text-xs gap-1.5 bg-rose-500 hover:bg-rose-600 border-0"
                        disabled={isUploadingNote || !notePostTitle.trim() || !notePostFile}
                        onClick={() => void handleUploadCourseNote()}
                      >
                        {isUploadingNote ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Uploading…
                          </>
                        ) : (
                          <>
                            <Upload className="h-3.5 w-3.5" /> Upload PDF
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Course PDF Library</h3>
                <Badge variant="outline" className="text-[9px]">
                  {formatModuleCount(batchNotes.length, "PDF", "PDFs")}
                </Badge>
              </div>

              {batchNotes.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-xs font-semibold text-foreground">No PDF notes yet</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {(activeRole === "admin" || activeRole === "trainer")
                        ? "Upload your first lecture notes or handout above."
                        : "Your trainer has not uploaded notes for this batch yet."}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {batchNotes.map((note) => (
                    <Card key={note.id} className="hover:border-rose-500/30 transition-colors">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                            <FileText className="h-5 w-5 text-rose-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-foreground truncate">{note.title}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {note.fileName}
                              {note.uploadedAt ? ` · ${new Date(note.uploadedAt).toLocaleDateString()}` : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <a
                            href={resolveMediaUrl(note.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            download={note.fileName}
                          >
                            <Button variant="outline" className="h-7 text-[10px] px-2 gap-1">
                              <Download className="h-3 w-3" /> Download
                            </Button>
                          </a>
                          {(activeRole === "admin" || activeRole === "trainer") && (
                            <button
                              type="button"
                              onClick={() => void handleDeleteCourseNote(note.id)}
                              className="text-red-500 hover:text-red-400 p-1"
                              aria-label={`Delete ${note.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Module Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Batch</span>
                    <span className="font-semibold text-foreground">{selectedCourse.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total PDFs</span>
                    <span className="font-semibold text-foreground">{batchNotes.length}</span>
                  </div>
                  {activeRole !== "student" && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Enrolled</span>
                    <span className="font-semibold text-foreground">{selectedCourse.studentNames.length}</span>
                  </div>
                  )}
                  <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-[10px] text-muted-foreground leading-relaxed">
                    PDF notes are shared with all active enrolled students in this batch. Attach supplementary
                    materials per video from the Video Lectures module if needed.
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------ ASSIGNMENT MODULE ------------------ */}
        <TabsContent value="assignments" className="space-y-6">
          {/* Admin: Post a new assignment */}
          {/* Admin / Trainer: Post a new assignment or Generate with AI */}
          {(activeRole === "admin" || activeRole === "trainer") && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Post a New Assignment</p>
                  <p className="text-[10px] text-muted-foreground">Add manually or auto-generate with AI</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  className="h-8 text-xs px-3.5 gap-1.5 bg-amber-500 hover:bg-amber-600 border-0 font-bold"
                  onClick={() => {
                    resetAssignmentForm()
                    setIsAssignmentCreatorOpen(true)
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> Launch Assignment Builder Dialog
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* List & Upload */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground">Assignments Submissions Ledger</h3>
                {activeRole === "trainer" && <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px]">Trainer Grading Active</Badge>}
              </div>

              <div className="space-y-3">
                {((courseAssignments[selectedCourse.id]) || []).map((assignment) => {
                  const mySubmission = assignment.submissions?.[activeStudentName] || {
                    status: assignment.status,
                    grade: assignment.grade,
                    feedback: assignment.feedback
                  }
                  return (
                    <Card key={assignment.id} className="p-4 bg-card">
                      <div className="flex flex-col gap-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground">{assignment.title}</h4>
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" /> Deadline: {assignment.deadline}
                            </p>
                            {activeRole === "student" && mySubmission.grade && (
                              <div className="bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 p-2 rounded-md text-[10px] mt-2">
                                <strong>Grade: {mySubmission.grade}</strong> — {mySubmission.feedback}
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-start">
                            {(activeRole === "admin" || activeRole === "trainer") && (
                              <Button
                                variant="outline"
                                className="h-7 text-[10px] px-2 gap-1 text-red-500 border-red-500/30 hover:bg-red-500/10"
                                onClick={() => void handleDeleteAssignment(assignment.id)}
                              >
                                <Trash2 className="h-3 w-3" /> Delete
                              </Button>
                            )}

                            {activeRole === "student" && (
                              <div className="flex sm:flex-col items-end gap-2">
                                {mySubmission.status === "pending" ? (
                                  <>
                                    <Badge variant="warning" className="text-[9px]">Pending</Badge>
                                    <Button 
                                      variant="primary" 
                                      className="h-7 text-[10px]"
                                      onClick={() => {
                                        setSubmittingFile(assignment.id)
                                      }}
                                    >
                                      Upload Submission
                                    </Button>
                                  </>
                                ) : (
                                  <>
                                    <Badge variant="success" className="text-[9px]">Submitted</Badge>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {(activeRole === "admin" || activeRole === "trainer") && (
                          <div className="pt-3 border-t border-border/40 space-y-2">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Student Submissions Report</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {(selectedCourse?.studentNames || []).map((studentName: string) => {
                                const sub = assignment.submissions?.[studentName] || { status: "pending", grade: "", feedback: "" }
                                return (
                                  <div key={studentName} className="flex items-center justify-between p-2 rounded-lg border border-border/60 bg-muted/5 text-xs">
                                    <div>
                                      <p className="font-semibold text-foreground">{studentName}</p>
                                      {sub.grade ? (
                                        <p className="text-[9px] text-emerald-500 font-bold">Grade: {sub.grade} <span className="text-muted-foreground font-normal">• {sub.feedback}</span></p>
                                      ) : (
                                        <p className="text-[9px] text-muted-foreground">No grade yet</p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Badge variant={sub.status === "submitted" ? "success" : "warning"} className="text-[8px] py-0">
                                        {sub.status === "submitted" ? "Submitted" : "Pending"}
                                      </Badge>
                                      {sub.status === "submitted" && (
                                        <Button
                                          variant="outline"
                                          className="h-6 px-2 text-[9px]"
                                          onClick={() => {
                                            setReviewingAssignment(assignment)
                                            setReviewingStudentName(studentName)
                                          }}
                                        >
                                          {sub.grade ? "Regrade" : "Grade"}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Submission / Grade modal */}
            <div>
              {submittingFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-primary">Upload File</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="border-2 border-dashed border-border/80 rounded-lg p-6 text-center text-xs text-muted-foreground">
                      <FileText className="h-8 w-8 text-primary mx-auto mb-2" />
                      <span>Drag and drop assignment file here (.zip, .pdf)</span>
                    </div>
                    <Button 
                      className="w-full text-xs h-8"
                      onClick={() => {
                        void (async () => {
                          const nextAssignments = (courseAssignments[selectedCourse.id] || []).map((assignment) => {
                            if (assignment.id !== submittingFile) return assignment
                            const updatedSubmissions = {
                              ...(assignment.submissions || {}),
                              [activeStudentName]: { status: "submitted", grade: "", feedback: "" },
                            }
                            return {
                              ...assignment,
                              status: "submitted",
                              submissions: updatedSubmissions,
                            }
                          })
                          await syncAssignmentsForCourse(selectedCourse.id, nextAssignments)
                          setSubmittingFile("")
                        })()
                      }}
                    >
                      Submit Now
                    </Button>
                  </CardContent>
                </Card>
              )}

              {reviewingAssignment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-500">Grade Assignment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-xs">
                    <p className="font-semibold text-foreground">Student: {reviewingStudentName}</p>
                    <p className="text-[10px] text-muted-foreground">Task: {reviewingAssignment.title}</p>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Grade</label>
                      <input 
                        type="text" 
                        placeholder="e.g. A+" 
                        className="w-full h-8 px-2 rounded bg-muted/20 border border-border text-xs"
                        id="grade-input"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase">Trainer Feedback</label>
                      <textarea 
                        placeholder="Type comments..." 
                        className="w-full h-16 p-2 rounded bg-muted/20 border border-border text-xs"
                        id="feedback-input"
                      />
                    </div>

                     <Button 
                      className="w-full text-xs h-8"
                      onClick={() => {
                        void (async () => {
                          if (!reviewingAssignment) return
                          const gradeVal =
                            (document.getElementById("grade-input") as HTMLInputElement)?.value || "A"
                          const feedbackVal =
                            (document.getElementById("feedback-input") as HTMLTextAreaElement)?.value ||
                            "Good effort."
                          const nextAssignments = (courseAssignments[selectedCourse.id] || []).map(
                            (assignment) => {
                              if (assignment.id !== reviewingAssignment.id) return assignment
                              const updatedSubmissions = {
                                ...(assignment.submissions || {}),
                                [reviewingStudentName]: {
                                  status: "submitted",
                                  grade: gradeVal,
                                  feedback: feedbackVal,
                                },
                              }
                              return {
                                ...assignment,
                                grade:
                                  reviewingStudentName === activeStudentName ? gradeVal : assignment.grade,
                                feedback:
                                  reviewingStudentName === activeStudentName
                                    ? feedbackVal
                                    : assignment.feedback,
                                submissions: updatedSubmissions,
                              }
                            }
                          )
                          await syncAssignmentsForCourse(selectedCourse.id, nextAssignments)
                          setReviewingAssignment(null)
                          setReviewingStudentName("")
                        })()
                      }}
                    >
                      Submit Grade
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ------------------ QUIZZES & TESTS MODULE ------------------ */}
        <TabsContent value="quizzes" className="space-y-6">
          {/* Admin / Trainer: Post a new quiz */}
          {(activeRole === "admin" || activeRole === "trainer") && (
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-purple-500 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-foreground">Post a New Quiz</p>
                  <p className="text-[10px] text-muted-foreground">Each quiz needs a unique topic and different questions</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  className="h-8 text-xs px-3.5 gap-1.5 bg-purple-500 hover:bg-purple-600 border-0 font-bold"
                  onClick={openQuizCreatorDialog}
                >
                  <Plus className="h-3.5 w-3.5" /> Launch Quiz Builder Dialog
                </Button>
              </div>
            </div>
          )}

          {batchQuizPacks.length === 0 ? (
            <Card className="max-w-md mx-auto text-center p-8 space-y-4">
              <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <div className="space-y-1">
                <h4 className="font-bold text-sm text-foreground">No Active Quizzes</h4>
                <p className="text-xs text-muted-foreground">There are no quizzes posted for this course yet.</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(240px,280px)_1fr] gap-4">
              <Card className="h-fit border-purple-500/10">
                <CardHeader className="pb-2 border-b border-border/60">
                  <CardTitle className="text-xs font-bold text-foreground flex items-center gap-2">
                    <Layers className="h-4 w-4 text-purple-500" />
                    Quiz Tests ({batchQuizPacks.length})
                  </CardTitle>
                  <CardDescription className="text-[10px]">
                    {activeRole === "student"
                      ? "Select a quiz to view status or attempt"
                      : "Select a quiz to review questions and reports"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 space-y-1">
                  {batchQuizPacks.map((pack, packIdx) => {
                    const isSelected = pack.id === activeQuizPack?.id
                    const studentSub =
                      activeRole === "student"
                        ? getQuizSubmission(
                            courseQuizSubmissions[selectedCourse.id],
                            pack.id,
                            activeStudentName
                          )
                        : null
                    const quizSubs = courseQuizSubmissions[selectedCourse.id]?.[pack.id] || {}
                    const completedCount = Object.values(quizSubs).filter((sub) => sub.completed).length
                    const enrolledCount = selectedCourse?.studentNames?.length || 0

                    return (
                      <div
                        key={pack.id}
                        className={`rounded-lg border transition-colors ${
                          isSelected
                            ? "border-purple-500/40 bg-purple-500/5"
                            : "border-border/60 bg-muted/5 hover:bg-muted/20"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedQuizId(pack.id)}
                          className="w-full p-3 text-left"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1">
                              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                Test {packIdx + 1}
                              </p>
                              <p className="text-xs font-semibold text-foreground truncate">{pack.title}</p>
                              <p className="text-[10px] text-purple-500/90 font-medium truncate">
                                Topic: {getQuizPackTopic(pack)}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {pack.questions.length} questions • {pack.timerMinutes || Math.max(pack.questions.length * 3, 10)} mins
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              {activeRole === "student" ? (
                                <Badge
                                  variant={studentSub?.completed ? "success" : "warning"}
                                  className="text-[9px]"
                                >
                                  {studentSub?.completed ? "Done" : "Pending"}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] border-purple-500/20 text-purple-500">
                                  {completedCount}/{enrolledCount} done
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                        {(activeRole === "admin" || activeRole === "trainer") && (
                          <div className="px-3 pb-2">
                            <Button
                              variant="ghost"
                              className="h-7 w-full text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
                              onClick={() => {
                                if (window.confirm(`Delete "${pack.title}" and all student attempts for this quiz?`)) {
                                  void handleDeleteQuizPack(pack.id)
                                }
                              }}
                            >
                              <Trash2 className="h-3 w-3 mr-1" /> Remove Quiz
                            </Button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>

              {activeRole === "student" ? (
            <Card className="w-full">
              <CardHeader className="border-b border-border/80">
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>Quiz Status: Active</span>
                  {!getQuizSubmission(
                    courseQuizSubmissions[selectedCourse.id],
                    activeQuizPack?.id || "",
                    activeStudentName
                  )?.completed && !quizCompleted && quizStarted && (
                    <span className="text-red-500 font-semibold flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 animate-pulse" />
                      Time Left: {Math.floor(quizTimer / 60)}:{(quizTimer % 60).toString().padStart(2, "0")}
                    </span>
                  )}
                </div>
                <CardTitle className="text-sm font-bold text-foreground mt-2">
                  {activeQuizMeta.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  MCQ Quiz • {activeQuizMeta.timerMinutes || Math.max(activeQuizQuestions.length * 3, 10)} mins • {activeQuizMeta.negativeMarking || "Standard scoring"}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(() => {
                  const studentQuizSub = getQuizSubmission(
                    courseQuizSubmissions[selectedCourse.id],
                    activeQuizPack?.id || "",
                    activeStudentName
                  )
                  const isQuizSubmitted =
                    studentQuizSub?.completed || quizCompleted
                  const correctAnswers = studentQuizSub?.score ?? 0
                  const totalQuestions =
                    studentQuizSub?.total || activeQuizQuestions.length
                  const scorePercent =
                    totalQuestions > 0
                      ? Math.round((correctAnswers / totalQuestions) * 100)
                      : 0
                  const passed = scorePercent >= 60

                  if (isQuizSubmitted) {
                    return (
                  <div className="text-center py-6 space-y-4">
                    <Award className="h-12 w-12 text-emerald-500 mx-auto" />
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground">Quiz Evaluation Completed!</h4>
                      <p className="text-xs text-muted-foreground">Answers evaluated instantly using local logic triggers.</p>
                    </div>
                    <div className="p-3 bg-muted/20 border border-border/60 rounded-lg inline-block text-xs space-y-1.5">
                      <p>Total Questions: <strong>{totalQuestions}</strong></p>
                      <p>Correct Answers: <strong>{correctAnswers}</strong></p>
                      <p className={`font-semibold ${passed ? "text-emerald-500" : "text-amber-500"}`}>
                        Evaluation Status: {passed ? "Pass" : "Needs Improvement"} ({scorePercent}%)
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground max-w-sm mx-auto">
                      Your attempt for this quiz has been recorded. Resubmission is blocked.
                    </p>
                  </div>
                    )
                  }

                  return (
                  <>
                    {!quizStarted && (
                      <div className="text-center py-8 space-y-4">
                        <HelpCircle className="h-12 w-12 text-primary mx-auto" />
                        <div className="space-y-1">
                          <h4 className="font-bold text-sm text-foreground">Ready to start this quiz?</h4>
                          <p className="text-xs text-muted-foreground">
                            {batchQuizPacks.length > 1
                              ? "Each quiz test is tracked separately. Resubmission is blocked once submitted."
                              : "Ensure you have a reliable connection. Resubmission is blocked."}
                          </p>
                        </div>
                        <Button variant="primary" className="text-xs h-9 px-6 cursor-pointer" onClick={() => {
                          setQuizTimer(activeQuizTimerSeconds)
                          setQuizStarted(true)
                        }}>
                          Start Quiz ({activeQuizMeta.timerMinutes || Math.max(activeQuizQuestions.length * 3, 10)} Mins)
                        </Button>
                      </div>
                    )}

                    {quizStarted && (
                      <div className="space-y-6">
                        <div className="space-y-3">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground">Question {currentQuestion + 1} of {activeQuizQuestions.length}</span>
                          <h4 className="text-xs font-semibold text-foreground leading-relaxed">{activeQuizQuestions[currentQuestion]?.q}</h4>
                        </div>

                        <div className="space-y-2">
                          {activeQuizQuestions[currentQuestion]?.options.map((option, idx) => (
                            <button
                              key={idx}
                              onClick={() => setQuizAnswers(prev => ({ ...prev, [currentQuestion]: idx }))}
                              className={`w-full text-left p-3 rounded-lg border text-xs transition-colors flex items-center justify-between ${
                                quizAnswers[currentQuestion] === idx 
                                  ? "bg-primary/5 border-primary text-primary font-medium" 
                                  : "border-border hover:bg-muted/40 text-muted-foreground hover:text-foreground"
                              }`}
                            >
                              <span>{option}</span>
                              {quizAnswers[currentQuestion] === idx && <CheckCircle className="h-4 w-4" />}
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-4 border-t border-border/40">
                          <Button 
                            variant="outline" 
                            className="text-xs h-8.5"
                            disabled={currentQuestion === 0}
                            onClick={() => setCurrentQuestion(prev => prev - 1)}
                          >
                            Previous
                          </Button>

                          {currentQuestion < activeQuizQuestions.length - 1 ? (
                            <Button 
                              variant="outline" 
                              className="text-xs h-8.5"
                              onClick={() => setCurrentQuestion(prev => prev + 1)}
                            >
                              Next
                            </Button>
                          ) : (
                            <Button 
                              variant="primary" 
                              className="text-xs h-8.5"
                              onClick={() => {
                                const correctCount = activeQuizQuestions.filter((q, i) => quizAnswers[i] === q.correct).length
                                void finalizeQuizSubmission(correctCount)
                              }}
                            >
                              Submit Answers
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                  )
                })()}
              </CardContent>
            </Card>
          ) : (
            <Card className="w-full">
              <CardHeader className="border-b border-border/80">
                <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between gap-2">
                  <span className="truncate">{activeQuizMeta.title} — Trainer View</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-purple-500/30 text-purple-500 bg-purple-500/5">
                    LMS ECOSYSTEM
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  Topic: {activeQuizPack ? getQuizPackTopic(activeQuizPack) : "—"} • Review quiz questions and student completion records
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                
                {/* 1. Quiz Questions Accordion Section */}
                <div className="space-y-3">
                  <button 
                    onClick={() => setIsQuizQuestionsExpanded(!isQuizQuestionsExpanded)}
                    className="w-full flex items-center justify-between py-2 border-b border-border/60 hover:text-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <HelpCircle className="h-4 w-4 text-purple-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Quiz Questions ({activeQuizQuestions.length})</span>
                    </div>
                    {isQuizQuestionsExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isQuizQuestionsExpanded && (
                    <div className="space-y-2 pr-1 animate-in fade-in duration-200">
                      {activeQuizQuestions.map((q, idx) => {
                        const isQuestionOpen = expandedQuizQuestion === idx
                        return (
                          <div key={idx} className="rounded-lg border border-border bg-muted/5 overflow-hidden transition-all">
                            <button
                              onClick={() => setExpandedQuizQuestion(isQuestionOpen ? null : idx)}
                              className="w-full p-3 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors text-left"
                            >
                              <span>{idx + 1}. {q.q}</span>
                              {isQuestionOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                            
                            {isQuestionOpen && (
                              <div className="p-3 pt-0 border-t border-border/40 bg-card space-y-3 text-xs">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                  {q.options.map((opt, oIdx) => (
                                    <div 
                                      key={oIdx} 
                                      className={`p-2 rounded border text-[10px] flex items-center justify-between ${
                                        oIdx === q.correct 
                                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 font-bold" 
                                          : "bg-muted/10 border-border text-muted-foreground"
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      {oIdx === q.correct && <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" />}
                                    </div>
                                  ))}
                                </div>
                                {q.explanation && (
                                  <p className="text-[10px] text-muted-foreground leading-relaxed bg-muted/20 p-2 rounded">
                                    <strong>Explanation:</strong> {q.explanation}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Student Quiz Completion Report Accordion Section */}
                <div className="space-y-3 pt-2">
                  <button 
                    onClick={() => setIsQuizReportExpanded(!isQuizReportExpanded)}
                    className="w-full flex items-center justify-between py-2 border-b border-border/60 hover:text-primary transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-emerald-500" />
                      <span className="text-xs font-bold text-foreground uppercase tracking-wider">Student Quiz Completion Report</span>
                    </div>
                    {isQuizReportExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isQuizReportExpanded && (
                    <div className="grid grid-cols-1 gap-2 animate-in fade-in duration-200">
                      {(selectedCourse?.studentNames || []).map((studentName: string) => {
                        const quizSub = getQuizSubmission(
                          courseQuizSubmissions[selectedCourse.id],
                          activeQuizPack?.id || "",
                          studentName
                        ) || { completed: false, score: 0, total: activeQuizQuestions.length }
                        const isStudentOpen = expandedQuizStudent === studentName
                        return (
                          <div key={studentName} className="rounded-lg border border-border bg-card overflow-hidden transition-all">
                            <button
                              onClick={() => setExpandedQuizStudent(isStudentOpen ? null : studentName)}
                              className="w-full p-3 flex items-center justify-between text-xs hover:bg-muted/20 transition-colors text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
                                  {studentName.split(" ").map(n => n[0]).join("")}
                                </div>
                                <div className="text-left">
                                  <p className="font-semibold text-foreground">{studentName}</p>
                                  {quizSub.completed ? (
                                    <p className="text-[10px] text-emerald-500 font-bold">
                                      Score: {quizSub.score} / {quizSub.total} ({((quizSub.score / quizSub.total) * 100).toFixed(0)}%)
                                    </p>
                                  ) : (
                                    <p className="text-[10px] text-muted-foreground">Not Attempted</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant={quizSub.completed ? "success" : "warning"} className="text-[9px]">
                                  {quizSub.completed ? "Completed" : "Pending"}
                                </Badge>
                                {isStudentOpen ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                            </button>

                            {isStudentOpen && (
                              <div className="p-3 pt-0 border-t border-border/40 bg-muted/5 text-[10px] space-y-2">
                                <div className="grid grid-cols-2 gap-2 mt-2 text-muted-foreground">
                                  <div>
                                    <p>Status: <strong className={quizSub.completed ? "text-emerald-500" : "text-amber-500"}>{quizSub.completed ? "Completed" : "Pending Action"}</strong></p>
                                    <p>Grade Weight: <strong>15% of total LMS</strong></p>
                                  </div>
                                  <div>
                                    <p>Submitted: <strong>{quizSub.completed ? "Yes (via browser)" : "No record"}</strong></p>
                                    <p>Time Elapsed: <strong>{quizSub.completed ? "6m 42s" : "N/A"}</strong></p>
                                  </div>
                                </div>
                                <p className="text-[9px] text-muted-foreground pt-1.5 border-t border-border/20">
                                  Evaluated instantly using local logic triggers. Verification code: <code className="bg-muted px-1 py-0.5 rounded text-[8px]">LC-{(studentName.substring(0, 3) + "-" + quizSub.score).toUpperCase()}</code>
                                </p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          )}
            </div>
          )}
        </TabsContent>

        {/* ------------------ LIVE CLASSES MODULE ------------------ */}
        <TabsContent value="live" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Online Virtual Classrooms</h3>
              
              <div className="space-y-3">
                <Card className="p-4 bg-card">
                  <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Live QA session & review</span>
                        <Badge variant="success">Active</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Integrates with Zoom API Client</p>
                      <p className="text-[10px] font-semibold text-primary">Time: Now live • finishes in 1 hour</p>
                    </div>
                    <Button variant="primary" className="h-8.5 text-xs flex items-center gap-1 shrink-0 self-start sm:self-center">
                      <ExternalLink className="h-3.5 w-3.5" /> Join Zoom Meeting
                    </Button>
                  </div>
                </Card>

                <Card className="p-4 bg-card">
                  <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">Express DB indexes schema design</span>
                        <Badge variant="outline">Scheduled</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Integrates with Google Meet Client</p>
                      <p className="text-[10px] font-semibold text-foreground">Time: June 01, 2026 at 10:00 AM</p>
                    </div>
                    <Button variant="outline" className="h-8.5 text-xs flex items-center gap-1 shrink-0 self-start sm:self-center">
                      <Calendar className="h-3.5 w-3.5" /> Set Google Calendar Reminder
                    </Button>
                  </div>
                </Card>
              </div>
            </div>

            {/* Recordings library */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class Recordings Library</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-2 border-b border-border/40 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">MERN Session #1: MongoDB Basics</p>
                      <p className="text-[9px] text-muted-foreground">Recorded: May 12, 2026</p>
                    </div>
                    <Play className="h-3.5 w-3.5 text-primary cursor-pointer" />
                  </div>
                  <div className="p-2 border-b border-border/40 text-xs flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-foreground">MERN Session #2: Node Middleware</p>
                      <p className="text-[9px] text-muted-foreground">Recorded: May 19, 2026</p>
                    </div>
                    <Play className="h-3.5 w-3.5 text-primary cursor-pointer" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------ PROJECT MANAGEMENT MODULE ------------------ */}
        <TabsContent value="projects" className="space-y-6">
          {/* Admin: Post a new project */}
          {(activeRole === "admin" || activeRole === "trainer") && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-orange-500/20 bg-orange-500/5">
              <FolderGit2 className="h-5 w-5 text-orange-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">Post a New Project</p>
                <p className="text-[10px] text-muted-foreground">Assign a real-world capstone or mini project to the batch</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="Project title…" className="h-8 px-3 rounded-lg border border-border bg-card text-xs w-44 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                <input type="date" className="h-8 px-3 rounded-lg border border-border bg-card text-xs focus:outline-none focus:ring-1 focus:ring-orange-500" />
                <Button variant="primary" className="h-8 text-xs px-3 gap-1.5 bg-orange-500 hover:bg-orange-600 border-0">
                  <Plus className="h-3.5 w-3.5" /> Post
                </Button>
                <Button
                  className="h-8 text-xs px-3.5 gap-1.5 bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0 font-bold"
                  onClick={() => openAiGenerator("projects")}
                >
                  <Sparkles className="h-3.5 w-3.5 fill-white" /> Generate with AI
                </Button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-bold text-foreground">Course Capstone Projects</h3>

              <div className="space-y-3">
                <Card className="p-4 bg-card">
                  <div className="flex flex-col sm:flex-row justify-between gap-3 text-xs">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-bold text-foreground">Project milestone: MERN CRM Full System Dashboard</h4>
                      <p className="text-[10px] text-muted-foreground">
                        Integrate React Query, Context API, NextJS Server Actions, and database transaction APIs.
                      </p>
                      
                      <div className="space-y-1 pt-2">
                        <div className="flex justify-between text-[9px] text-muted-foreground font-semibold">
                          <span>Milestone Tracking (2 of 4 reached)</span>
                          <span>50% Completed</span>
                        </div>
                        <div className="w-full bg-muted h-1 rounded-full overflow-hidden">
                          <div className="bg-primary h-full" style={{ width: "50%" }} />
                        </div>
                      </div>

                      <div className="pt-3 flex items-center gap-2">
                        <input 
                          type="text" 
                          placeholder="GitHub Repo URL (e.g. https://github.com/...)"
                          className="flex-1 h-7.5 px-2 rounded border border-border bg-card text-[10px] focus:outline-hidden"
                          id="git-repo-input"
                        />
                        <Button 
                          className="h-7.5 text-[9px] px-3.5"
                          onClick={() => {
                            alert("GitHub Repository link submitted successfully!")
                          }}
                        >
                          Submit Repository
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Mentor feedback */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Mentor Review Output</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-1">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400">Milestone #1: Database Schema Validation</p>
                    <p className="text-[10px] text-muted-foreground">Feedback: schema models look clean and utilize proper unique constraint indexes. Approved.</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-1">
                    <p className="font-semibold text-amber-600 dark:text-amber-400">Milestone #2: Server-side REST API</p>
                    <p className="text-[10px] text-muted-foreground">Feedback: add CORS validation and error intercept controllers to prevent server shutdowns. Pending.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ------------------ AI TUTOR MODULE ------------------ */}
        <TabsContent value="ai" className="space-y-6">
          {/* Admin: Post an AI Tutor resource or prompt */}
          {activeRole === "admin" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5">
              <Bot className="h-5 w-5 text-cyan-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-foreground">Post an AI Tutor Resource</p>
                <p className="text-[10px] text-muted-foreground">Share a prompt, guide, or resource to assist students via AI</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <input type="text" placeholder="Resource title or topic…" className="h-8 px-3 rounded-lg border border-border bg-card text-xs w-52 focus:outline-none focus:ring-1 focus:ring-cyan-500" />
                <Button variant="primary" className="h-8 text-xs px-3 gap-1.5 bg-cyan-500 hover:bg-cyan-600 border-0">
                  <Plus className="h-3.5 w-3.5" /> Post
                </Button>
              </div>
            </div>
          )}
          <Card className="max-w-3xl mx-auto overflow-hidden">
            <CardHeader className="border-b border-border/80 flex flex-row justify-between items-center bg-card">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <Brain className="h-4.5 w-4.5 text-primary" /> AI doubt solver & Tutor
                </CardTitle>
                <CardDescription className="text-xs">Ask questions, request code reviews, or generate instant quizzes.</CardDescription>
              </div>
              <Sparkles className="h-4.5 w-4.5 text-primary fill-primary animate-pulse" />
            </CardHeader>
            <div className="h-[300px] overflow-y-auto p-4 space-y-4 bg-muted/10 text-xs">
              {aiChat.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`p-3 rounded-lg max-w-[80%] leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-none" 
                      : "bg-card border border-border text-foreground rounded-tl-none"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="p-3 rounded-lg bg-card border border-border text-muted-foreground animate-pulse">
                    AI Agent is analyzing your query...
                  </div>
                </div>
              )}
            </div>
            <CardFooter className="p-3 border-t border-border/80 flex items-center gap-2 bg-card">
              <input
                type="text"
                placeholder="Ask your doubt, code review request, or say 'generate quiz'..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendAiMessage()}
                className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-xs focus:outline-hidden focus:ring-1 focus:ring-primary"
              />
              <Button className="h-9 px-4 cursor-pointer" onClick={handleSendAiMessage}>
                <Send className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ------------------ CERTIFICATE MODULE ------------------ */}
        <TabsContent value="certificates" className="space-y-6">
          {/* Admin: Generate certificates for all students */}
          {activeRole === "admin" && (
            <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 space-y-3">
              <div className="flex items-center gap-3">
                <Award className="h-5 w-5 text-yellow-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-foreground">Generate Certificates for All Students</p>
                  <p className="text-[10px] text-muted-foreground">
                    Batch: <strong>{selectedCourse.code}</strong> · {selectedCourse.studentNames.length} enrolled students
                  </p>
                </div>
                <Button variant="primary" className="h-8 text-xs px-4 gap-1.5 bg-yellow-500 hover:bg-yellow-600 text-black border-0 font-bold">
                  <Award className="h-3.5 w-3.5" /> Generate All
                </Button>
              </div>
              <div className="grid gap-2">
                {(selectedCourse?.studentNames || []).map((name: string) => (
                  <div key={name} className="flex items-center justify-between px-3 py-2 rounded-lg border border-border/40 bg-card text-xs">
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      {name}
                    </span>
                    <Button variant="outline" className="h-6 text-[10px] px-2.5 gap-1">
                      <Download className="h-3 w-3" /> Generate
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Card className="max-w-2xl mx-auto overflow-hidden">
            <CardHeader className="border-b border-border/80 text-center">
              <Award className="h-10 w-10 text-amber-500 mx-auto" />
              <CardTitle className="text-base font-bold text-foreground mt-2">Verified Course Certificates</CardTitle>
              <CardDescription className="text-xs">Generated dynamically upon matching all course eligibility rules.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Certificate Template Preview */}
              <div className="border-8 border-double border-amber-500/30 p-6 rounded-lg bg-card text-center space-y-4">
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase block">Certificate of Completion</span>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-serif italic text-foreground">
                    {activeStudentName || "Student Name"}
                  </h3>
                  <p className="text-xs text-muted-foreground px-6 leading-relaxed">
                    has successfully fulfilled all required curriculum, assignments, and coding evaluations for
                  </p>
                  <p className="font-bold text-sm text-foreground">{selectedCourse.title || "Course Title"}</p>
                </div>

                <div className="flex justify-between items-end pt-4 text-left border-t border-border/50 text-[10px]">
                  <div>
                    <p className="text-muted-foreground">Certified Date: <strong>May 27, 2026</strong></p>
                    <p className="text-muted-foreground">Verification Hash: <span className="font-mono text-[9px]">c7f4-8a12-901d</span></p>
                  </div>
                  {/* Mock QR verification */}
                  <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center rounded">
                    <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-80">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`rounded-xs ${i % 3 === 0 || i % 7 === 0 ? "bg-white" : "bg-transparent"}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="outline" className="text-xs h-9 flex items-center gap-1.5 cursor-pointer">
                  <Download className="h-4 w-4" /> Download PDF Certificate
                </Button>
                <Button className="text-xs h-9 flex items-center gap-1.5 cursor-pointer" onClick={() => alert("Verification code generated! Copy link: http://localhost:3000/verify/c7f4")}>
                  <ExternalLink className="h-4 w-4" /> Copy Verification Link
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog
        isOpen={aiGenModal.isOpen}
        onClose={() => {
          setAiGenModal({ isOpen: false, type: null })
          setAiGeneratedPreview(null)
        }}
        title={`Generate ${aiGenModal.type ? aiGenModal.type.replace(/([A-Z])/g, " $1") : "Content"} with AI`}
        description="Choose the course, topic, difficulty, and item count. Generated content stays editable before publishing."
        className="max-w-4xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-[300px_minmax(0,1fr)] gap-5">
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">AI Provider</label>
              <select
                value={aiGenProvider}
                onChange={(e) => setAiGenProvider(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs"
              >
                <option>OpenAI</option>
                <option>OpenRouter</option>
                <option>Claude</option>
                <option>Gemini</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Course</label>
              <select
                value={aiGenCourseId}
                onChange={(e) => setAiGenCourseId(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs"
              >
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title} - {course.code}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Topic / Prompt</label>
              <textarea
                value={aiGenTopic}
                onChange={(e) => setAiGenTopic(e.target.value)}
                placeholder="Example: TCS aptitude round questions, Python array problems for beginners, UI/UX color theory quiz"
                className="min-h-24 w-full rounded-lg border border-border bg-card p-3 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Difficulty</label>
                <select
                  value={aiGenDifficulty}
                  onChange={(e) => setAiGenDifficulty(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs"
                >
                  <option>Beginner</option>
                  <option>Easy</option>
                  <option>Medium</option>
                  <option>Hard</option>
                  <option>Advanced</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Items</label>
                <input
                  type="number"
                  min={1}
                  max={25}
                  value={aiGenNumItems}
                  onChange={(e) => setAiGenNumItems(Number(e.target.value))}
                  className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs"
                />
              </div>
            </div>
            <Button className="w-full h-9 text-xs gap-1.5" isLoading={isAiGenerating} onClick={() => void generateAiContent()}>
              <Sparkles className="h-3.5 w-3.5" /> Generate Draft
            </Button>
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-[10px] text-muted-foreground space-y-1">
              <p className="font-bold text-foreground">Workflow</p>
              <p>1. AI creates the draft using {aiGenProvider}.</p>
              <p>2. Trainer edits the generated JSON preview.</p>
              <p>3. Publish inserts it into the live LMS module.</p>
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Editable Generated Content</p>
                <p className="text-[10px] text-muted-foreground">Modify the draft before publishing to students.</p>
              </div>
              {aiGeneratedPreview && <Badge variant="success" className="text-[9px]">Ready to publish</Badge>}
            </div>
            <textarea
              value={aiGeneratedPreview ? JSON.stringify(aiGeneratedPreview, null, 2) : ""}
              onChange={(e) => {
                try {
                  setAiGeneratedPreview(JSON.parse(e.target.value))
                } catch {
                  setAiGeneratedPreview(e.target.value)
                }
              }}
              placeholder="Generated questions, answers, coding problems, and rubrics will appear here."
              className="min-h-[360px] w-full rounded-lg border border-border bg-zinc-950 p-4 font-mono text-[11px] leading-relaxed text-zinc-100"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="outline" className="h-8 text-xs" onClick={() => setAiGeneratedPreview(null)}>
                <RefreshCw className="h-3.5 w-3.5" /> Clear
              </Button>
              <Button
                className="h-8 text-xs gap-1.5"
                disabled={!aiGeneratedPreview || typeof aiGeneratedPreview === "string"}
                onClick={() => void publishAiGeneratedContent()}
              >
                <ClipboardCheck className="h-3.5 w-3.5" /> Publish to LMS
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isQuizCreatorOpen}
        onClose={() => {
          setIsQuizCreatorOpen(false)
        }}
        title={`Post Quiz Test ${batchQuizPacks.length + 1} — ${selectedCourse.title}`}
        description="Each quiz must use a unique topic with different questions from prior tests."
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Quiz Topic *</label>
            <input
              type="text"
              list="quiz-topic-suggestions"
              placeholder="e.g. REST APIs & HTTP"
              value={quizCreatorTopic}
              onChange={(e) => {
                const nextTopic = e.target.value
                setQuizCreatorTopic(nextTopic)
                if (!quizCreatorTitle.trim() || quizCreatorTitle.endsWith(" Quiz")) {
                  setQuizCreatorTitle(nextTopic.trim() ? `${nextTopic.trim()} Quiz` : "")
                }
              }}
              className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <datalist id="quiz-topic-suggestions">
              {QUIZ_TOPIC_SUGGESTIONS.map((topic) => (
                <option key={topic} value={topic} />
              ))}
            </datalist>
            <p className="text-[10px] text-muted-foreground">
              Use a different topic for each quiz test. Already used:{" "}
              {batchQuizPacks.length
                ? batchQuizPacks.map((pack) => getQuizPackTopic(pack)).join(", ")
                : "none yet"}
            </p>
          </div>

          {/* AI Auto fill block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-500 fill-purple-500/30" />
                AI Assistant Quiz Creator
              </p>
              <p className="text-[10px] text-muted-foreground">Generates 10 unique questions for the topic above.</p>
            </div>
            <Button
              className="h-8 text-xs bg-purple-500 hover:bg-purple-600 border-0 shrink-0 font-bold"
              isLoading={isAiFilling}
              onClick={() => void generateQuizWithGemini({ topic: quizCreatorTopic, count: 10, applyToCreator: true })}
            >
              <Sparkles className="h-3.5 w-3.5 fill-white" /> Auto-Fill 10 Questions (Gemini)
            </Button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Quiz Title</label>
            <input
              type="text"
              placeholder="e.g. REST APIs & HTTP Quiz"
              value={quizCreatorTitle}
              onChange={(e) => setQuizCreatorTitle(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Scrollable Questions list */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {quizCreatorQuestions.map((question, qIdx) => (
              <div key={qIdx} className="p-4 rounded-xl border border-border bg-muted/10 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => {
                    setQuizCreatorQuestions(prev => prev.filter((_, idx) => idx !== qIdx))
                  }}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>

                <p className="text-[10px] font-bold text-muted-foreground uppercase">Question {qIdx + 1}</p>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground">Question Text</label>
                  <input
                    type="text"
                    value={question.q}
                    onChange={(e) => {
                      const text = e.target.value
                      setQuizCreatorQuestions(prev => prev.map((item, idx) => idx === qIdx ? { ...item, q: text } : item))
                    }}
                    className="h-8.5 w-full rounded-lg border border-border bg-card px-3 text-xs"
                    placeholder="Enter question statement..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {question.options.map((opt, oIdx) => (
                    <div key={oIdx} className="space-y-1">
                      <label className="text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Option {String.fromCharCode(65 + oIdx)}</span>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="radio"
                            name={`correct-option-${qIdx}`}
                            checked={question.correct === oIdx}
                            onChange={() => {
                              setQuizCreatorQuestions(prev => prev.map((item, idx) => idx === qIdx ? { ...item, correct: oIdx } : item))
                            }}
                            className="h-3 w-3 accent-emerald-500"
                          />
                          <span className="text-[8px] uppercase font-bold text-emerald-500">Correct</span>
                        </label>
                      </label>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const val = e.target.value
                          setQuizCreatorQuestions(prev => prev.map((item, idx) => idx === qIdx ? {
                            ...item,
                            options: item.options.map((o, oi) => oi === oIdx ? val : o)
                          } : item))
                        }}
                        className="h-8 w-full rounded-lg border border-border bg-card px-3 text-xs"
                        placeholder={`Enter Option ${String.fromCharCode(65 + oIdx)}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-muted-foreground">Explanation (Optional)</label>
                  <input
                    type="text"
                    value={question.explanation || ""}
                    onChange={(e) => {
                      const text = e.target.value
                      setQuizCreatorQuestions(prev => prev.map((item, idx) => idx === qIdx ? { ...item, explanation: text } : item))
                    }}
                    className="h-8 w-full rounded-lg border border-border bg-card px-3 text-xs"
                    placeholder="Provide explanation of correct answer..."
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center pt-2">
            <Button
              variant="outline"
              className="h-8.5 text-xs font-bold border-dashed border-primary text-primary hover:bg-primary/5"
              onClick={() => {
                setQuizCreatorQuestions(prev => [
                  ...prev,
                  { q: "", options: ["", "", "", ""], correct: 0 }
                ])
              }}
            >
              <Plus className="h-3.5 w-3.5" /> Add Another Question
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-8.5 text-xs"
                onClick={() => setIsQuizCreatorOpen(false)}
              >
                Cancel
              </Button>
              <Button
                className="h-8.5 text-xs bg-purple-500 hover:bg-purple-600 border-0 font-bold"
                onClick={async () => {
                  if (!validateQuizTopic(quizCreatorTopic)) return
                  if (!quizCreatorTitle.trim()) {
                    alert("Enter a quiz title.")
                    return
                  }
                  const validQuestions = quizCreatorQuestions.filter(q => q.q.trim() !== "")
                  if (validQuestions.length === 0) {
                    alert("Add at least one question.")
                    return
                  }
                  const newPack = createQuizPack({
                    title: quizCreatorTitle,
                    topic: quizCreatorTopic.trim(),
                    questions: validQuestions,
                    timerMinutes: Math.max(validQuestions.length * 3, 10),
                    negativeMarking: "1 mark penalty for wrong answers",
                  })
                  setIsQuizCreatorOpen(false)
                  await publishQuizPack(newPack, selectedCourse.id)
                }}
              >
                Publish Quiz
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <Dialog
        isOpen={isAssignmentCreatorOpen}
        onClose={() => {
          setIsAssignmentCreatorOpen(false)
        }}
        title={`Post a New Assignment — ${selectedCourse.title}`}
        description="Fill in the details manually or use AI to generate assignment tasks, evaluation rubrics, and difficulty."
        className="max-w-2xl"
      >
        <div className="space-y-4">
          
          {/* AI Helper banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500/30" />
                AI Assistant Assignment Writer
              </p>
              <p className="text-[10px] text-muted-foreground">Type a title and click generate to auto-fill description & criteria.</p>
            </div>
            <Button
              className="h-8 text-xs bg-amber-500 hover:bg-amber-600 border-0 shrink-0 font-bold"
              isLoading={isAssignmentAiFilling}
              disabled={!assignmentTitle.trim() || isAssignmentAiFilling}
              onClick={() => void generateAssignmentWithGemini()}
            >
              <Sparkles className="h-3.5 w-3.5 fill-white" /> Generate with AI
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Assignment Title</label>
              <input
                type="text"
                placeholder="e.g. Build Express Server Routing"
                value={assignmentTitle}
                onChange={(e) => setAssignmentTitle(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Deadline Date</label>
              <input
                type="date"
                value={assignmentDeadline}
                onChange={(e) => setAssignmentDeadline(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-card px-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Difficulty Level</label>
              <div className="flex gap-2">
                {["Easy", "Medium", "Hard"].map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setAssignmentDifficulty(lvl)}
                    className={`flex-1 h-8 rounded-lg text-xs font-semibold border transition-all ${
                      assignmentDifficulty === lvl
                        ? lvl === "Easy"
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                          : lvl === "Medium"
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                          : "bg-red-500/10 border-red-500/30 text-red-500"
                        : "bg-card border-border text-muted-foreground hover:bg-muted/10"
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Tasks / Instructions Description</label>
            <textarea
              placeholder="Detail the instructions or coding problems students must solve..."
              value={assignmentTasks}
              onChange={(e) => setAssignmentTasks(e.target.value)}
              className="h-28 w-full rounded-lg border border-border bg-card p-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Evaluation Criteria / Rubrics</label>
            <textarea
              placeholder="What criteria must be met to get an A grade?"
              value={assignmentCriteria}
              onChange={(e) => setAssignmentCriteria(e.target.value)}
              className="h-20 w-full rounded-lg border border-border bg-card p-3 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 leading-relaxed resize-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              className="h-8.5 text-xs"
              onClick={() => setIsAssignmentCreatorOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="h-8.5 text-xs bg-amber-500 hover:bg-amber-600 border-0 font-bold"
              isLoading={isPostingAssignment}
              disabled={isPostingAssignment || !assignmentTitle.trim()}
              onClick={() => void handlePostAssignment()}
            >
              Post Assignment
            </Button>
          </div>

        </div>
      </Dialog>
    </div>
  )
}
