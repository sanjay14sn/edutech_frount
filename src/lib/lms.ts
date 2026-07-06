import type { CourseLMS } from "@/store/useStore"

export const DEFAULT_LMS_FEATURES: CourseLMS["features"] = {
  videos: true,
  assignments: true,
  quizzes: true,
  codingTests: false,
  projects: true,
  aiTutor: true,
}

export function buildDefaultStudentAccess(studentNames: string[] = []) {
  return studentNames.reduce<Record<string, boolean>>((acc, name) => {
    acc[name] = true
    return acc
  }, {})
}

export function syncStudentLmsAccess(
  studentNames: string[] = [],
  existing: Record<string, boolean> = {}
) {
  const normalizedExisting = Object.entries(existing).reduce<Record<string, boolean>>(
    (acc, [name, enabled]) => {
      acc[name] = enabled
      return acc
    },
    {}
  )

  studentNames.forEach((name) => {
    const matchKey = Object.keys(normalizedExisting).find(
      (key) => key.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (matchKey === undefined) {
      normalizedExisting[name] = true
    }
  })

  Object.keys(normalizedExisting).forEach((name) => {
    const stillEnrolled = studentNames.some(
      (studentName) => studentName.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (!stillEnrolled) {
      delete normalizedExisting[name]
    }
  })

  return normalizedExisting
}

export function buildSubmissionMap(studentNames: string[] = []) {
  return studentNames.reduce<
    Record<string, { status: string; grade: string; feedback: string }>
  >((acc, name) => {
    acc[name] = { status: "pending", grade: "", feedback: "" }
    return acc
  }, {})
}

function normalizeAssignmentForStudents(assignment: any, studentNames: string[] = []) {
  const submissions = {
    ...buildSubmissionMap(studentNames),
    ...(assignment?.submissions || {}),
  }

  studentNames.forEach((name) => {
    const existingKey = Object.keys(submissions).find(
      (key) => key.trim().toLowerCase() === name.trim().toLowerCase()
    )
    if (!existingKey) {
      submissions[name] = { status: "pending", grade: "", feedback: "" }
    }
  })

  return { ...assignment, submissions }
}

export function mapBatchToCourseLMS(batch: any, tenantId?: string): CourseLMS {
  const studentNames = batch.studentNames || []
  const studentLmsAccess = syncStudentLmsAccess(studentNames, batch.studentLmsAccess || {})
  const { placementPrep: _removed, ...batchFeatures } = batch.features || {}

  return {
    id: batch.id || batch._id,
    tenantId: batch.tenantId || tenantId,
    title: batch.courseName,
    code: batch.code,
    batch: batch.code,
    trainer: batch.trainerName,
    schedule: batch.schedule,
    enrolled: studentNames.length,
    capacity: batch.capacity || 30,
    meetLink: batch.meetLink,
    platform: batch.platform,
    centerName: batch.centerName,
    studentNames,
    mode: batch.mode || "online",
    roomName: batch.roomName,
    features: { ...DEFAULT_LMS_FEATURES, ...batchFeatures, codingTests: false },
    lmsPortalAccess: batch.lmsPortalAccess !== false,
    studentLmsAccess,
    lmsContent: batch.lmsContent || {},
  }
}

export function courseToBatchPayload(course: CourseLMS, lmsContent?: CourseLMS["lmsContent"]) {
  return {
    courseName: course.title,
    trainerName: course.trainer,
    schedule: course.schedule,
    enrolled: course.enrolled,
    capacity: course.capacity,
    meetLink: course.meetLink,
    platform: course.platform,
    centerName: course.centerName,
    studentNames: course.studentNames,
    mode: course.mode,
    roomName: course.roomName,
    features: course.features,
    lmsPortalAccess: course.lmsPortalAccess,
    studentLmsAccess: course.studentLmsAccess,
    ...(lmsContent !== undefined ? { lmsContent } : {}),
  }
}

export function studentNameInBatch(batch: { studentNames?: string[] }, studentName: string) {
  const normalized = studentName.trim().toLowerCase()
  return (batch.studentNames || []).some((name) => name.trim().toLowerCase() === normalized)
}

export function resolveStudentKey(
  map: Record<string, unknown> = {},
  studentName: string
) {
  const normalized = studentName.trim().toLowerCase()
  return (
    Object.keys(map).find((name) => name.trim().toLowerCase() === normalized) ||
    studentName
  )
}

export function getStudentLmsAccessValue(
  accessMap: Record<string, boolean> = {},
  studentName: string
) {
  const key = resolveStudentKey(accessMap, studentName)
  if (!(key in accessMap)) return true
  return accessMap[key] !== false
}

export function canStudentAccessCourse(course: CourseLMS, studentName: string) {
  if (!course.lmsPortalAccess) return false
  if (!studentNameInBatch(course, studentName)) return false
  return getStudentLmsAccessValue(course.studentLmsAccess || {}, studentName)
}

export function countActiveEnrolledStudents(course: CourseLMS) {
  return (course.studentNames || []).filter((name) =>
    getStudentLmsAccessValue(course.studentLmsAccess || {}, name)
  ).length
}

export function computeLmsDashboardStats(
  courses: CourseLMS[],
  moduleState: {
    courseAssignments: Record<string, any[]>
    courseQuizSubmissions: Record<
      string,
      Record<string, Record<string, { completed: boolean; score: number; total: number }>>
    >
  }
) {
  let assignmentSlots = 0
  let submittedAssignments = 0
  let quizAttempts = 0
  let quizPasses = 0

  courses.forEach((course) => {
    const students = course.studentNames || []
    const assignments = moduleState.courseAssignments[course.id] || []
    assignments.forEach((assignment) => {
      students.forEach((name) => {
        assignmentSlots++
        const submissionKey = resolveStudentKey(assignment.submissions || {}, name)
        const submission = assignment.submissions?.[submissionKey]
        if (submission?.status === "submitted" || submission?.status === "graded") {
          submittedAssignments++
        }
      })
    })

    const quizSubs = moduleState.courseQuizSubmissions[course.id] || {}
    Object.values(quizSubs).forEach((studentSubs) => {
      students.forEach((name) => {
        const key = resolveStudentKey(studentSubs || {}, name)
        const attempt = studentSubs?.[key]
        if (attempt?.completed) {
          quizAttempts++
          if (attempt.total > 0 && attempt.score / attempt.total >= 0.6) {
            quizPasses++
          }
        }
      })
    })
  })

  const assignmentCompletionPct = assignmentSlots
    ? Math.round((submittedAssignments / assignmentSlots) * 1000) / 10
    : 0
  const quizPassPct = quizAttempts
    ? Math.round((quizPasses / quizAttempts) * 1000) / 10
    : 0

  return {
    assignmentCompletionPct,
    quizPassPct,
    submittedAssignments,
    assignmentSlots,
  }
}

export function hydrateLmsModuleState(courses: CourseLMS[]) {
  const videosList: Record<string, NonNullable<NonNullable<CourseLMS["lmsContent"]>["videos"]>> = {}
  const courseAssignments: Record<string, any[]> = {}
  const courseQuizPacks: Record<string, LmsQuizPack[]> = {}
  const courseQuizSubmissions: Record<
    string,
    Record<string, Record<string, { completed: boolean; score: number; total: number }>>
  > = {}
  const courseCodingChallenges: Record<string, any[]> = {}
  const courseProjects: Record<string, any[]> = {}
  const courseNotes: Record<string, LmsCourseNote[]> = {}

  courses.forEach((course) => {
    const content = course.lmsContent || {}
    const studentNames = course.studentNames || []
    videosList[course.id] = content.videos ?? []
    courseNotes[course.id] = (content.notes ?? []).map((note: LmsCourseNote) => ({
      ...note,
      url: resolveMediaUrl(note.url || ""),
    }))
    const packs = normalizeQuizPacks(content, course.title)
    courseQuizPacks[course.id] = packs
    courseQuizSubmissions[course.id] = normalizeQuizSubmissions(content.quizSubmissions, packs)
    courseAssignments[course.id] = (content.assignments ?? []).map((assignment: any) =>
      normalizeAssignmentForStudents(assignment, studentNames)
    )
    courseCodingChallenges[course.id] = content.codingTests ?? []
    courseProjects[course.id] = content.projects ?? []
  })

  return {
    videosList,
    courseAssignments,
    courseQuizPacks,
    courseQuizSubmissions,
    courseCodingChallenges,
    courseProjects,
    courseNotes,
  }
}

export function buildLmsContentFromState(
  courseId: string,
  state: {
    videosList: Record<string, any[]>
    courseAssignments: Record<string, any[]>
    courseQuizPacks: Record<string, LmsQuizPack[]>
    courseQuizSubmissions: Record<
      string,
      Record<string, Record<string, { completed: boolean; score: number; total: number }>>
    >
    courseCodingChallenges: Record<string, any[]>
    courseProjects: Record<string, any[]>
    courseNotes: Record<string, LmsCourseNote[]>
  }
): CourseLMS["lmsContent"] {
  const packs = state.courseQuizPacks[courseId] || []
  const primaryPack = packs[0]

  return {
    videos: state.videosList[courseId] || [],
    assignments: state.courseAssignments[courseId] || [],
    quizzes: packs,
    quizSubmissions: state.courseQuizSubmissions[courseId] || {},
    codingTests: state.courseCodingChallenges[courseId] || [],
    projects: state.courseProjects[courseId] || [],
    notes: state.courseNotes[courseId] || [],
    quizMeta: primaryPack
      ? {
          title: primaryPack.title,
          timerMinutes: primaryPack.timerMinutes,
          negativeMarking: primaryPack.negativeMarking,
        }
      : { title: "Course Quiz" },
  }
}

export function mergeCourseUpdate(courses: CourseLMS[], updated: CourseLMS) {
  return courses.map((course) => (course.id === updated.id ? updated : course))
}

export type LmsVideoResource = { name: string; url: string }

export type LmsCourseNote = {
  id: string
  title: string
  fileName: string
  url: string
  uploadedAt: string
}

export type LmsQuizQuestion = {
  q: string
  options: string[]
  correct: number
  explanation?: string
  difficulty?: string
}

export type LmsQuizPack = {
  id: string
  title: string
  topic?: string
  timerMinutes?: number
  negativeMarking?: string
  difficulty?: string
  questions: LmsQuizQuestion[]
  createdAt?: string
}

export const QUIZ_TOPIC_SUGGESTIONS = [
  "JavaScript & DOM",
  "React Frontend",
  "Node.js & Express",
  "REST APIs & HTTP",
  "SQL & Relational Databases",
  "NoSQL & MongoDB",
  "Authentication & Security",
  "Git & Version Control",
  "Deployment & DevOps",
  "System Design Basics",
  "HTML & CSS Fundamentals",
  "Async JavaScript & Promises",
  "Testing & Debugging",
  "API Integration",
  "Cloud & Containers",
]

export function getQuizPackTopic(pack: Pick<LmsQuizPack, "topic" | "title">) {
  return (pack.topic || pack.title).trim()
}

export function normalizeQuizTopic(topic: string) {
  return topic.trim().toLowerCase()
}

export function isDuplicateQuizTopic(
  topic: string,
  existingPacks: Pick<LmsQuizPack, "topic" | "title">[]
) {
  const normalized = normalizeQuizTopic(topic)
  if (!normalized) return false
  return existingPacks.some((pack) => normalizeQuizTopic(getQuizPackTopic(pack)) === normalized)
}

export function suggestNextQuizTopic(existingPacks: Pick<LmsQuizPack, "topic" | "title">[]) {
  const used = new Set(existingPacks.map((pack) => normalizeQuizTopic(getQuizPackTopic(pack))))
  return QUIZ_TOPIC_SUGGESTIONS.find((topic) => !used.has(normalizeQuizTopic(topic))) || ""
}

export function collectQuizGenerationContext(packs: LmsQuizPack[]) {
  return {
    existingTopics: packs.map((pack) => getQuizPackTopic(pack)).filter(Boolean),
    excludeQuestions: packs.flatMap((pack) => pack.questions.map((question) => question.q)).filter(Boolean),
  }
}

export type LmsQuizSubmission = {
  completed: boolean
  score: number
  total: number
}

export function normalizeQuizPacks(
  content: CourseLMS["lmsContent"] | undefined,
  courseTitle: string
): LmsQuizPack[] {
  const raw = content?.quizzes ?? []
  if (!raw.length) return []

  const first = raw[0] as any
  if (first?.questions && Array.isArray(first.questions)) {
    return raw as LmsQuizPack[]
  }

  if (first?.q) {
    const meta = content?.quizMeta || { title: `${courseTitle} Knowledge Check` }
    return [
      {
        id: "quiz-legacy",
        title: meta.title || `${courseTitle} Knowledge Check`,
        timerMinutes: meta.timerMinutes,
        negativeMarking: meta.negativeMarking,
        questions: raw as unknown as LmsQuizQuestion[],
        createdAt: new Date().toISOString(),
      },
    ]
  }

  return []
}

export function normalizeQuizSubmissions(
  raw: Record<string, any> | undefined,
  packs: LmsQuizPack[]
): Record<string, Record<string, LmsQuizSubmission>> {
  if (!raw || !Object.keys(raw).length) return {}

  const firstKey = Object.keys(raw)[0]
  const firstValue = raw[firstKey]

  if (
    firstValue &&
    typeof firstValue === "object" &&
    !("completed" in firstValue) &&
    !("score" in firstValue)
  ) {
    return raw as Record<string, Record<string, LmsQuizSubmission>>
  }

  const legacyQuizId = packs[0]?.id || "quiz-legacy"
  return { [legacyQuizId]: raw as Record<string, LmsQuizSubmission> }
}

export function getQuizSubmission(
  courseSubs: Record<string, Record<string, LmsQuizSubmission>> | undefined,
  quizId: string,
  studentName: string
) {
  const quizSubs = courseSubs?.[quizId] || {}
  const key = resolveStudentKey(quizSubs, studentName)
  return quizSubs[key]
}

export function createQuizPack(input: {
  title: string
  topic: string
  questions: LmsQuizQuestion[]
  timerMinutes?: number
  negativeMarking?: string
  difficulty?: string
}): LmsQuizPack {
  const topic = input.topic.trim()
  return {
    id: `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    topic,
    timerMinutes: input.timerMinutes ?? Math.max(input.questions.length * 3, 10),
    negativeMarking: input.negativeMarking || "1 mark penalty for wrong answers",
    difficulty: input.difficulty,
    questions: input.questions,
    createdAt: new Date().toISOString(),
  }
}

export type LmsVideoItem = {
  id: string
  title: string
  description?: string
  duration: string
  src: string
  isCompleted: boolean
  resources?: Array<LmsVideoResource | string>
  createdAt?: string
}

export const API_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || "https://erpapi.erphubtechnologies.in/api").replace(/\/api\/?$/, "")

export function resolveMediaUrl(url: string) {
  if (!url) return ""
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith("/api/")) return `${API_ORIGIN}${url}`
  return url
}

export function getYoutubeVideoId(url: string) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#/]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

export function getYoutubeEmbedUrl(url: string) {
  const videoId = getYoutubeVideoId(url)
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null
}

export function isVideoDurationMissing(duration?: string) {
  const value = (duration || "").trim()
  return !value || value === "—" || value === "-"
}

export function formatVideoDurationSeconds(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "—"
  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  if (minutes > 0) {
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes} mins`
  }
  return `${secs}s`
}

export function isCloudinaryUrl(url: string) {
  return /res\.cloudinary\.com/i.test(url)
}

export function getVideoSourceLabel(src: string) {
  if (getYoutubeVideoId(src)) return "YouTube"
  if (/vimeo\.com/i.test(src)) return "Vimeo"
  if (src.startsWith("/api/uploads/") || isCloudinaryUrl(src)) return "Uploaded file"
  if (/^https?:\/\//i.test(src)) return "External link"
  return "Video"
}

export function probeLocalVideoFileDuration(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(formatVideoDurationSeconds(video.duration))
    }
    video.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
    video.src = objectUrl
  })
}

export function probeRemoteVideoDuration(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => {
      resolve(formatVideoDurationSeconds(video.duration))
    }
    video.onerror = () => resolve(null)
    video.src = resolveMediaUrl(src)
  })
}

export type VideoMetadataSnapshot = {
  duration: string
  title?: string
  description?: string
  thumbnailUrl?: string
  source?: string
}

export async function resolveVideoDetailsFromSrc(
  src: string,
  fetchMetadata: (url: string) => Promise<Partial<VideoMetadataSnapshot>>
): Promise<VideoMetadataSnapshot> {
  const trimmed = src.trim()
  const mediaSrc = resolveMediaUrl(trimmed)
  let duration = "—"
  let title = ""
  let description = ""
  let thumbnailUrl = ""
  let source = ""

  const youtubeId = getYoutubeVideoId(trimmed) || getYoutubeVideoId(mediaSrc)
  const isUploadedFile =
    /\/api\/uploads\//i.test(trimmed) ||
    /\/api\/uploads\//i.test(mediaSrc) ||
    isCloudinaryUrl(trimmed) ||
    isCloudinaryUrl(mediaSrc)
  const shouldFetchRemoteMetadata =
    !!youtubeId || (!isUploadedFile && /^https?:\/\//i.test(trimmed || mediaSrc))

  if (shouldFetchRemoteMetadata) {
    try {
      const metadata = await fetchMetadata(trimmed || mediaSrc)
      if (!isVideoDurationMissing(metadata.duration)) {
        duration = String(metadata.duration)
      }
      title = String(metadata.title || "").trim()
      description = String(metadata.description || "").trim()
      thumbnailUrl = String(metadata.thumbnailUrl || "").trim()
      source = String(metadata.source || "").trim()
    } catch {
      // Fall through to local probing.
    }
  }

  if (isVideoDurationMissing(duration)) {
    const probed = await probeRemoteVideoDuration(trimmed)
    if (probed) duration = probed
  }

  if (isVideoDurationMissing(duration)) duration = "Unknown"

  return { duration, title, description, thumbnailUrl, source }
}

export function normalizeVideoResources(resources: LmsVideoItem["resources"] = []) {
  return resources.map((resource) => {
    if (typeof resource === "string") {
      return { name: resource, url: resource }
    }
    return { name: resource.name, url: resolveMediaUrl(resource.url) }
  })
}

export function createVideoItem(input: {
  title: string
  src: string
  description?: string
  duration?: string
  resources?: LmsVideoResource[]
}): LmsVideoItem {
  return {
    id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    description: input.description?.trim() || "",
    duration: input.duration?.trim() || "—",
    src: resolveMediaUrl(input.src.trim()),
    isCompleted: false,
    resources: input.resources || [],
    createdAt: new Date().toISOString(),
  }
}

export function createCourseNote(input: {
  title: string
  fileName: string
  url: string
}): LmsCourseNote {
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    fileName: input.fileName,
    url: resolveMediaUrl(input.url),
    uploadedAt: new Date().toISOString(),
  }
}

export type LmsAssignmentItem = {
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

export function formatAssignmentDeadline(value?: string) {
  if (!value) return "June 30, 2026"
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatAssignmentTasksFromAi(result: {
  problemStatement?: string
  tasks?: string[]
  expectedOutcomes?: string[]
}) {
  const sections: string[] = []
  if (result.problemStatement?.trim()) {
    sections.push(result.problemStatement.trim())
  }
  if (result.tasks?.length) {
    sections.push(result.tasks.map((task, index) => `${index + 1}. ${task}`).join("\n"))
  }
  if (result.expectedOutcomes?.length) {
    sections.push(
      `Expected Outcomes:\n${result.expectedOutcomes.map((outcome) => `- ${outcome}`).join("\n")}`
    )
  }
  return sections.join("\n\n")
}

export function formatAssignmentCriteriaFromAi(criteria: string[] = []) {
  return criteria.map((item) => `- ${item}`).join("\n")
}

export function createAssignmentItem(input: {
  title: string
  deadline?: string
  tasks?: string
  criteria?: string
  difficulty?: string
  studentNames?: string[]
}): LmsAssignmentItem {
  const submissions = (input.studentNames || []).reduce<
    Record<string, { status: string; grade: string; feedback: string }>
  >((acc, name) => {
    acc[name] = { status: "pending", grade: "", feedback: "" }
    return acc
  }, {})

  return {
    id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: input.title.trim(),
    deadline: formatAssignmentDeadline(input.deadline),
    status: "pending",
    grade: "",
    feedback: "",
    tasks: input.tasks?.trim() || "",
    criteria: input.criteria?.trim() || "",
    difficulty: input.difficulty || "Medium",
    submissions,
  }
}
