"use client"

import * as React from "react"
import Link from "next/link"
import {
  Sparkles,
  Upload,
  FileText,
  Search,
  Eye,
  Trash2,
  ExternalLink,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Star,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Layers,
  Target,
  Video,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Dialog } from "@/components/ui/Dialog"
import { PageFeatureGate } from "@/components/shared/FeatureGate"
import {
  aiPlacementService,
  GoogleJob,
  SavedResume,
} from "@/lib/aiPlacementService"

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function timeAgo(dateString?: string) {
  if (!dateString) return "recently"
  const date = new Date(dateString)
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ResumeJobMatcherPage() {
  const [file, setFile] = React.useState<File | null>(null)
  const [analyzing, setAnalyzing] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [googleJobs, setGoogleJobs] = React.useState<GoogleJob[]>([])
  const [googleQuery, setGoogleQuery] = React.useState("")
  const [matchError, setMatchError] = React.useState("")
  const [savedResumes, setSavedResumes] = React.useState<SavedResume[]>([])
  const [loadingResumes, setLoadingResumes] = React.useState(true)
  const [activeResumeId, setActiveResumeId] = React.useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<SavedResume | null>(null)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => {
    aiPlacementService
      .getSavedResumes()
      .then(setSavedResumes)
      .catch(() => setSavedResumes([]))
      .finally(() => setLoadingResumes(false))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
    e.target.value = ""
  }

  const runMatch = async (source: File | SavedResume) => {
    setAnalyzing(true)
    setMatchError("")
    setActiveResumeId(source instanceof File ? null : source.id)
    try {
      const result = await aiPlacementService.searchGoogleJobs(
        source instanceof File ? source : { resumeId: source.id }
      )
      setGoogleJobs(result.jobs)
      setGoogleQuery(result.query)
      setHasSearched(true)
      if (result.resume) {
        const saved = result.resume
        setActiveResumeId(saved.id)
        setSavedResumes((prev) => [saved, ...prev.filter((r) => r.id !== saved.id)].slice(0, 5))
        if (source instanceof File) setFile(null)
      }
    } catch (err: any) {
      setGoogleJobs([])
      setGoogleQuery("")
      setHasSearched(false)
      setMatchError(err?.message || "Failed to load live Google jobs")
    } finally {
      setAnalyzing(false)
    }
  }

  const handleMatchJobs = () => {
    if (!file || file.size === 0) return
    runMatch(file)
  }

  const handleOpenResume = async (resume: SavedResume) => {
    try {
      await aiPlacementService.openSavedResume(resume.id)
    } catch (err: any) {
      alert(err?.message || "Could not open resume")
    }
  }

  const handleDeleteResume = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await aiPlacementService.deleteSavedResume(deleteTarget.id)
      setSavedResumes((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      if (activeResumeId === deleteTarget.id) setActiveResumeId(null)
      setDeleteTarget(null)
    } catch (err: any) {
      alert(err?.message || "Could not remove this resume")
    } finally {
      setDeleting(false)
    }
  }

  const activeResume = savedResumes.find((r) => r.id === activeResumeId)

  return (
    <PageFeatureGate feature="enableJobPortal">
      <div className="space-y-6 pb-12">
        {/* Navigation & Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Link href="/jobs" className="hover:text-primary transition-colors flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                <span>Job Portal</span>
              </Link>
              <span>/</span>
              <span className="text-foreground font-medium">Resume Job Matcher</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-500 animate-pulse" />
              <span>Resume Job Matcher</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live Google job listings matched against your tech stack, projects, and CGPA.
            </p>
          </div>

          {/* Quick Module Switcher */}
          <div className="flex items-center gap-2">
            <Link href="/jobs/ats-checker">
              <Button variant="outline" size="sm" icon={Target} className="text-xs">
                ATS Checker
              </Button>
            </Link>
            <Link href="/jobs/interview-prep">
              <Button variant="outline" size="sm" icon={Video} className="text-xs">
                Interview Prep
              </Button>
            </Link>
          </div>
        </div>

        {/* Upload Banner */}
        <Card className="border-border bg-gradient-to-br from-card via-card to-indigo-500/5 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-xs">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-foreground">
                    Upload Resume for AI Job Matching
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                    Our AI parser extracts your technical stack, projects, and CGPA to rank matching recruiter drives and live Google job openings.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <input
                  type="file"
                  id="resume-upload-input"
                  accept=".pdf"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <label htmlFor="resume-upload-input" className="w-full sm:w-auto">
                  <span className="inline-flex items-center justify-center px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold rounded-xl cursor-pointer transition-all border border-border w-full text-center">
                    {file ? file.name : "Choose Resume PDF"}
                  </span>
                </label>

                <Button
                  disabled={analyzing || !file || file.size === 0}
                  isLoading={analyzing}
                  onClick={handleMatchJobs}
                  variant="primary"
                  size="sm"
                  icon={Sparkles}
                  className="w-full sm:w-auto text-xs whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  Find Matching Jobs
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Resumes */}
        <Card className="border-border overflow-hidden">
          <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between gap-3 bg-muted/30">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Recent Resumes</span>
            </h3>
            {!loadingResumes && savedResumes.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {savedResumes.length} saved
              </span>
            )}
          </div>

          {loadingResumes ? (
            <div className="p-6 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span>Loading saved resumes...</span>
            </div>
          ) : savedResumes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Resumes you upload are saved securely here, so you can re-run job discovery anytime without re-uploading.
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {savedResumes.map((resume) => {
                const isActive = resume.id === activeResumeId
                return (
                  <li
                    key={resume.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3.5 transition-colors ${
                      isActive ? "bg-indigo-500/10 border-l-2 border-indigo-500" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">
                          {resume.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {formatSize(resume.size)} • used {timeAgo(resume.lastUsedAt)}
                          {resume.lastQuery && (
                            <> • <span className="italic">"{resume.lastQuery}"</span></>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant={isActive ? "primary" : "outline"}
                        icon={Search}
                        isLoading={analyzing && isActive}
                        disabled={analyzing}
                        onClick={() => runMatch(resume)}
                        className="text-xs"
                      >
                        Find Jobs
                      </Button>
                      <button
                        type="button"
                        title="View PDF"
                        onClick={() => handleOpenResume(resume)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        title="Delete resume"
                        onClick={() => setDeleteTarget(resume)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Google Jobs Listings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              <span>Google Jobs ({googleJobs.length})</span>
            </h3>
            {googleQuery && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                Query: {googleQuery} {activeResume ? ` • ${activeResume.fileName}` : ""}
              </span>
            )}
          </div>

          {analyzing ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 bg-muted rounded-md w-1/3" />
                    <div className="h-4 bg-muted rounded-md w-1/4" />
                    <div className="h-12 bg-muted rounded-md w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : googleJobs.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {matchError ? (
                <div className="flex flex-col items-center gap-2 text-rose-500">
                  <AlertCircle className="h-6 w-6" />
                  <span>{matchError}</span>
                </div>
              ) : hasSearched ? (
                "No live Google job listings matched this resume. Try uploading an updated resume."
              ) : (
                "Upload a resume and choose 'Find Matching Jobs' to load live Google listings and company ratings."
              )}
            </Card>
          ) : (
            <div className="grid gap-4">
              {googleJobs.map((job) => (
                <Card
                  key={job.id}
                  className="p-5 border-border hover:border-indigo-500/40 transition-all shadow-xs"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black text-lg flex items-center justify-center shrink-0 shadow-xs">
                        {(job.companyName || "G")[0]}
                      </div>
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-base text-foreground leading-snug">
                            {job.title}
                          </h3>
                          <Badge variant="info" className="text-[10px]">
                            Google Jobs
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                          <strong className="text-foreground font-semibold">
                            {job.companyName}
                          </strong>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {job.location}
                          </span>
                          {job.schedule && (
                            <>
                              <span>•</span>
                              <span>{job.schedule}</span>
                            </>
                          )}
                          {job.postedAt && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {job.postedAt}
                              </span>
                            </>
                          )}
                          {job.via && (
                            <>
                              <span>•</span>
                              <span className="italic">{job.via}</span>
                            </>
                          )}
                        </p>
                        {job.description && (
                          <p className="text-xs text-muted-foreground/90 pt-1 line-clamp-3 leading-relaxed">
                            {job.description}
                          </p>
                        )}
                        {job.ratings && job.ratings.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2">
                            {job.ratings.map((rating, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[10px] gap-1">
                                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                                <span>
                                  {rating.source}: {rating.rating ?? "—"}{" "}
                                  {rating.reviews ? `(${rating.reviews} reviews)` : ""}
                                </span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-border/50 flex justify-end">
                      <Button
                        size="sm"
                        disabled={!job.applyLink}
                        onClick={() => window.open(job.applyLink, "_blank", "noopener,noreferrer")}
                        icon={ExternalLink}
                        iconPosition="right"
                        className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                      >
                        Apply Directly
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <Dialog
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Remove Resume"
          description={`Are you sure you want to remove ${deleteTarget?.fileName || "this resume"}?`}
        >
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              This will remove the resume from your saved list. You can re-upload it anytime.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                isLoading={deleting}
                onClick={handleDeleteResume}
              >
                Remove
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    </PageFeatureGate>
  )
}
