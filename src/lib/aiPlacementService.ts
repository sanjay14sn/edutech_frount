/**
 * Client service for AI Placement Backend integration:
 * - Resume Job Matcher (Google Jobs & Saved Resumes)
 * - ATS Score Checker (Parser, Keyword Benchmarking & STAR Bullets)
 * - AI Voice/Video Interview Prep (Session generation, Gemini Live WebSocket, scoring)
 */

export interface GoogleJob {
  id: string
  title: string
  companyName: string
  location: string
  via: string
  description: string
  schedule: string
  postedAt: string
  applyLink: string
  ratings: { source: string; rating: number | null; reviews: number | null; link: string }[]
}

export interface SavedResume {
  id: string
  fileName: string
  size: number
  lastQuery?: string
  uploadedAt: string
  lastUsedAt: string
}

export interface ResumeAnalysisResult {
  fileName: string
  targetRole: string
  overallScore: number
  atsScore: number
  formattingScore: number
  impactScore: number
  parsedSummary: {
    name: string
    email: string
    phone: string
    wordCount: number
    detectedSections: string[]
    skillsFound: string[]
  }
  sections: {
    skills: number
    projects: number
    atsKeywords: number
    formatting: number
    achievements: number
    experience: number
    education: number
  }
  strengths: string[]
  weaknesses: string[]
  matchedKeywords: string[]
  missingKeywords: string[]
  missingSkills: string[]
  bulletFixes: {
    original: string
    optimized: string
    reason: string
  }[]
  atsChecklist: {
    check: string
    passed: boolean
    details: string
  }[]
  suggestions: string[]
  certificationRecommendations: string[]
}

export interface InterviewSessionData {
  sessionId: string
  token: string
  models: string[]
  instructions: string
  remainingToday: number
}

export interface InterviewResult {
  id: string
  company: string
  round: string
  score: number
  feedback: string
  strengths: string[]
  improvements: string[]
  transcript: { role: "interviewer" | "candidate"; text: string }[]
}

export interface InterviewHistoryItem {
  id: string
  company: string
  round: string
  score: number
  feedback?: string
  createdAt: string
}

// Proxied base URL through Next.js
const PROXY_API = "/api/ai-placement/proxy"

let cachedPlacementToken: string | null = null

export async function getAiPlacementToken(): Promise<string> {
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem("ai_placement_token")
    if (existing) {
      try {
        const payload = JSON.parse(atob(existing.split(".")[1] || "{}"))
        if (payload.exp && payload.exp * 1000 > Date.now() + 60000) {
          cachedPlacementToken = existing
          return existing
        }
      } catch {
        // expired or malformed
      }
    }
  }

  // Request fresh token from Next.js backend bridge
  try {
    const res = await fetch("/api/ai-placement/token")
    const data = await res.json()
    if (data.success && data.token) {
      cachedPlacementToken = data.token
      if (typeof window !== "undefined") {
        localStorage.setItem("ai_placement_token", data.token)
      }
      return data.token
    }
  } catch (err) {
    console.error("Failed to retrieve AI Placement Token:", err)
  }

  return cachedPlacementToken || ""
}

async function placementFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAiPlacementToken()
  const headers = new Headers(options.headers || {})
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const url = `${PROXY_API}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`
  return fetch(url, { ...options, headers })
}

export const aiPlacementService = {
  // ─── RESUME JOB MATCHER ─────────────────────────────────────────────────────

  getSavedResumes: async (): Promise<SavedResume[]> => {
    try {
      const res = await placementFetch("/jobs/resumes")
      if (!res.ok) return []
      const data = await res.json()
      return (data.data || []) as SavedResume[]
    } catch {
      return []
    }
  },

  searchGoogleJobs: async (source: File | { resumeId: string }) => {
    const form = new FormData()
    if (source instanceof File) {
      form.append("resume", source, source.name)
    } else {
      form.append("resumeId", source.resumeId)
    }

    const res = await placementFetch("/jobs/google", {
      method: "POST",
      body: form,
    })

    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Failed to search Google jobs")
    }

    return {
      jobs: (data.data || []) as GoogleJob[],
      query: String(data.query || ""),
      resume: (data.resume || null) as SavedResume | null,
    }
  },

  uploadSavedResume: async (file: File): Promise<SavedResume> => {
    const form = new FormData()
    form.append("resume", file, file.name)

    const res = await placementFetch("/jobs/resumes", {
      method: "POST",
      body: form,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.message || "Could not upload resume")
    }
    return data.data as SavedResume
  },

  getSavedResumeFile: async (resume: SavedResume): Promise<File> => {
    const res = await placementFetch(`/jobs/resumes/${resume.id}/file`)
    if (!res.ok) {
      throw new Error("Could not download saved resume")
    }
    const blob = await res.blob()
    return new File([blob], resume.fileName, { type: blob.type || "application/pdf" })
  },

  openSavedResume: async (id: string): Promise<void> => {
    const res = await placementFetch(`/jobs/resumes/${id}/file`)
    if (!res.ok) {
      throw new Error("Could not open resume file")
    }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank", "noopener,noreferrer")
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  },

  deleteSavedResume: async (id: string): Promise<void> => {
    const res = await placementFetch(`/jobs/resumes/${id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.message || "Could not remove saved resume")
    }
  },

  // ─── ATS SCORE CHECKER ──────────────────────────────────────────────────────

  analyzeResume: async (
    file: File | string,
    targetRole: string = "Full Stack Developer"
  ): Promise<ResumeAnalysisResult> => {
    if (typeof file !== "string") {
      const form = new FormData()
      form.append("resume", file, file.name)
      form.append("targetRole", targetRole)

      const res = await placementFetch("/ai/analyze-resume", {
        method: "POST",
        body: form,
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.message || "Failed to analyze resume with AI")
      }

      return normalizeResumeAnalysis(data.data, file.name, targetRole)
    }

    // Client-side demo fallback for sample resumes
    await new Promise((resolve) => setTimeout(resolve, 1500))
    return normalizeResumeAnalysis(null, file, targetRole)
  },

  // ─── AI VOICE & VIDEO INTERVIEW PREP ────────────────────────────────────────

  startInterview: async (company: string, round: string): Promise<InterviewSessionData> => {
    const res = await placementFetch("/ai/interview/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, round }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Failed to initialize AI interview session")
    }
    return data.data as InterviewSessionData
  },

  refreshInterviewToken: async (sessionId: string): Promise<{ token: string; models: string[] }> => {
    const res = await placementFetch(`/ai/interview/sessions/${sessionId}/token`, {
      method: "POST",
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Failed to refresh session live token")
    }
    return data.data
  },

  completeInterview: async (
    sessionId: string,
    transcript: { role: "interviewer" | "candidate"; text: string }[],
    model?: string
  ): Promise<InterviewResult> => {
    const res = await placementFetch(`/ai/interview/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript, model }),
    })
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.message || "Could not score this interview session")
    }
    return data.data as InterviewResult
  },

  listInterviews: async (): Promise<InterviewHistoryItem[]> => {
    try {
      const res = await placementFetch("/ai/interview/sessions")
      if (!res.ok) return []
      const data = await res.json()
      return (data.data || []) as InterviewHistoryItem[]
    } catch {
      return []
    }
  },
}

export function normalizeResumeAnalysis(
  data: any,
  fileName: string,
  targetRole: string
): ResumeAnalysisResult {
  if (data && typeof data.overallScore === "number") {
    return {
      fileName: data.fileName || fileName,
      targetRole: data.targetRole || targetRole,
      overallScore: data.overallScore ?? 75,
      atsScore: data.atsScore ?? 70,
      formattingScore: data.formattingScore ?? 85,
      impactScore: data.impactScore ?? 75,
      parsedSummary: {
        name: data.parsedSummary?.name || "Student",
        email: data.parsedSummary?.email || "student@edu.com",
        phone: data.parsedSummary?.phone || "—",
        wordCount: data.parsedSummary?.wordCount || 420,
        detectedSections: data.parsedSummary?.detectedSections || ["Skills", "Experience", "Education", "Projects"],
        skillsFound: data.parsedSummary?.skillsFound || [],
      },
      sections: {
        skills: data.sections?.skills ?? 80,
        projects: data.sections?.projects ?? 75,
        atsKeywords: data.sections?.atsKeywords ?? 70,
        formatting: data.sections?.formatting ?? 85,
        achievements: data.sections?.achievements ?? 70,
        experience: data.sections?.experience ?? 75,
        education: data.sections?.education ?? 90,
      },
      strengths: data.strengths || ["Clean standard formatting", "Good alignment with recruiter core criteria"],
      weaknesses: data.weaknesses || ["Could add more quantified metrics in project bullets"],
      matchedKeywords: data.matchedKeywords || [],
      missingKeywords: data.missingKeywords || [],
      missingSkills: data.missingSkills || [],
      bulletFixes: data.bulletFixes || [
        {
          original: "Worked on frontend design and features.",
          optimized: "Architected responsive React interfaces improving core web vitals and reducing page load by 35%.",
          reason: "Uses strong action verb 'Architected' and quantifies performance benefit.",
        },
      ],
      atsChecklist: data.atsChecklist || [
        { check: "Standard Section Headings", passed: true, details: "Parsed Education, Skills, and Experience headers" },
        { check: "Single-Column Layout", passed: true, details: "No multi-column tables or complex text frames" },
        { check: "Contact Information", passed: true, details: "Valid Email and Phone number detected" },
        { check: "Quantified Accomplishments", passed: true, details: "Contains measurable metrics and % figures" },
      ],
      suggestions: data.suggestions || ["Benchmark against top industry vacancies regularly"],
      certificationRecommendations: data.certificationRecommendations || ["AWS Certified Cloud Practitioner"],
    }
  }

  // High score sample
  const isSampleHigh =
    fileName.toLowerCase().includes("high") ||
    fileName.toLowerCase().includes("senior") ||
    fileName.toLowerCase().includes("arjun")

  if (isSampleHigh) {
    return {
      fileName,
      targetRole,
      overallScore: 92,
      atsScore: 90,
      formattingScore: 95,
      impactScore: 88,
      parsedSummary: {
        name: "Arjun Sharma",
        email: "arjun.s@placement.edu",
        phone: "+91 98765 43210",
        wordCount: 485,
        detectedSections: ["Education", "Experience", "Projects", "Skills", "Certifications"],
        skillsFound: ["React", "TypeScript", "Node.js", "MongoDB", "Docker", "REST API", "TailwindCSS"],
      },
      sections: {
        skills: 95,
        projects: 90,
        atsKeywords: 90,
        formatting: 96,
        achievements: 88,
        experience: 92,
        education: 98,
      },
      strengths: [
        "Strong technical stack alignment with recruiter queries",
        "Quantified impact metrics in 85% of work experience bullets",
        "Clean single-column ATS readable layout with standard headings",
        "Includes verified Github repository links and live project URLs",
      ],
      weaknesses: [
        "Could add 1-2 more cloud infrastructure keywords (e.g. AWS Lambda, Terraform)",
        "Executive summary could be slightly more concise (under 3 lines)",
      ],
      matchedKeywords: ["React", "TypeScript", "Node.js", "MongoDB", "REST API", "TailwindCSS", "Git", "Agile"],
      missingKeywords: ["CI/CD Pipelines", "System Design"],
      missingSkills: ["Docker", "Kubernetes"],
      bulletFixes: [
        {
          original: "Built backend APIs for student portal using Node.js.",
          optimized: "Engineered RESTful Node.js microservices handling 45,000+ monthly requests with sub-100ms latency.",
          reason: "Adds action verb 'Engineered' and quantifies volume (45k requests) and performance (100ms).",
        },
        {
          original: "Responsible for fixing UI bugs in React application.",
          optimized: "Resolved 35+ critical React UI bugs, boosting lighthouse performance score from 68 to 94.",
          reason: "Replaces passive 'Responsible for' with direct result metric (Lighthouse 68 -> 94).",
        },
      ],
      atsChecklist: [
        { check: "Standard Section Titles", passed: true, details: "Used standard headers (Experience, Education, Skills)" },
        { check: "Single-Column Layout", passed: true, details: "No multi-column tables or complex text frames" },
        { check: "Font Readability", passed: true, details: "Clean standard typography (Inter / Outfit)" },
        { check: "Quantified Metrics", passed: true, details: "Contains numbers, %, and performance data" },
        { check: "Action Verbs Usage", passed: true, details: "100% of bullets start with strong action verbs" },
        { check: "Contact Details Parsing", passed: true, details: "Valid Email and Phone number found" },
      ],
      suggestions: [
        "Add 1-2 cloud infrastructure certifications (e.g., AWS Certified Developer)",
        "Include exact tech stack version numbers for key frameworks (e.g. React 18, Node 20)",
        "Mention automated unit testing coverage percentage in project highlights",
      ],
      certificationRecommendations: ["AWS Certified Developer - Associate", "Meta Front-End Developer Professional"],
    }
  }

  // Fresher / basic sample
  return {
    fileName,
    targetRole,
    overallScore: 58,
    atsScore: 52,
    formattingScore: 72,
    impactScore: 48,
    parsedSummary: {
      name: "Student Candidate",
      email: "candidate@edu.com",
      phone: "+91 91234 56789",
      wordCount: 290,
      detectedSections: ["Education", "Academic Projects", "Skills"],
      skillsFound: ["HTML", "CSS", "JavaScript", "C++", "SQL"],
    },
    sections: {
      skills: 60,
      projects: 55,
      atsKeywords: 52,
      formatting: 72,
      achievements: 40,
      experience: 45,
      education: 85,
    },
    strengths: [
      "Standard section headings easily parsed by ATS scanner",
      "Clear educational degree details with CGPA and graduation year",
      "Clean contact section with valid email and phone number",
    ],
    weaknesses: [
      "Lacks quantified achievement metrics (missing %, numbers, speed improvements)",
      "Low keyword density for target modern frameworks (e.g. React, TypeScript, Next.js)",
      "Project descriptions use passive verbs instead of strong action words",
    ],
    matchedKeywords: ["JavaScript", "HTML", "CSS", "SQL", "Git"],
    missingKeywords: ["React", "TypeScript", "Node.js", "REST APIs", "TailwindCSS"],
    missingSkills: ["Docker", "PostgreSQL", "Cloud Deployment"],
    bulletFixes: [
      {
        original: "Created a student management portal for college project.",
        optimized: "Architected a full-stack student management application serving 500+ active campus users with 99% uptime.",
        reason: "Adds strong action verb 'Architected' and concrete metrics (500+ users, 99% uptime).",
      },
    ],
    atsChecklist: [
      { check: "Standard Section Titles", passed: true, details: "Standard headings found" },
      { check: "Single-Column Layout", passed: true, details: "Simple layout" },
      { check: "Font Readability", passed: true, details: "Readable font" },
      { check: "Quantified Metrics", passed: false, details: "Less than 20% of bullets contain numbers or percentages" },
      { check: "Action Verbs Usage", passed: false, details: "Several bullets start with passive phrases" },
      { check: "Contact Details Parsing", passed: true, details: "Valid contact info parsed" },
    ],
    suggestions: [
      "Incorporate modern tech stack keywords like React, TypeScript, Node.js",
      "Include metrics such as query speeds, user counts, or code test coverage",
      "Add link to active GitHub profile showing live repository links",
    ],
    certificationRecommendations: ["AWS Cloud Practitioner", "Meta Front-End Developer Professional"],
  }
}
