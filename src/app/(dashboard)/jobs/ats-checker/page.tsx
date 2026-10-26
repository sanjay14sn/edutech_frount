"use client"

import * as React from "react"
import Link from "next/link"
import {
  Target,
  Sparkles,
  Upload,
  FileText,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Download,
  Award,
  Layers,
  ShieldCheck,
  Briefcase,
  Trash2,
  FileCheck,
  ArrowRight,
  Video,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { PageFeatureGate } from "@/components/shared/FeatureGate"
import {
  aiPlacementService,
  ResumeAnalysisResult,
  SavedResume,
} from "@/lib/aiPlacementService"

export default function ATSScoreCheckerPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [sampleName, setSampleName] = React.useState<string | null>(null)
  const [targetRole, setTargetRole] = React.useState("Full Stack Developer")
  const [analyzing, setAnalyzing] = React.useState(false)
  const [analysisProgress, setAnalysisProgress] = React.useState(0)
  const [analysisStep, setAnalysisStep] = React.useState("")
  const [activeTab, setActiveTab] = React.useState<"overview" | "keywords" | "bullets" | "checklist">("overview")
  const [copiedBullet, setCopiedBullet] = React.useState<number | null>(null)
  const [copiedKeyword, setCopiedKeyword] = React.useState<string | null>(null)
  const [savedToProfile, setSavedToProfile] = React.useState(false)
  const [analysis, setAnalysis] = React.useState<ResumeAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = React.useState<string | null>(null)
  const [savedResumes, setSavedResumes] = React.useState<SavedResume[]>([])
  const [selectedResumeId, setSelectedResumeId] = React.useState<string | null>(null)
  const [recentAnalyses, setRecentAnalyses] = React.useState<ResumeAnalysisResult[]>([])

  React.useEffect(() => {
    aiPlacementService
      .getSavedResumes()
      .then(setSavedResumes)
      .catch(() => setSavedResumes([]))

    const saved = localStorage.getItem("crm_ats_recent_analyses")
    if (saved) {
      try {
        setRecentAnalyses(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const roleOptions = [
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Engineer",
    "Data Scientist / AI Engineer",
    "DevOps / Cloud Engineer",
    "Software Engineer",
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setSampleName(null)
      setSelectedResumeId(null)
      setSavedToProfile(false)
    }
  }

  const handleSelectSavedResume = async (resume: SavedResume) => {
    try {
      setSelectedResumeId(resume.id)
      setSampleName(null)
      setSavedToProfile(false)
      const resumeFile = await aiPlacementService.getSavedResumeFile(resume)
      setFile(resumeFile)
    } catch (err: any) {
      alert(err.message || "Could not load resume file")
    }
  }

  const handleSelectSample = (type: "high" | "low") => {
    if (type === "high") {
      setSampleName("Arjun_Sharma_FullStack_Resume.pdf")
    } else {
      setSampleName("Student_Fresher_Resume_Draft.pdf")
    }
    setFile(null)
    setSelectedResumeId(null)
    setSavedToProfile(false)
  }

  const handleAnalyze = async () => {
    const input = file || sampleName
    if (!input) return

    setAnalyzing(true)
    setAnalysisError(null)
    setAnalysisProgress(20)
    setAnalysisStep("Reading PDF layout and parsing text...")

    const timer1 = setTimeout(() => {
      setAnalysisProgress(55)
      setAnalysisStep("Matching technical keywords against recruiter criteria...")
    }, 700)

    const timer2 = setTimeout(() => {
      setAnalysisProgress(85)
      setAnalysisStep("Auditing formatting & STAR achievement bullets...")
    }, 1400)

    try {
      const res = await aiPlacementService.analyzeResume(input, targetRole)
      setAnalysisProgress(100)
      setAnalysisStep("Evaluation complete!")
      setTimeout(() => {
        setAnalysis(res)
        setAnalyzing(false)
        setRecentAnalyses((prev) => {
          const updated = [res, ...prev.filter((r) => r.fileName !== res.fileName || r.targetRole !== res.targetRole)].slice(0, 5)
          localStorage.setItem("crm_ats_recent_analyses", JSON.stringify(updated))
          return updated
        })
      }, 400)

      if (file && !selectedResumeId) {
        aiPlacementService.uploadSavedResume(file).catch(() => {})
      }
    } catch (err: any) {
      setAnalyzing(false)
      setAnalysisError(err?.message || "Failed to analyze resume")
    } finally {
      clearTimeout(timer1)
      clearTimeout(timer2)
    }
  }

  const handleCopyBullet = (text: string, idx: number) => {
    navigator.clipboard.writeText(text)
    setCopiedBullet(idx)
    setTimeout(() => setCopiedBullet(null), 2000)
  }

  const handleCopyKeyword = (kw: string) => {
    navigator.clipboard.writeText(kw)
    setCopiedKeyword(kw)
    setTimeout(() => setCopiedKeyword(null), 2000)
  }

  const handleExportReport = () => {
    if (!analysis) return
    const text = `ATS RESUME AUDIT REPORT
Target Role: ${analysis.targetRole}
File Analyzed: ${analysis.fileName}
Overall Score: ${analysis.overallScore}/100
Keywords Match: ${analysis.atsScore}%
Formatting Score: ${analysis.formattingScore}%
Impact Score: ${analysis.impactScore}%

TOP STRENGTHS:
${analysis.strengths.map((s) => `- ${s}`).join("\n")}

AREAS FOR IMPROVEMENT:
${analysis.weaknesses.map((w) => `- ${w}`).join("\n")}

RECOMMENDED KEYWORDS:
${analysis.missingKeywords.join(", ")}

RECOMMENDED CERTIFICATIONS:
${analysis.certificationRecommendations.join(", ")}
`
    const blob = new Blob([text], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `ATS_Report_${analysis.targetRole.replace(/\s+/g, "_")}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <PageFeatureGate feature="enableJobPortal">
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/jobs" className="hover:text-primary transition-colors flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Job Portal</span>
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">ATS Score Checker</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Target className="h-6 w-6 text-indigo-500" />
              <span>AI ATS Resume Score Checker</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Benchmark your resume against enterprise applicant tracking systems, recruiter keywords, and STAR metrics.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/jobs/resume-matcher">
              <Button variant="outline" size="sm" icon={Sparkles} className="text-xs">
                Resume Matcher
              </Button>
            </Link>
            <Link href="/jobs/interview-prep">
              <Button variant="outline" size="sm" icon={Video} className="text-xs">
                Interview Prep
              </Button>
            </Link>
          </div>
        </div>

        {/* 2-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Target Role & Upload Controls */}
          <div className="space-y-6">
            {/* Target Role Card */}
            <Card className="border-border">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-indigo-500" />
                  <h3 className="font-bold text-sm text-foreground">Target Job Role</h3>
                </div>
                <p className="text-xs text-muted-foreground leading-normal">
                  Select the job profile standard you want to benchmark your resume against.
                </p>
                <div className="space-y-2">
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                  >
                    {roleOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </CardContent>
            </Card>

            {/* Resume Input Card */}
            <Card className="border-border">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  <h3 className="font-bold text-sm text-foreground">Choose Resume</h3>
                </div>

                <div className="border-2 border-dashed border-border rounded-xl p-5 text-center hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    id="ats-resume-upload"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <label htmlFor="ats-resume-upload" className="cursor-pointer block space-y-2">
                    <div className="h-10 w-10 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        {file ? file.name : "Click to upload Resume PDF"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        PDF format up to 20MB
                      </p>
                    </div>
                  </label>
                </div>

                {/* Sample Resumes */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                    Or try a sample benchmark:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectSample("high")}
                      className={`p-2 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                        sampleName === "Arjun_Sharma_FullStack_Resume.pdf"
                          ? "bg-indigo-500/10 border-indigo-500 text-foreground font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium truncate">Full Stack High-ATS</span>
                      <span className="block text-[10px] text-emerald-500">Benchmark ~90%</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectSample("low")}
                      className={`p-2 rounded-lg text-left text-xs border transition-colors cursor-pointer ${
                        sampleName === "Student_Fresher_Resume_Draft.pdf"
                          ? "bg-indigo-500/10 border-indigo-500 text-foreground font-semibold"
                          : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium truncate">Fresher Draft</span>
                      <span className="block text-[10px] text-amber-500">Needs Work ~55%</span>
                    </button>
                  </div>
                </div>

                {/* Saved Resumes */}
                {savedResumes.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border/50">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                      Saved Uploads:
                    </span>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {savedResumes.map((sr) => (
                        <button
                          key={sr.id}
                          type="button"
                          onClick={() => handleSelectSavedResume(sr)}
                          className={`w-full flex items-center justify-between p-2 rounded-lg text-xs border text-left cursor-pointer transition-colors ${
                            selectedResumeId === sr.id
                              ? "bg-primary/10 border-primary text-foreground font-medium"
                              : "border-border/60 hover:bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          <span className="truncate max-w-[170px]">{sr.fileName}</span>
                          <span className="text-[10px] shrink-0 text-muted-foreground/80">Select</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  isLoading={analyzing}
                  disabled={analyzing || (!file && !sampleName)}
                  onClick={handleAnalyze}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Calculate ATS Score
                </Button>
              </CardContent>
            </Card>

            {/* Recent Checks */}
            {recentAnalyses.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent Checks
                  </h4>
                  <div className="space-y-1.5">
                    {recentAnalyses.map((rec, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setAnalysis(rec)
                          setTargetRole(rec.targetRole)
                          setSampleName(rec.fileName)
                          setFile(null)
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-lg text-xs border border-border/50 hover:bg-muted/40 transition-colors cursor-pointer text-left"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-foreground truncate">{rec.fileName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{rec.targetRole}</p>
                        </div>
                        <Badge
                          variant={rec.overallScore >= 80 ? "success" : rec.overallScore >= 65 ? "warning" : "destructive"}
                          className="ml-2 shrink-0 text-[10px]"
                        >
                          {rec.overallScore}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Results View */}
          <div className="lg:col-span-2 space-y-6">
            {analyzing ? (
              <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[360px] border-border">
                <div className="h-14 w-14 bg-indigo-500/10 text-indigo-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
                  <Sparkles className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-base text-foreground mb-1">
                  AI ATS Resume Screening
                </h3>
                <p className="text-xs text-muted-foreground mb-6 max-w-sm">
                  {analysisStep}
                </p>
                <div className="w-full max-w-xs bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-indigo-600 h-2 transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  />
                </div>
              </Card>
            ) : !analysis ? (
              <Card className="p-12 text-center flex flex-col items-center justify-center min-h-[360px] border-border">
                <div className="h-14 w-14 rounded-2xl bg-muted text-muted-foreground flex items-center justify-center mb-4">
                  {analysisError ? (
                    <AlertCircle className="h-7 w-7 text-rose-500" />
                  ) : (
                    <FileCheck className="h-7 w-7" />
                  )}
                </div>
                <h3 className="font-bold text-base text-foreground mb-1">
                  {analysisError ? "Analysis Error" : "No Analysis Generated Yet"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  {analysisError ||
                    "Upload your resume PDF or pick a benchmark draft on the left, then click 'Calculate ATS Score'."}
                </p>
              </Card>
            ) : (
              <>
                {/* Score Rings Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card className="p-4 flex flex-col items-center justify-center text-center border-border">
                    <ProgressRing
                      value={analysis.overallScore}
                      size={74}
                      strokeWidth={6}
                      color={
                        analysis.overallScore >= 80
                          ? "#10b981"
                          : analysis.overallScore >= 65
                          ? "#6366f1"
                          : "#f59e0b"
                      }
                      label={`${analysis.overallScore}`}
                      sublabel="/100"
                    />
                    <h4 className="font-bold text-xs text-foreground mt-2">Overall ATS</h4>
                    <Badge
                      variant={
                        analysis.overallScore >= 80
                          ? "success"
                          : analysis.overallScore >= 65
                          ? "info"
                          : "warning"
                      }
                      className="text-[9px] mt-1"
                    >
                      {analysis.overallScore >= 80
                        ? "Super-Match"
                        : analysis.overallScore >= 65
                        ? "Good Match"
                        : "Needs Work"}
                    </Badge>
                  </Card>

                  <Card className="p-4 flex flex-col items-center justify-center text-center border-border">
                    <ProgressRing
                      value={analysis.atsScore}
                      size={74}
                      strokeWidth={6}
                      color="#10b981"
                      label={`${analysis.atsScore}%`}
                    />
                    <h4 className="font-bold text-xs text-foreground mt-2">Keywords</h4>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Recruiter Match
                    </span>
                  </Card>

                  <Card className="p-4 flex flex-col items-center justify-center text-center border-border">
                    <ProgressRing
                      value={analysis.formattingScore}
                      size={74}
                      strokeWidth={6}
                      color="#6366f1"
                      label={`${analysis.formattingScore}%`}
                    />
                    <h4 className="font-bold text-xs text-foreground mt-2">Formatting</h4>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Layout Parse
                    </span>
                  </Card>

                  <Card className="p-4 flex flex-col items-center justify-center text-center border-border">
                    <ProgressRing
                      value={analysis.impactScore}
                      size={74}
                      strokeWidth={6}
                      color="#8b5cf6"
                      label={`${analysis.impactScore}%`}
                    />
                    <h4 className="font-bold text-xs text-foreground mt-2">STAR Impact</h4>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      Metric Density
                    </span>
                  </Card>
                </div>

                {/* Toolbar */}
                <Card className="p-3.5 border-border flex flex-wrap items-center justify-between gap-3 bg-muted/20">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Benchmarked against:</span>
                    <Badge variant="secondary" className="font-semibold text-xs">
                      {analysis.targetRole}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={savedToProfile ? "secondary" : "primary"}
                      onClick={() => setSavedToProfile(true)}
                      icon={savedToProfile ? Check : Award}
                      className="text-xs"
                    >
                      {savedToProfile ? "Saved to Profile" : "Save Score"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportReport}
                      icon={Download}
                      className="text-xs"
                    >
                      Export Report
                    </Button>
                  </div>
                </Card>

                {/* Tabs */}
                <div className="flex items-center gap-1.5 border-b border-border/60 pb-2">
                  <button
                    onClick={() => setActiveTab("overview")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "overview"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Layers className="h-3.5 w-3.5" />
                    <span>Overview & Breakdown</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("keywords")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "keywords"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Target className="h-3.5 w-3.5" />
                    <span>Keyword Audit</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("bullets")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "bullets"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>STAR Bullet Fixes</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("checklist")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                      activeTab === "checklist"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>ATS Checklist</span>
                  </button>
                </div>

                {/* TAB 1: OVERVIEW */}
                {activeTab === "overview" && (
                  <div className="space-y-4">
                    {/* Strengths & Weaknesses */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="p-4 border-border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500 mb-2 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4" />
                          <span>Top Strengths</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-foreground/90">
                          {analysis.strengths.map((str, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-emerald-500">•</span>
                              <span>{str}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>

                      <Card className="p-4 border-border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 mb-2 flex items-center gap-1.5">
                          <AlertCircle className="h-4 w-4" />
                          <span>Areas to Enhance</span>
                        </h4>
                        <ul className="space-y-1.5 text-xs text-foreground/90">
                          {analysis.weaknesses.map((w, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-amber-500">•</span>
                              <span>{w}</span>
                            </li>
                          ))}
                        </ul>
                      </Card>
                    </div>

                    {/* Section Scores */}
                    <Card className="p-4 border-border">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
                        Section Score Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {Object.entries(analysis.sections).map(([key, val]) => (
                          <div key={key} className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="capitalize text-muted-foreground">{key}</span>
                              <span className="font-bold text-foreground">{val}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${
                                  val >= 80 ? "bg-emerald-500" : val >= 65 ? "bg-indigo-500" : "bg-amber-500"
                                }`}
                                style={{ width: `${val}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Cert Recommendations */}
                    {analysis.certificationRecommendations.length > 0 && (
                      <Card className="p-4 border-border">
                        <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-primary" />
                          <span>Recommended Certifications</span>
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.certificationRecommendations.map((cert, idx) => (
                            <Badge key={idx} variant="info" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                )}

                {/* TAB 2: KEYWORDS */}
                {activeTab === "keywords" && (
                  <div className="space-y-4">
                    <Card className="p-4 border-border">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-emerald-500 mb-2">
                        Matched Recruiter Keywords ({analysis.matchedKeywords.length})
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        These terms match high-volume queries recruiter search algorithms look for.
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.matchedKeywords.map((kw, i) => (
                          <Badge key={i} variant="success" className="text-xs">
                            ✓ {kw}
                          </Badge>
                        ))}
                      </div>
                    </Card>

                    <Card className="p-4 border-border">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500 mb-2">
                        High Priority Missing Keywords ({analysis.missingKeywords.length})
                      </h4>
                      <p className="text-xs text-muted-foreground mb-3">
                        Click any keyword to copy and incorporate into your projects or skills summary.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {analysis.missingKeywords.map((kw, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleCopyKeyword(kw)}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
                          >
                            <span>+ {kw}</span>
                            {copiedKeyword === kw ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3 opacity-60" />
                            )}
                          </button>
                        ))}
                      </div>
                    </Card>
                  </div>
                )}

                {/* TAB 3: STAR BULLET FIXES */}
                {activeTab === "bullets" && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground">
                      Our AI rewritten bullets follow the <strong>STAR method (Situation, Task, Action, Result)</strong> with action verbs and quantifiable metrics.
                    </p>
                    {analysis.bulletFixes.map((item, idx) => (
                      <Card key={idx} className="p-4 border-border space-y-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">
                            Original Line
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5 line-through decoration-rose-500/50">
                            {item.original}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              AI Optimized Version
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopyBullet(item.optimized, idx)}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                            >
                              {copiedBullet === idx ? (
                                <>
                                  <Check className="h-3 w-3" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <p className="text-xs font-medium text-foreground leading-relaxed">
                            {item.optimized}
                          </p>
                        </div>
                        <p className="text-[11px] text-muted-foreground italic">
                          💡 <strong>Why:</strong> {item.reason}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB 4: CHECKLIST */}
                {activeTab === "checklist" && (
                  <div className="space-y-2">
                    {analysis.atsChecklist.map((item, idx) => (
                      <Card key={idx} className="p-3.5 border-border flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {item.passed ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-semibold text-foreground">{item.check}</p>
                            <p className="text-[11px] text-muted-foreground">{item.details}</p>
                          </div>
                        </div>
                        <Badge variant={item.passed ? "success" : "warning"} className="text-[10px]">
                          {item.passed ? "Passed" : "Action Needed"}
                        </Badge>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </PageFeatureGate>
  )
}
