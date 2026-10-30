"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Award, CheckCircle2, ShieldCheck, QrCode, ExternalLink, Sparkles } from "lucide-react"
import { CertificateModelType } from "@/lib/certificates"

export interface CertificateCanvasProps {
  model: CertificateModelType
  studentName: string
  courseTitle: string
  batchCode: string
  courseCode?: string
  certifiedDate: string
  hash: string
  directorName: string
  instructorName: string
  institutionName?: string
  departmentName?: string
  scorePercent?: number
  grade?: string
  clickableQr?: boolean
}

export function CertificateCanvas({
  model = "classic",
  studentName,
  courseTitle,
  batchCode,
  courseCode,
  certifiedDate,
  hash,
  directorName,
  instructorName,
  institutionName = "ERP INTELLECT ACADEMY & ECOSYSTEM",
  departmentName = "Center of Excellence & Academic Governance",
  scorePercent = 98.4,
  grade = "Distinction with Honors",
  clickableQr = true,
}: CertificateCanvasProps) {
  const verifyUrl = `/verify/${hash}`

  // Render QR Code block
  const qrBlock = (
    <div className="flex flex-col items-center shrink-0">
      <div className="w-14 h-14 bg-white p-1 rounded-lg border-2 border-slate-300 shadow-xs flex items-center justify-center">
        <div className="grid grid-cols-4 gap-0.5 w-full h-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-xs ${
                i % 3 === 0 || i % 7 === 0 || i === 0 || i === 15
                  ? "bg-slate-900"
                  : "bg-transparent"
              }`}
            />
          ))}
        </div>
      </div>
      <span className="text-[8px] font-mono text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-0.5">
        Scan to Verify
      </span>
    </div>
  )

  /* ========================================================================= */
  /* MODEL 1: CLASSIC HERITAGE (Ivy League Gold & Traditional Filigree)         */
  /* ========================================================================= */
  if (model === "classic") {
    return (
      <div className="w-full relative bg-[#fffdf9] text-slate-900 p-6 sm:p-10 rounded-2xl border-4 border-amber-600/40 shadow-xl overflow-hidden transition-all">
        {/* Concentric Inner Ornate Border */}
        <div className="absolute inset-2 sm:inset-3 border-2 border-amber-500/40 rounded-xl pointer-events-none" />
        <div className="absolute inset-3 sm:inset-4 border border-dashed border-amber-500/30 rounded-lg pointer-events-none" />

        {/* Corner Ornate Accents */}
        <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-amber-600/80 pointer-events-none" />
        <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-amber-600/80 pointer-events-none" />
        <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-amber-600/80 pointer-events-none" />
        <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-amber-600/80 pointer-events-none" />

        {/* Watermark Crest Emblem */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.035] pointer-events-none select-none">
          <Award className="w-80 h-80 text-amber-700" />
        </div>

        <div className="relative z-10 text-center space-y-4">
          
          {/* Top Logo & Institutional Branding */}
          <div className="flex flex-col items-center">
            <div className="h-12 sm:h-14 mb-2 flex items-center justify-center">
              <Image
                src="/erplogo.png"
                alt="ERP Intellect Logo"
                width={200}
                height={60}
                className="h-10 sm:h-12 w-auto object-contain"
                priority
              />
            </div>
            <span className="text-[10.5px] sm:text-xs font-bold tracking-[0.25em] text-amber-800 uppercase">
              {institutionName}
            </span>
            <span className="text-[9px] tracking-wider text-slate-500 uppercase mt-0.5">
              {departmentName}
            </span>
          </div>

          {/* Certificate Title */}
          <div className="pt-1">
            <div className="h-px w-28 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent mx-auto mb-2" />
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black tracking-widest text-slate-900 uppercase">
              Certificate of Completion
            </h2>
            <div className="h-px w-28 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent mx-auto mt-2" />
          </div>

          {/* Recipient Statement */}
          <div className="space-y-1.5 pt-1">
            <p className="text-xs text-slate-600 font-serif italic">
              This is to formally certify that
            </p>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold italic tracking-wide text-amber-900 py-1">
              {studentName}
            </h3>
            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              has successfully fulfilled all required curriculum standards, lab milestones, assignments, and coding evaluations for the program
            </p>
            <p className="text-base sm:text-lg font-bold tracking-tight text-slate-950 pt-1">
              {courseTitle}
            </p>
            <span className="inline-block text-[11px] font-mono text-slate-700 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
              Batch: <strong>{batchCode}</strong>
              {courseCode ? ` · Course Code: ${courseCode}` : ""}
            </span>
          </div>

          {/* Bottom Signatures & Verification Details */}
          <div className="pt-6 border-t border-amber-600/30 flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
            
            {/* Issued Details */}
            <div className="space-y-1 text-center sm:text-left">
              <p className="text-[10px] text-slate-600">
                Certified Date: <strong className="text-slate-900">{certifiedDate}</strong>
              </p>
              <p className="text-[10px] text-slate-600">
                Verification Hash:{" "}
                <span className="font-mono text-[10px] bg-amber-600/15 px-1.5 py-0.5 rounded text-amber-900 font-bold">
                  {hash}
                </span>
              </p>
              <p className="text-[9.5px] text-emerald-700 font-semibold flex items-center justify-center sm:justify-start gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Digitally Authenticated Record
              </p>
            </div>

            {/* Signatures */}
            <div className="flex items-center gap-6 text-center">
              <div className="space-y-1">
                <div className="font-serif italic text-base text-amber-900 h-6 flex items-center justify-center">
                  {directorName}
                </div>
                <div className="h-px w-28 bg-slate-400" />
                <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
                  Academic Director
                </p>
              </div>

              <div className="space-y-1">
                <div className="font-serif italic text-base text-amber-900 h-6 flex items-center justify-center">
                  {instructorName}
                </div>
                <div className="h-px w-28 bg-slate-400" />
                <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
                  Lead Instructor
                </p>
              </div>
            </div>

            {/* QR Code */}
            {clickableQr ? (
              <Link
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer hover:opacity-90 transition-opacity"
                title="Click to open verification page"
              >
                {qrBlock}
              </Link>
            ) : (
              qrBlock
            )}

          </div>

        </div>
      </div>
    )
  }

  /* ========================================================================= */
  /* MODEL 2: MODERN EXECUTIVE (Contemporary Tech Frame & Precision Borders)   */
  /* ========================================================================= */
  if (model === "modern") {
    return (
      <div className="w-full relative bg-white text-slate-900 p-6 sm:p-9 rounded-2xl border-2 border-slate-800 shadow-xl overflow-hidden transition-all">
        {/* Subtle geometric grid background */}
        <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(#0f172a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        {/* Sleek Inner Border */}
        <div className="absolute inset-3 border border-slate-200 rounded-xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          
          {/* Top Modern Header with Logo and ISO Badge */}
          <div className="flex flex-col sm:flex-row items-center justify-between pb-3 border-b border-slate-200 gap-3">
            <div className="flex items-center gap-3">
              <Image
                src="/erplogo.png"
                alt="ERP Intellect Logo"
                width={190}
                height={55}
                className="h-9 sm:h-11 w-auto object-contain"
                priority
              />
              <div className="hidden sm:block h-7 w-px bg-slate-200" />
              <div className="hidden sm:block text-left">
                <p className="text-[10px] font-bold text-slate-900 uppercase tracking-widest leading-none">
                  ACADEMIC ECOSYSTEM
                </p>
                <p className="text-[8.5px] text-slate-500 font-mono mt-0.5">
                  ISO/IEC 17024 STANDARDS
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Verified Tech Credential
              </span>
            </div>
          </div>

          {/* Certificate Main Title */}
          <div className="text-center pt-2">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 font-semibold">
              Official Academic Attestation
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 mt-1 uppercase">
              Certificate of Excellence
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              For distinguished accomplishment and successful mastery of competencies in
            </p>
          </div>

          {/* Recipient Showcase */}
          <div className="text-center py-2 space-y-2">
            <div className="inline-block relative">
              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-slate-900 px-4">
                {studentName}
              </h3>
              <div className="h-1 w-24 bg-gradient-to-r from-emerald-500 to-amber-500 mx-auto rounded-full mt-1.5" />
            </div>

            <p className="text-base sm:text-lg font-bold text-slate-800">
              {courseTitle}
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px] font-medium border border-slate-200">
                Batch: {batchCode}
              </span>
              <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200">
                Performance: {grade} ({scorePercent}%)
              </span>
            </div>
          </div>

          {/* Verification Spec Matrix */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left text-xs">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Certified Date</p>
              <p className="font-semibold text-slate-900 text-[11px] mt-0.5">{certifiedDate}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Verification Hash</p>
              <p className="font-mono font-bold text-slate-900 text-[11px] mt-0.5">{hash}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Lead Faculty</p>
              <p className="font-semibold text-slate-900 text-[11px] mt-0.5">{instructorName}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">Director</p>
              <p className="font-semibold text-slate-900 text-[11px] mt-0.5">{directorName}</p>
            </div>
          </div>

          {/* Footer Bar with Signatures and QR Code */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200">
            <div className="flex items-center gap-6 text-center sm:text-left">
              <div>
                <div className="font-serif italic text-base text-slate-800 font-bold h-6">
                  {directorName}
                </div>
                <div className="h-px w-28 bg-slate-300" />
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                  Academic Director
                </span>
              </div>

              <div>
                <div className="font-serif italic text-base text-slate-800 font-bold h-6">
                  {instructorName}
                </div>
                <div className="h-px w-28 bg-slate-300" />
                <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mt-0.5">
                  Lead Instructor
                </span>
              </div>
            </div>

            {/* QR Block */}
            {clickableQr ? (
              <Link
                href={verifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group cursor-pointer hover:opacity-90 transition-opacity"
              >
                {qrBlock}
              </Link>
            ) : (
              qrBlock
            )}
          </div>

        </div>
      </div>
    )
  }

  /* ========================================================================= */
  /* MODEL 3: ROYAL IMPERIAL (Prestige Royal Blue & Burnished Gold Seal)       */
  /* ========================================================================= */
  return (
    <div className="w-full relative bg-gradient-to-br from-white via-slate-50/70 to-blue-50/30 text-slate-900 p-6 sm:p-10 rounded-2xl border-4 border-blue-950 shadow-2xl overflow-hidden transition-all">
      {/* Outer Golden Trim Ring */}
      <div className="absolute inset-2 border-2 border-amber-500/70 rounded-xl pointer-events-none" />
      <div className="absolute inset-3 border border-indigo-900/30 rounded-lg pointer-events-none" />

      {/* Royal Corner Filigrees */}
      <div className="absolute top-3 left-3 w-7 h-7 border-t-3 border-l-3 border-amber-500 pointer-events-none" />
      <div className="absolute top-3 right-3 w-7 h-7 border-t-3 border-r-3 border-amber-500 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-7 h-7 border-b-3 border-l-3 border-amber-500 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-7 h-7 border-b-3 border-r-3 border-amber-500 pointer-events-none" />

      <div className="relative z-10 text-center space-y-4">
        
        {/* Royal Crest & Logo */}
        <div className="flex flex-col items-center">
          <div className="h-12 sm:h-14 mb-1.5 flex items-center justify-center">
            <Image
              src="/erplogo.png"
              alt="ERP Intellect Logo"
              width={210}
              height={65}
              className="h-11 sm:h-13 w-auto object-contain"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="h-px w-10 bg-amber-500" />
            <span className="text-[10px] sm:text-[11px] font-extrabold tracking-[0.25em] text-blue-950 uppercase">
              PRESIDENTIAL ACADEMIC HONORS
            </span>
            <div className="h-px w-10 bg-amber-500" />
          </div>
          <p className="text-[8.5px] uppercase tracking-widest text-slate-500 mt-0.5">
            Board of Academic Governance &amp; Institutional Oversight
          </p>
        </div>

        {/* Diploma Title */}
        <div className="pt-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-serif font-black tracking-widest text-blue-950 uppercase">
            Diploma of Higher Accomplishment
          </h2>
          <p className="text-xs text-slate-600 font-serif italic mt-1">
            Let it be recognized throughout the academic and professional sphere that
          </p>
        </div>

        {/* Recipient */}
        <div className="space-y-1 py-1">
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-black italic tracking-wide text-indigo-950 py-1">
            {studentName}
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            has with commendable diligence fulfilled all requirements, practical assessments, and comprehensive milestones for the curriculum
          </p>
          <p className="text-base sm:text-lg font-extrabold text-blue-950 pt-1">
            {courseTitle}
          </p>
          <div className="inline-flex items-center gap-2 mt-1">
            <span className="text-[10.5px] font-mono text-blue-900 bg-blue-100/60 px-2.5 py-0.5 rounded border border-blue-200">
              Batch: <strong>{batchCode}</strong>
            </span>
            <span className="text-[10.5px] text-amber-800 bg-amber-100/60 px-2.5 py-0.5 rounded border border-amber-200 font-semibold">
              ★ {grade}
            </span>
          </div>
        </div>

        {/* Centerpiece Golden Rosette / Medallion */}
        <div className="flex justify-center py-1">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/15 via-yellow-400/20 to-amber-500/15 border border-amber-500/30 text-amber-900 text-[10px] font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Honors Degree of Completion · Digitally Signed</span>
          </div>
        </div>

        {/* Bottom Signatures & QR Code */}
        <div className="pt-5 border-t border-indigo-900/20 flex flex-col sm:flex-row items-center justify-between gap-5 text-left">
          
          <div className="space-y-1 text-center sm:text-left">
            <p className="text-[10px] text-slate-600">
              Certified Date: <strong className="text-slate-900">{certifiedDate}</strong>
            </p>
            <p className="text-[10px] text-slate-600">
              Verification Hash:{" "}
              <span className="font-mono text-[10px] bg-blue-950/10 px-1.5 py-0.5 rounded text-blue-950 font-bold">
                {hash}
              </span>
            </p>
            <p className="text-[9.5px] text-emerald-700 font-semibold flex items-center justify-center sm:justify-start gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Cryptographic Trust Node Certified
            </p>
          </div>

          <div className="flex items-center gap-6 text-center">
            <div className="space-y-1">
              <div className="font-serif italic text-base text-blue-950 font-bold h-6">
                {directorName}
              </div>
              <div className="h-px w-28 bg-slate-400" />
              <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
                Academic Director
              </p>
            </div>

            <div className="space-y-1">
              <div className="font-serif italic text-base text-blue-950 font-bold h-6">
                {instructorName}
              </div>
              <div className="h-px w-28 bg-slate-400" />
              <p className="text-[9px] text-slate-600 uppercase tracking-wider font-semibold">
                Lead Instructor
              </p>
            </div>
          </div>

          {clickableQr ? (
            <Link
              href={verifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group cursor-pointer hover:opacity-90 transition-opacity"
            >
              {qrBlock}
            </Link>
          ) : (
            qrBlock
          )}

        </div>

      </div>
    </div>
  )
}
