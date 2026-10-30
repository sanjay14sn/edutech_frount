"use client"

import * as React from "react"
import { Award, Download, ExternalLink, CheckCircle2, Clock, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useStore } from "@/store/useStore"
import { api } from "@/lib/api"
import { formatDate } from "@/lib/utils"
import { mapBatchToCourseLMS, canStudentAccessCourse, studentNameInBatch } from "@/lib/lms"
import { generateStudentCertHash, saveCertificateToRegistry, type CertificateModelType } from "@/lib/certificates"
import { CertificateCanvas } from "@/components/certificate/CertificateCanvas"
import Link from "next/link"

export default function CertificationPage() {
  const router = useRouter()
  const { user } = useStore()
  const [student, setStudent] = React.useState<any>(null)
  const [batches, setBatches] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const load = async () => {
      if (!user?.id) return
      try {
        const [profileData, batchesData] = await Promise.all([
          api.getStudentProfile().catch(() => null),
          api.getBatches().catch(() => []),
        ])
        setStudent(
          profileData || {
            name: user?.name || "Student",
            email: user?.email,
            course: "",
          }
        )
        setBatches(batchesData || [])
      } catch {
        // keep empty state
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.id, user?.name, user?.email])

  const studentBatch = React.useMemo(() => {
    const studentName = student?.name || user?.name
    if (!studentName || !batches.length) return null
    return batches.find((batch: any) => studentNameInBatch(batch, studentName)) || null
  }, [student, user?.name, batches])

  const studentLmsCourse = React.useMemo(() => {
    if (!studentBatch || !student) return null
    const course = mapBatchToCourseLMS(studentBatch)
    if (!canStudentAccessCourse(course, student.name)) return null
    return course
  }, [studentBatch, student])

  const isBatchCompleted = studentBatch?.status === "completed"
  const isCourseCompleted = student?.status === "completed"
  const isEligible = isBatchCompleted || isCourseCompleted
  const courseName = studentBatch?.courseName || student?.course || "Your Course"
  const studentName = student?.name || user?.name || "Student Name"
  const certifiedDate = studentBatch?.completedAt
    ? formatDate(studentBatch.completedAt)
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })

  const certHash = React.useMemo(() => {
    return generateStudentCertHash(studentName, studentBatch?.code || "Apex-B12")
  }, [studentName, studentBatch?.code])
  const [certCopied, setCertCopied] = React.useState(false)
  const [certModel, setCertModel] = React.useState<CertificateModelType>("classic")

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-sm text-muted-foreground">
        Loading certification details...
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
          <Award className="h-6 w-6 text-amber-500" />
          Certification
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          View eligibility, download your course certificate, and share verification links.
        </p>
      </div>

      {!studentBatch ? (
        <Card>
          <CardContent className="py-10 text-center space-y-3">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm font-semibold text-foreground">No active batch found</p>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              You need to be allocated to a batch before certification can be issued. Contact your counselor for batch assignment.
            </p>
            <Button variant="outline" size="sm" onClick={() => router.push("/dashboard")}>
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className={isEligible ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/20 bg-amber-500/5"}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                {isEligible ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Clock className="h-4 w-4 text-amber-500" />
                )}
                {isEligible ? "Certificate Ready" : "Certification In Progress"}
              </CardTitle>
              <CardDescription className="text-xs">
                {isEligible
                  ? `Your batch ${studentBatch.code} for ${courseName} is completed. Your certificate is available below.`
                  : "Complete your batch and meet all course requirements to unlock your certificate."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              <div className="flex flex-wrap gap-2">
                <Badge variant={isBatchCompleted ? "success" : "outline"}>
                  Batch {isBatchCompleted ? "Completed" : "Active"}
                </Badge>
                {studentBatch.code && <Badge variant="outline">{studentBatch.code}</Badge>}
                {studentLmsCourse && <Badge variant="outline">LMS Access</Badge>}
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border/80 text-center">
              <Award className="h-10 w-10 text-amber-500 mx-auto" />
              <CardTitle className="text-base font-bold text-foreground mt-2">Course Certificate</CardTitle>
              <CardDescription className="text-xs">
                {isEligible
                  ? "Verified certificate of completion for your enrolled course."
                  : "Certificate preview — available once your batch is marked completed."}
              </CardDescription>

              {/* Design Model Selector */}
              <div className="flex items-center justify-center gap-1.5 pt-3">
                <button
                  type="button"
                  onClick={() => setCertModel("classic")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    certModel === "classic"
                      ? "bg-amber-500 text-slate-950 shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Model 1: Classic
                </button>
                <button
                  type="button"
                  onClick={() => setCertModel("modern")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    certModel === "modern"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Model 2: Modern
                </button>
                <button
                  type="button"
                  onClick={() => setCertModel("royal")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    certModel === "royal"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Model 3: Royal
                </button>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6 space-y-6 bg-slate-100/50 dark:bg-slate-900/30">
              <div id="printable-certificate" className="shadow-xl rounded-2xl overflow-hidden">
                <CertificateCanvas
                  model={certModel}
                  studentName={studentName}
                  courseTitle={courseName}
                  batchCode={studentBatch.code || "Apex-B12"}
                  courseCode={studentBatch.code}
                  certifiedDate={isEligible ? certifiedDate : "Pending"}
                  hash={certHash}
                  directorName="Dr. R. K. Vance"
                  instructorName={studentBatch.trainerName || "Lead Instructor"}
                  clickableQr={true}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  className="text-xs h-9 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  disabled={!isEligible}
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4" /> Download PDF Certificate
                </Button>

                <Button
                  variant="primary"
                  className="text-xs h-9 flex items-center gap-1.5 cursor-pointer shadow-xs"
                  disabled={!isEligible}
                  onClick={() => {
                    const params = new URLSearchParams({
                      student: studentName,
                      course: courseName,
                      batch: studentBatch.code || "Apex-B12",
                      instructor: studentBatch.trainerName || "Lead Instructor",
                      model: certModel
                    })
                    const url = `${window.location.origin}/verify/${certHash}?${params.toString()}`

                    saveCertificateToRegistry({
                      hash: certHash,
                      certificateId: `CERT-2026-${(studentBatch.code || "BATCH").toUpperCase()}`,
                      studentName,
                      courseTitle: courseName,
                      courseCode: studentBatch.code || "ERP",
                      batchCode: studentBatch.code || "Apex-B12",
                      issueDate: isEligible ? certifiedDate : "May 27, 2026",
                      completionDate: isEligible ? certifiedDate : "May 26, 2026",
                      status: "verified",
                      grade: "Distinction with Honors",
                      scorePercent: 98.4,
                      instructorName: studentBatch.trainerName || "Lead Instructor",
                      directorName: "Dr. R. K. Vance",
                      institutionName: "ERP INTELLECT ACADEMY & ECOSYSTEM",
                      departmentName: "Center of Excellence & Academic Governance",
                      accreditation: "ISO/IEC 17024 Academic & Industry Standard",
                      skills: ["Enterprise Systems", "Curriculum Fulfillment", "Applied Technology"],
                      credentialUrl: url,
                      blockchainHash: `0x${certHash.replace(/-/g, "")}7f9a2b8e4c1d6e3f5a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d`,
                      tamperProofAuditId: `AUD-SEC-${certHash.slice(0, 4).toUpperCase()}`,
                      criteriaFulfilled: [
                        "100% Core Video Curricula & Practical Labs Completed",
                        "Final Capstone Project Evaluation: Grade A+",
                        "Comprehensive Real-Time Online Coding Evaluation Passed"
                      ],
                      preferredModel: certModel
                    })

                    if (navigator?.clipboard?.writeText) {
                      navigator.clipboard.writeText(url)
                    }
                    setCertCopied(true)
                    setTimeout(() => setCertCopied(false), 2500)
                  }}
                >
                  <ExternalLink className="h-4 w-4" /> {certCopied ? "Link Copied!" : "Copy Verification Link"}
                </Button>

                <Link
                  href={`/verify/${certHash}?student=${encodeURIComponent(studentName)}&course=${encodeURIComponent(courseName)}&batch=${encodeURIComponent(studentBatch.code || "Apex-B12")}&instructor=${encodeURIComponent(studentBatch.trainerName || "Lead Instructor")}&model=${certModel}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`h-9 text-xs px-3 rounded-lg border border-border/80 bg-card hover:bg-muted/40 hover:border-amber-500/60 hover:text-amber-500 flex items-center justify-center gap-1.5 shadow-2xs font-semibold transition-colors ${
                    !isEligible ? "pointer-events-none opacity-50" : ""
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Verify Page</span>
                </Link>
              </div>

              {!isEligible && (
                <p className="text-[10px] text-center text-muted-foreground">
                  Certificate download unlocks when your trainer marks the batch as completed.
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
