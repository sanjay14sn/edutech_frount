import type { Metadata } from "next"
import { getCertificateByHash } from "@/lib/certificates"
import { VerifyCertificateClient } from "./VerifyCertificateClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const cert = getCertificateByHash(id)

  if (cert) {
    return {
      title: `Verified Certificate — ${cert.studentName} | ${cert.courseTitle}`,
      description: `Official digital credential issued to ${cert.studentName} for completion of ${cert.courseTitle} (${cert.batchCode}) at ERP Intellect Academy.`,
      openGraph: {
        title: `Verified Certificate — ${cert.studentName}`,
        description: `Official credential authenticated on the ERP Intellect academic ledger. Hash: ${cert.hash}`,
      },
    }
  }

  return {
    title: "Certificate Verification | ERP Intellect Academy",
    description: "Verify authentic academic credentials and certificates issued by ERP Intellect Academy.",
  }
}

export default async function VerifyPage({ params }: PageProps) {
  const { id } = await params

  return <VerifyCertificateClient initialHash={id} />
}
