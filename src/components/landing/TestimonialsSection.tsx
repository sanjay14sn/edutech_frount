"use client"

import * as React from "react"
import Image from "next/image"
import { Quote, Star } from "lucide-react"

const testimonials = [
  {
    quote: "ERPIntellect has transformed the way we manage our institution. The platform is easy to use, powerful and the support team is outstanding.",
    name: "Dr. Anjali Sharma",
    role: "Principal, Sunrise International School",
    avatar: "/images/anjali-sharma.jpg",
    rating: 5
  },
  {
    quote: "The CRM and AI Sales Assistant have significantly improved our lead conversion and enrolments. Highly recommended!",
    name: "Rahul Mehta",
    role: "Director, Global Education Solutions",
    avatar: "/images/rahul-mehta.jpg",
    rating: 5
  },
  {
    quote: "A complete ERP solution for our business. It has streamlined our operations and saved us hours of manual work.",
    name: "Priya Nair",
    role: "CEO, NextGen Enterprises",
    avatar: "/images/priya-nair.jpg",
    rating: 5
  }
]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="py-20 lg:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-14">
          <span className="text-xs font-bold tracking-widest text-sky-600 uppercase">
            WHAT OUR CLIENTS SAY
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Trusted by Institutions &amp; Businesses Worldwide
          </h2>
        </div>

        {/* 3 Testimonial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-7 flex flex-col justify-between hover:border-sky-300 hover:shadow-lg transition-all duration-300 relative group"
            >
              <div>
                {/* Quotation Icon */}
                <div className="text-sky-500/20 group-hover:text-sky-500/30 transition-colors mb-3">
                  <Quote className="w-10 h-10 fill-current" />
                </div>

                {/* Rating stars */}
                <div className="flex items-center gap-1 mb-4 text-amber-400">
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-current" />
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-slate-600 text-sm leading-relaxed mb-6 font-normal">
                  &ldquo;{item.quote}&rdquo;
                </p>
              </div>

              {/* Author Info with Avatar */}
              <div className="flex items-center gap-3.5 pt-4 border-t border-slate-200/60">
                <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-sky-500/20 shrink-0">
                  <Image
                    src={item.avatar}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {item.name}
                  </h4>
                  <p className="text-xs text-slate-500 font-medium">
                    {item.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
