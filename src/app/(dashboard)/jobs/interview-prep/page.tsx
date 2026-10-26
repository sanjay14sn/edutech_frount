"use client"

import * as React from "react"
import Link from "next/link"
import {
  Video,
  Mic,
  Camera,
  Sparkles,
  Bot,
  RefreshCw,
  Award,
  AlertTriangle,
  Building2,
  Send,
  Volume2,
  Clock,
  CheckCircle2,
  Briefcase,
  Play,
  Square,
  Target,
} from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { ProgressRing } from "@/components/ui/ProgressRing"
import { PageFeatureGate } from "@/components/shared/FeatureGate"
import {
  aiPlacementService,
  InterviewResult,
  InterviewHistoryItem,
} from "@/lib/aiPlacementService"
import {
  connectLiveInterview,
  LiveInterview,
  TranscriptTurn,
} from "@/lib/interviewLive"

type InterviewStatus =
  | "setup"
  | "starting"
  | "ai_speaking"
  | "recording_user"
  | "evaluating"
  | "finished"

export default function InterviewPrepPage() {
  const [company, setCompany] = React.useState("Google India")
  const [round, setRound] = React.useState("technical")
  const [status, setStatus] = React.useState<InterviewStatus>("setup")
  const [elapsed, setElapsed] = React.useState(0)
  const [turns, setTurns] = React.useState<TranscriptTurn[]>([])
  const [result, setResult] = React.useState<InterviewResult | null>(null)
  const [history, setHistory] = React.useState<InterviewHistoryItem[]>([])
  const [draft, setDraft] = React.useState("")
  const [cameraEnabled, setCameraEnabled] = React.useState(true)

  const videoRef = React.useRef<HTMLVideoElement>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const liveRef = React.useRef<LiveInterview | null>(null)
  const sessionIdRef = React.useRef("")

  const companies = [
    "Google India",
    "Microsoft India",
    "Amazon India",
    "Infosys",
    "TCS",
    "Wipro",
    "Accenture",
  ]

  const rounds = [
    { value: "technical", label: "Technical Core" },
    { value: "hr", label: "HR & Behavioral" },
  ]

  const loadHistory = () => {
    aiPlacementService.listInterviews().then(setHistory).catch(() => {})
  }

  React.useEffect(() => {
    loadHistory()
    return () => {
      liveRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  React.useEffect(() => {
    if (status !== "ai_speaking" && status !== "recording_user") return
    const timer = window.setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  const stopMedia = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const handleStartSession = async () => {
    const targetCompany = company.trim()
    if (!targetCompany) return

    setStatus("starting")
    setResult(null)
    setTurns([])
    setElapsed(0)

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: true,
      })
      streamRef.current = mediaStream

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }

      const session = await aiPlacementService.startInterview(targetCompany, round)
      sessionIdRef.current = session.sessionId

      liveRef.current = await connectLiveInterview({
        token: session.token,
        models: session.models,
        instructions: session.instructions,
        stream: mediaStream,
        video: cameraEnabled ? videoRef.current : null,
        refreshToken: async () => {
          const fresh = await aiPlacementService.refreshInterviewToken(session.sessionId)
          return fresh.token
        },
        handlers: {
          onReady: () => setStatus("ai_speaking"),
          onAiSpeaking: () => setStatus("ai_speaking"),
          onListening: () => setStatus("recording_user"),
          onTranscript: setTurns,
          onError: (msg) => {
            console.error("Live interview error:", msg)
          },
        },
      })
    } catch (err: any) {
      stopMedia()
      liveRef.current = null
      setStatus("setup")
      alert(err?.message || "Could not start mock interview. Check camera/mic permissions.")
    }
  }

  const handleFinishSession = async () => {
    const transcript = liveRef.current?.stop() || turns
    const model = liveRef.current?.model
    liveRef.current = null
    stopMedia()
    setStatus("evaluating")

    try {
      const scored = await aiPlacementService.completeInterview(
        sessionIdRef.current,
        transcript,
        model
      )
      setResult(scored)
      setStatus("finished")
      loadHistory()
    } catch (err: any) {
      setStatus("setup")
      alert(err?.message || "Could not score this interview session")
    }
  }

  const sendTypedAnswer = () => {
    if (!draft.trim()) return
    const sent = liveRef.current?.sendText(draft.trim()) || false
    if (!sent) {
      alert("Wait until interviewer is connected")
      return
    }
    setDraft("")
  }

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0")
    const sec = (seconds % 60).toString().padStart(2, "0")
    return `${min}:${sec}`
  }

  const isLive = status === "starting" || status === "ai_speaking" || status === "recording_user"
  const canEditSetup = status === "setup" || status === "finished"

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
              <span className="text-foreground font-medium">Interview Prep</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Video className="h-6 w-6 text-indigo-500" />
              <span>Live AI Voice & Video Mock Interview</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Practice real-time technical and HR interview rounds with interactive speech-to-speech AI.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/jobs/resume-matcher">
              <Button variant="outline" size="sm" icon={Sparkles} className="text-xs">
                Resume Matcher
              </Button>
            </Link>
            <Link href="/jobs/ats-checker">
              <Button variant="outline" size="sm" icon={Target} className="text-xs">
                ATS Checker
              </Button>
            </Link>
          </div>
        </div>

        {/* Main 2-Column Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Setup & Past Sessions */}
          <div className="space-y-6">
            {/* Setup Card */}
            <Card className="border-border overflow-hidden">
              <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/80">
                  Interview Setup
                </p>
                <h3 className="font-bold text-sm mt-0.5">Configure Target Role</h3>
              </div>

              <CardContent className="p-5 space-y-4">
                {/* Target Company */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-indigo-500" />
                    <span>Target Company</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    disabled={!canEditSetup}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Google India"
                    className="w-full h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {companies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={!canEditSetup}
                        onClick={() => setCompany(c)}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-colors cursor-pointer ${
                          company === c
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Round */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Interview Round</label>
                  <div className="grid grid-cols-2 gap-2">
                    {rounds.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        disabled={!canEditSetup}
                        onClick={() => setRound(r.value)}
                        className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-colors cursor-pointer ${
                          round === r.value
                            ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera Toggle */}
                {canEditSetup && (
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Camera className="h-3.5 w-3.5 text-primary" />
                      <span>Enable Webcam Analysis</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={cameraEnabled}
                      onChange={(e) => setCameraEnabled(e.target.checked)}
                      className="cursor-pointer"
                    />
                  </div>
                )}

                {/* Actions */}
                {canEditSetup && (
                  <Button
                    variant="primary"
                    icon={Play}
                    size="sm"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleStartSession}
                  >
                    {status === "finished" ? "Start Another Mock Session" : "Start Mock Interview"}
                  </Button>
                )}

                {isLive && (
                  <Button
                    variant="destructive"
                    icon={Square}
                    size="sm"
                    className="w-full"
                    onClick={handleFinishSession}
                    disabled={status === "starting"}
                  >
                    End Interview & Calculate Score
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Score Ring Card if Finished */}
            {status === "finished" && result && (
              <Card className="p-5 flex flex-col items-center text-center border-border">
                <ProgressRing
                  value={result.score}
                  size={110}
                  strokeWidth={8}
                  color={result.score >= 80 ? "#10b981" : result.score >= 60 ? "#6366f1" : "#ef4444"}
                  label={`${result.score}`}
                  sublabel="Final Score"
                />
                <h3 className="font-bold text-sm text-foreground mt-3">{result.company}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.round === "hr" ? "HR & Behavioral Round" : "Technical Core Round"}
                </p>
              </Card>
            )}

            {/* History Card */}
            {history.length > 0 && (
              <Card className="border-border">
                <CardContent className="p-4 space-y-2.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Previous Mock Scores
                  </h4>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {history.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg border border-border/50 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{item.company}</p>
                          <p className="text-[10px] text-muted-foreground capitalize">{item.round} Round</p>
                        </div>
                        <Badge
                          variant={item.score >= 80 ? "success" : item.score >= 60 ? "info" : "destructive"}
                          className="text-[10px] font-bold"
                        >
                          {item.score}/100
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT: Live Video & Interview Console */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border overflow-hidden">
              {/* Header Status Bar */}
              <div className="p-3.5 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      status === "ai_speaking"
                        ? "bg-indigo-500 animate-ping"
                        : status === "recording_user"
                        ? "bg-emerald-500 animate-pulse"
                        : status === "starting"
                        ? "bg-amber-500 animate-bounce"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <span className="text-xs font-bold text-foreground capitalize">
                    {status === "ai_speaking"
                      ? "AI Interviewer Speaking..."
                      : status === "recording_user"
                      ? "Listening to Candidate..."
                      : status === "starting"
                      ? "Connecting Live Session..."
                      : status === "evaluating"
                      ? "Evaluating & Scoring..."
                      : status === "finished"
                      ? "Mock Session Finished"
                      : "Ready to Begin"}
                  </span>
                </div>

                {isLive && (
                  <Badge variant="secondary" className="gap-1 text-xs font-mono">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(elapsed)}</span>
                  </Badge>
                )}
              </div>

              {/* Video Screen */}
              <div className="relative aspect-video bg-zinc-950 flex items-center justify-center overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`h-full w-full object-cover ${
                    isLive && cameraEnabled ? "block" : "hidden"
                  }`}
                />

                {(!isLive || !cameraEnabled) && (
                  <div className="flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                    <div className="h-16 w-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 mb-3 shadow-inner">
                      <Bot className="h-8 w-8 text-indigo-400" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-200">
                      {status === "finished"
                        ? "Interview Complete"
                        : "AI Placement Mock Studio"}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                      {status === "finished"
                        ? "Review your score and feedback breakdown below."
                        : "Click 'Start Mock Interview' to begin live speech interaction with the AI."}
                    </p>
                  </div>
                )}

                {/* Live Floating Indicators */}
                {isLive && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <div className="px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-2 border border-white/10">
                      {status === "ai_speaking" ? (
                        <>
                          <Volume2 className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                          <span>AI Speaking</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                          <span>Mic Active</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Text Input Fallback */}
              {isLive && (
                <div className="p-3 border-t border-border flex gap-2 bg-muted/10">
                  <input
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendTypedAnswer()}
                    placeholder="Type an answer if microphone is muted..."
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-card text-foreground text-xs focus:ring-2 focus:ring-primary focus:outline-hidden"
                  />
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={sendTypedAnswer}
                    disabled={!draft.trim()}
                    icon={Send}
                    className="text-xs"
                  >
                    Send
                  </Button>
                </div>
              )}
            </Card>

            {/* Results or Transcript */}
            {status === "finished" && result ? (
              <div className="space-y-4">
                <Card className="p-5 border-border space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    <span>Recruiter Evaluation & Feedback</span>
                  </h4>
                  <p className="text-xs text-foreground leading-relaxed bg-muted/30 p-3.5 rounded-xl border border-border/50">
                    {result.feedback}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">
                        Demonstrated Strengths
                      </span>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {result.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-1.5">
                      <span className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block">
                        Target Improvements
                      </span>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {result.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>

                {/* Transcript */}
                <Card className="p-5 border-border space-y-3">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                    Interview Transcript ({result.transcript.length} turns)
                  </h4>
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                    {result.transcript.map((turn, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl text-xs space-y-1 ${
                          turn.role === "interviewer"
                            ? "bg-indigo-500/10 border border-indigo-500/20"
                            : "bg-muted border border-border"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider block text-muted-foreground">
                          {turn.role === "interviewer" ? "AI Recruiter" : "You (Candidate)"}
                        </span>
                        <p className="text-foreground leading-relaxed">{turn.text}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            ) : turns.length > 0 ? (
              <Card className="p-5 border-border space-y-3">
                <h4 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
                  Live Session Transcript
                </h4>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {turns.map((turn, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-xl text-xs space-y-1 ${
                        turn.role === "interviewer"
                          ? "bg-indigo-500/10 border border-indigo-500/20"
                          : "bg-muted border border-border"
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider block text-muted-foreground">
                        {turn.role === "interviewer" ? "AI Recruiter" : "You (Candidate)"}
                      </span>
                      <p className="text-foreground leading-relaxed">{turn.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </PageFeatureGate>
  )
}
