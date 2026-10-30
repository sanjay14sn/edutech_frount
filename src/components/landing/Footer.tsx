"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
// Brand icons implemented directly as SVG components because lucide-react does not include 3rd-party brand logos
function LinkedinIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />

    </svg>
  )
}

function YoutubeIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <polygon points="10 15 15 12 10 9 10 15" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function TwitterIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
    </svg>
  )
}

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

export function Footer() {
  return (
    <footer id="footer" className="bg-[#050e1f] text-slate-400 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 pb-12 border-b border-slate-800/80">

          {/* Col 1: Brand & Description (4 cols) */}
          <div className="lg:col-span-4 space-y-4">
            <Link href="/" className="inline-flex items-center group">
              <div className="bg-white px-4 py-2 rounded-2xl shadow-md hover:opacity-95 transition-opacity">
                <Image
                  src="/erplogo.png"
                  alt="ERP Intellect"
                  width={240}
                  height={80}
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </div>
            </Link>

            <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
              Empowering institutions and modern businesses with next-generation automated ERP workflows, AI-assisted counseling, and unified administrative governance.
            </p>
          </div>

          {/* Col 2: Products (3 cols) */}
          <div className="lg:col-span-3">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Products
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">Education ERP</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">CRM</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">AI Sales Assistant</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">Accounts &amp; Finance</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">LMS</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">HRMS</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">Placement OS</Link>
              </li>
              <li>
                <Link href="#products" className="hover:text-cyan-400 transition">Custom Modules</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Company (2 cols) */}
          <div className="lg:col-span-2">
            <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <Link href="#about" className="hover:text-cyan-400 transition">About Us</Link>
              </li>
              <li>
                <Link href="#careers" className="hover:text-cyan-400 transition">Careers</Link>
              </li>
              <li>
                <Link href="#blog" className="hover:text-cyan-400 transition">Blog</Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-cyan-400 transition">Contact Us</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Follow Us & Powered By (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            <div>
              <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-wider">
                Follow Us
              </h4>
              <div className="flex items-center gap-2.5">
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="LinkedIn"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-sky-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <LinkedinIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="YouTube"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <YoutubeIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Twitter"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-sky-500 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <TwitterIcon className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Instagram"
                  className="w-8 h-8 rounded-full bg-slate-800 hover:bg-pink-600 text-slate-300 hover:text-white flex items-center justify-center transition"
                >
                  <InstagramIcon className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Powered by ERP HUB Technologies */}
            <div className="pt-2">
              <div className="text-[11px] text-slate-400 mb-1.5 flex items-center gap-1.5">
                <span>Powered by</span>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs font-semibold">
                <div className="w-4 h-4 rounded-full bg-sky-500/20 text-cyan-400 flex items-center justify-center text-[10px]">
                  ⬡
                </div>
                <span>ERP HUB Technologies</span>
              </div>
            </div>

          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2026 ERPIntellect. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <Link href="#privacy" className="hover:text-slate-400 transition">Privacy Policy</Link>
            <span>|</span>
            <Link href="#terms" className="hover:text-slate-400 transition">Terms &amp; Conditions</Link>
          </div>
        </div>

      </div>
    </footer>
  )
}
