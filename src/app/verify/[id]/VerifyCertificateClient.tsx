"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Award,
  CheckCircle2,
  ShieldCheck,
  Download,
  Copy,
  Check,
  Printer,
  ExternalLink,
  Search,
  Calendar,
  Building,
  Lock,
  ArrowLeft,
  Share2,
  FileBadge2,
  Sparkles,
  Layers,
  AlertTriangle
} from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import {
  VerifiedCertificate,
  getCertificateByHash,
  CertificateModelType
} from "@/lib/certificates"
import { CertificateCanvas } from "@/components/certificate/CertificateCanvas"

interface VerifyCertificateClientProps {
  initialHash: string
}

export function VerifyCertificateClient({ initialHash }: VerifyCertificateClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Read URL query overrides (if present)
  const studentParam = searchParams?.get("student")
  const courseParam = searchParams?.get("course")
  const batchParam = searchParams?.get("batch")
  const instructorParam = searchParams?.get("instructor")
  const modelParam = searchParams?.get("model") as CertificateModelType | null

  const [cert, setCert] = React.useState<VerifiedCertificate | null>(() =>
    getCertificateByHash(initialHash, {
      student: studentParam,
      course: courseParam,
      batch: batchParam,
      instructor: instructorParam,
      model: modelParam,
    })
  )

  // Certificate model template state: classic | modern | royal
  const [selectedModel, setSelectedModel] = React.useState<CertificateModelType>(
    modelParam && ["classic", "modern", "royal"].includes(modelParam)
      ? modelParam
      : cert?.preferredModel || "classic"
  )

  const [searchHash, setSearchHash] = React.useState(initialHash || "")
  const [copied, setCopied] = React.useState(false)
  const [toastMessage, setToastMessage] = React.useState<string | null>(null)

  // Sync if initialHash or searchParams change
  React.useEffect(() => {
    const updated = getCertificateByHash(initialHash, {
      student: studentParam,
      course: courseParam,
      batch: batchParam,
      instructor: instructorParam,
      model: modelParam,
    })
    setCert(updated)
    if (updated?.preferredModel && !modelParam) {
      setSelectedModel(updated.preferredModel)
    }
  }, [initialHash, studentParam, courseParam, batchParam, instructorParam, modelParam])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      showToast("Official verification URL copied to clipboard!")
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchHash.trim()) return
    router.push(`/verify/${searchHash.trim()}`)
  }

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print()
    }
  }

  const handleLinkedInShare = () => {
    if (!cert) return
    const url = typeof window !== "undefined" ? window.location.href : ""
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
    window.open(linkedInUrl, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-amber-500 selection:text-white">
      
      {/* ── Top Verification Navigation Bar (White Theme with Proper Logo) ── */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center group transition-opacity hover:opacity-95"
            >
              <Image
                src="/erplogo.png"
                alt="ERP Intellect Logo"
                width={220}
                height={65}
                className="h-10 sm:h-12 w-auto object-contain"
                priority
              />
            </Link>

            <span className="hidden sm:inline text-slate-300">|</span>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Official Credential Registry
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Institutional Ledger Verification Engine
              </span>
            </div>
          </div>

          {/* Quick Search in Navbar */}
          <form onSubmit={handleSearch} className="hidden md:flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Verify ID (e.g. aaaa-23e3-3d7b)"
                value={searchHash}
                onChange={(e) => setSearchHash(e.target.value)}
                className="h-9 w-64 pl-8 pr-3 text-xs rounded-lg bg-slate-50 border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 focus:bg-white font-mono transition-colors"
              />
            </div>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-9 text-xs border-amber-500 text-amber-700 hover:bg-amber-50 cursor-pointer font-semibold"
            >
              Verify
            </Button>
          </form>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Hub</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        
        {/* If certificate is valid and verified */}
        {cert ? (
          <div className="space-y-8">
            
            {/* Status Hero Banner (White / Emerald Accent Theme) */}
            <div className="relative overflow-hidden rounded-2xl border border-emerald-300/80 bg-gradient-to-r from-emerald-50/90 via-teal-50/40 to-white p-6 sm:p-7 shadow-sm">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                <div className="flex items-start gap-4">
                  <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 ring-4 ring-emerald-100 shrink-0">
                    <ShieldCheck className="w-7 h-7 stroke-[2.5]" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                        Official Verified Credential
                      </span>
                      <span className="text-xs text-slate-600 font-mono">
                        Hash: <strong className="text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{cert.hash}</strong>
                      </span>
                    </div>

                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-slate-900">
                      Verified Certificate of Completion
                    </h1>
                    
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                      This digital credential is authenticated directly against the ERP Intellect academic ledger. Issued to{" "}
                      <span className="font-bold text-slate-900 underline decoration-amber-500 underline-offset-2">{cert.studentName}</span> for demonstrated proficiency in{" "}
                      <span className="font-bold text-slate-900">{cert.courseTitle}</span> (Batch: {cert.batchCode}).
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="h-9 px-3.5 text-xs bg-white border-slate-300 hover:border-amber-500 hover:bg-amber-50/50 text-slate-800 gap-1.5 cursor-pointer shadow-xs font-medium"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="h-9 px-3.5 text-xs bg-white border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-800 gap-1.5 cursor-pointer shadow-xs font-medium"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-500" />
                    <span>Print</span>
                  </Button>

                  <Button
                    onClick={handleLinkedInShare}
                    className="h-9 px-4 text-xs font-bold bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-slate-950 gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 border-0"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share Credential</span>
                  </Button>
                </div>

              </div>
            </div>

            {/* Template Switcher: 3 Distinct Models */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-slate-800">
                  Select Certificate Design Model:
                </span>
                <span className="text-[10px] text-slate-500 hidden sm:inline">(3 Authentic Layouts)</span>
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                <button
                  onClick={() => setSelectedModel("classic")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedModel === "classic"
                      ? "bg-white text-amber-900 shadow-xs border border-amber-500/30 ring-1 ring-amber-400/40"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Model 1: Classic Heritage
                </button>

                <button
                  onClick={() => setSelectedModel("modern")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedModel === "modern"
                      ? "bg-white text-slate-900 shadow-xs border border-slate-800/40 ring-1 ring-slate-800/20"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Model 2: Modern Executive
                </button>

                <button
                  onClick={() => setSelectedModel("royal")}
                  className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    selectedModel === "royal"
                      ? "bg-white text-blue-950 shadow-xs border border-blue-900/40 ring-1 ring-blue-900/20"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Model 3: Royal Imperial
                </button>
              </div>
            </div>

            {/* Split Screen: Certificate Canvas & Verification Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Left Column: Photorealistic Certificate Canvas (lg:col-span-7) */}
              <div className="lg:col-span-7 space-y-4">
                
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-mono uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                    <FileBadge2 className="w-3.5 h-3.5 text-amber-600" />
                    Official Certificate Document
                  </span>
                  <span className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                    Cryptographically Tamper-Proof
                  </span>
                </div>

                {/* Printable Certificate Canvas */}
                <div id="printable-certificate" className="shadow-2xl rounded-2xl overflow-hidden">
                  <CertificateCanvas
                    model={selectedModel}
                    studentName={cert.studentName}
                    courseTitle={cert.courseTitle}
                    batchCode={cert.batchCode}
                    courseCode={cert.courseCode}
                    certifiedDate={cert.issueDate}
                    hash={cert.hash}
                    directorName={cert.directorName}
                    instructorName={cert.instructorName}
                    institutionName={cert.institutionName}
                    departmentName={cert.departmentName}
                    grade={cert.grade}
                    scorePercent={cert.scorePercent}
                    clickableQr={false}
                  />
                </div>

                {/* Action footer notice */}
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                  <span>Certificate ID: <strong className="font-mono text-slate-800">{cert.certificateId}</strong></span>
                  <button
                    onClick={handlePrint}
                    className="text-amber-700 hover:text-amber-800 font-medium underline underline-offset-4 cursor-pointer"
                  >
                    Open Clean Print View
                  </button>
                </div>

              </div>

              {/* Right Column: Detailed Credential Audit & Metadata (lg:col-span-5) */}
              <div className="lg:col-span-5 space-y-5">
                
                {/* 1. Academic Governance & Record Details */}
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Building className="w-4 h-4 text-amber-600" />
                      <span>Academic Governance &amp; Record</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    
                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Recipient Scholar</span>
                      <span className="font-bold text-slate-900">{cert.studentName}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Accredited Program</span>
                      <span className="font-bold text-slate-900 text-right">{cert.courseTitle}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Batch Code</span>
                      <span className="font-mono font-bold text-amber-700">{cert.batchCode}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Lead Faculty</span>
                      <span className="font-semibold text-slate-900">{cert.instructorName}</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Awarded Distinction</span>
                      <span className="font-bold text-emerald-700">{cert.grade} ({cert.scorePercent}%)</span>
                    </div>

                    <div className="flex justify-between py-1.5 border-b border-slate-100">
                      <span className="text-slate-500">Date Issued</span>
                      <span className="text-slate-800">{cert.issueDate}</span>
                    </div>

                    <div className="flex justify-between py-1.5">
                      <span className="text-slate-500">Accreditation</span>
                      <span className="text-slate-700 font-medium">{cert.accreditation}</span>
                    </div>

                  </CardContent>
                </Card>

                {/* 2. Cryptographic Security & Ledger */}
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-600" />
                      <span>Cryptographic Audit Trail</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3 text-xs">
                    
                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">Public Verification Hash</p>
                      <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-amber-900 font-bold">
                        <span>{cert.hash}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCopyLink}
                          className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-900 hover:bg-white"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-slate-500 mb-1">Blockchain Ledger Hash</p>
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-600 break-all">
                        {cert.blockchainHash}
                      </div>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-100 text-[11px]">
                      <span className="text-slate-500">Tamper-Proof Audit ID</span>
                      <span className="font-mono text-slate-800 font-medium">{cert.tamperProofAuditId}</span>
                    </div>

                    <div className="flex justify-between py-1 text-[11px]">
                      <span className="text-slate-500">Validation Authority</span>
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ERP Intellect Trust Node
                      </span>
                    </div>

                  </CardContent>
                </Card>

                {/* 3. Skills & Competencies Validated */}
                <Card className="border-slate-200 bg-white shadow-sm">
                  <CardHeader className="pb-3 border-b border-slate-100">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>Skills &amp; Competencies Validated</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {cert.skills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Graduation Criteria Satisfied
                      </p>
                      {cert.criteriaFulfilled.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-slate-700 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>

          </div>
        ) : (
          
          /* If hash is not found or invalid */
          <div className="max-w-xl mx-auto py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">Certificate Credential Not Found</h1>
              <p className="text-sm text-slate-600">
                We could not locate an authentic certificate matching the verification hash:
              </p>
              <div className="inline-block px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-sm text-slate-900 font-bold">
                {initialHash || "None provided"}
              </div>
            </div>

            {/* Quick action to try sample certificates */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-left space-y-3 shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Verified Sample Credentials
              </span>
              <p className="text-xs text-slate-600">
                Click to inspect verified certificates with complete curriculum records:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Button
                  onClick={() => router.push("/verify/aaaa-23e3-3d7b")}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-9 cursor-pointer border-0"
                >
                  Verify: sanjay (ERP)
                </Button>
                <Button
                  onClick={() => router.push("/verify/c7f4-8a12-901d")}
                  variant="outline"
                  className="border-slate-300 text-slate-800 hover:bg-slate-50 font-bold text-xs h-9 cursor-pointer"
                >
                  Verify: David Miller (FSD)
                </Button>
              </div>
            </div>

            {/* Lookup Input */}
            <form onSubmit={handleSearch} className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Enter certificate hash or ID..."
                  value={searchHash}
                  onChange={(e) => setSearchHash(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:border-amber-500 font-mono"
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                className="w-full h-10 border-slate-300 text-slate-800 hover:bg-slate-100 text-xs font-bold cursor-pointer"
              >
                Look Up Credential
              </Button>
            </form>

            <div>
              <Link
                href="/verify"
                className="text-xs text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-4"
              >
                Go to Credential Verification Portal
              </Link>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>
          &copy; 2026 ERP Intellect Academy &amp; Ecosystem. All credentials are cryptographically secured and digitally authenticated.
        </p>
      </footer>

    </div>
  )
}
