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
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div
                className={`border-8 border-double p-6 rounded-lg bg-card text-center space-y-4 ${
                  isEligible ? "border-amber-500/30" : "border-border/40 opacity-70"
                }`}
              >
                <span className="text-[10px] font-mono tracking-widest text-amber-500 uppercase block">
                  Certificate of Completion
                </span>
                <div className="space-y-2">
                  <h3 className="text-lg font-serif italic text-foreground">{studentName}</h3>
                  <p className="text-xs text-muted-foreground px-6 leading-relaxed">
                    has successfully fulfilled all required curriculum, assignments, and evaluations for
                  </p>
                  <p className="font-bold text-sm text-foreground">{courseName}</p>
                </div>
                <div className="flex justify-between items-end pt-4 text-left border-t border-border/50 text-[10px]">
                  <div>
                    <p className="text-muted-foreground">
                      Certified Date: <strong>{isEligible ? certifiedDate : "Pending"}</strong>
                    </p>
                    <p className="text-muted-foreground">
                      Batch: <strong>{studentBatch.code}</strong>
                    </p>
                  </div>
                  <div className="w-14 h-14 bg-zinc-950 border border-zinc-800 p-1 flex items-center justify-center rounded">
                    <div className="grid grid-cols-4 gap-0.5 w-full h-full opacity-80">
                      {Array.from({ length: 16 }).map((_, i) => (
                        <div
                          key={i}
                          className={`rounded-xs ${i % 3 === 0 || i % 7 === 0 ? "bg-white" : "bg-transparent"}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  className="text-xs h-9 flex items-center gap-1.5"
                  disabled={!isEligible}
                  onClick={() => window.print()}
                >
                  <Download className="h-4 w-4" /> Download PDF Certificate
                </Button>
                <Button
                  variant="primary"
                  className="text-xs h-9 flex items-center gap-1.5"
                  disabled={!isEligible}
                  onClick={() =>
                    alert("Verification link copied! Share: " + window.location.origin + "/certification")
                  }
                >
                  <ExternalLink className="h-4 w-4" /> Copy Verification Link
                </Button>
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
