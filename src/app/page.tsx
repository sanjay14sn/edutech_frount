"use client"

import * as React from "react"
import { Navbar } from "@/components/landing/Navbar"
import { HeroSection } from "@/components/landing/HeroSection"
import { ProductSuiteSection } from "@/components/landing/ProductSuiteSection"
import { IndustriesSection } from "@/components/landing/IndustriesSection"
import { WhyChooseSection } from "@/components/landing/WhyChooseSection"
import { TestimonialsSection } from "@/components/landing/TestimonialsSection"
import { CtaSection } from "@/components/landing/CtaSection"
import { Footer } from "@/components/landing/Footer"
import { DemoModal } from "@/components/landing/DemoModal"

export default function LandingPage() {
  const [demoModalOpen, setDemoModalOpen] = React.useState(false)

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar onOpenDemo={() => setDemoModalOpen(true)} />

      {/* Main Landing Page Sections */}
      <main className="flex-1">
        <HeroSection onOpenDemo={() => setDemoModalOpen(true)} />
        <ProductSuiteSection />
        <IndustriesSection />
        <WhyChooseSection />
        <TestimonialsSection />
        <CtaSection onOpenDemo={() => setDemoModalOpen(true)} />
      </main>

      {/* Footer */}
      <Footer />

      {/* Demo Walkthrough & Booking Modal */}
      <DemoModal 
        isOpen={demoModalOpen} 
        onClose={() => setDemoModalOpen(false)} 
      />
    </div>
  )
}
