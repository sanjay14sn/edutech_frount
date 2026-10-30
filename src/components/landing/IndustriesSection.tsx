"use client"

import * as React from "react"
import Image from "next/image"
import { 
  GraduationCap, 
  Building2, 
  Heart, 
  HeartHandshake
} from "lucide-react"

const industries = [
  {
    id: "education",
    title: "Education",
    icon: GraduationCap,
    iconColor: "text-sky-600 bg-sky-50",
    lines: [
      "Schools | Colleges | Universities",
      "Training Institutes"
    ]
  },
  {
    id: "business",
    title: "Business",
    icon: Building2,
    iconColor: "text-teal-600 bg-teal-50",
    lines: [
      "SMEs | Retail | Manufacturing",
      "Services | Trading"
    ]
  },
  {
    id: "healthcare",
    title: "Healthcare",
    icon: Heart,
    iconColor: "text-emerald-600 bg-emerald-50",
    lines: [
      "Hospitals | Clinics | Diagnostic Centers",
      "Healthcare Services"
    ]
  },
  {
    id: "non-profit",
    title: "Non-Profit",
    icon: HeartHandshake,
    iconColor: "text-purple-600 bg-purple-50",
    lines: [
      "NGOs | Trusts | Foundations",
      "Social Organizations"
    ]
  }
]

export function IndustriesSection() {
  return (
    <section id="industries" className="py-20 lg:py-24 bg-slate-50/60 relative overflow-hidden border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-bold tracking-widest text-sky-600 uppercase">
            INDUSTRIES WE SERVE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Built for Every Sector
          </h2>
          <p className="text-slate-600 text-base sm:text-lg mt-3 leading-relaxed">
            Whether you run an educational institution, a business or an enterprise, ERPIntellect adapts to your needs.
          </p>
        </div>

        {/* Content Grid: 4 Cards on Left, Person Photo on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* 4 Cards (2x2 Grid) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-5">
            {industries.map((item) => {
              const Icon = item.icon
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs hover:shadow-lg hover:border-sky-300 transition-all duration-300 group"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconColor} mb-4 group-hover:scale-105 transition-transform`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  
                  <h3 className="text-lg font-bold text-slate-900 mb-2">
                    {item.title}
                  </h3>
                  
                  <div className="space-y-1 text-xs text-slate-500 font-medium">
                    {item.lines.map((line, idx) => (
                      <div key={idx} className="leading-snug">
                        {line}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Right: Smiling Businesswoman Image + Floating Graphic */}
          <div className="lg:col-span-5 relative flex justify-center">
            
            {/* Woman portrait card */}
            <div className="relative w-full max-w-[420px] aspect-[4/3] rounded-3xl overflow-hidden shadow-2xl border-4 border-white ring-1 ring-slate-200/80">
              <Image
                src="/images/industries-woman.jpg"
                alt="ERPIntellect operations professional"
                fill
                className="object-cover object-top hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
