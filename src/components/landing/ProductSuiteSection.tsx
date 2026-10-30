"use client"

import * as React from "react"
import Link from "next/link"
import { 
  GraduationCap, 
  Users, 
  Bot, 
  CreditCard, 
  BookOpen, 
  UserCheck, 
  Briefcase, 
  Puzzle, 
  ArrowRight,
  Sparkles,
  Check
} from "lucide-react"

interface ProductItem {
  id: string
  title: string
  description: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  badge?: string
  details: string[]
}

const products: ProductItem[] = [
  {
    id: "education-erp",
    title: "Education ERP",
    description: "Manage admissions, academics, exams, results and more.",
    icon: GraduationCap,
    iconBg: "bg-sky-50 text-sky-600",
    iconColor: "text-sky-600",
    details: ["Student Lifecycle & Enrollment", "Timetables & Attendance", "Exams & Automated Report Cards", "Guardian & Student Portals"]
  },
  {
    id: "crm",
    title: "CRM",
    description: "Capture leads, nurture relationships and increase conversions.",
    icon: Users,
    iconBg: "bg-teal-50 text-teal-600",
    iconColor: "text-teal-600",
    details: ["Omnichannel Lead Ingestion", "Visual Kanban Pipeline", "Automated Counselor Assignment", "Conversion Stage Analytics"]
  },
  {
    id: "ai-assistant",
    title: "AI Sales Assistant",
    description: "Automate follow-ups, answer queries and boost enrolments.",
    icon: Bot,
    iconBg: "bg-purple-50 text-purple-600",
    iconColor: "text-purple-600",
    badge: "AI Powered",
    details: ["24/7 WhatsApp & Web Chatbot", "Smart Inquiry Categorization", "Predictive Enrollment Scores", "Automated Follow-up Sequences"]
  },
  {
    id: "finance",
    title: "Accounts & Finance",
    description: "Track income, expenses, fee collection and financial reports.",
    icon: CreditCard,
    iconBg: "bg-amber-50 text-amber-600",
    iconColor: "text-amber-600",
    details: ["Automated Invoicing & Receipts", "Online Payment Gateway Integration", "Discount & Scholarship Workflows", "Audit-Ready Ledger Reports"]
  },
  {
    id: "lms",
    title: "LMS",
    description: "Deliver engaging e-learning and track performance.",
    icon: BookOpen,
    iconBg: "bg-indigo-50 text-indigo-600",
    iconColor: "text-indigo-600",
    details: ["Interactive Course Builder", "Quizzes & Assignment Grading", "Video Lecture Streaming", "Live Progress Dashboards"]
  },
  {
    id: "hrms",
    title: "HRMS",
    description: "Manage staff, payroll, attendance and performance.",
    icon: UserCheck,
    iconBg: "bg-orange-50 text-orange-600",
    iconColor: "text-orange-600",
    details: ["Biometric & Web Attendance", "Automated Payroll & Payslips", "Leave Approval Workflows", "Staff Performance Appraisals"]
  },
  {
    id: "placement-os",
    title: "Placement OS",
    description: "Connect students with top recruiters and career opportunities.",
    icon: Briefcase,
    iconBg: "bg-rose-50 text-rose-600",
    iconColor: "text-rose-600",
    details: ["Recruiter Directory & Job Drives", "Resume Builder & Screening", "Interview Scheduling", "Placement Conversion Reports"]
  },
  {
    id: "custom-modules",
    title: "Custom Modules",
    description: "Flexible and scalable to match your unique needs.",
    icon: Puzzle,
    iconBg: "bg-cyan-50 text-cyan-600",
    iconColor: "text-cyan-600",
    details: ["Custom Fields & Entities", "REST API & Webhooks", "Custom Role-Based Permissions", "Multi-Campus Branch Orchestration"]
  }
]

export function ProductSuiteSection() {
  const [selectedProduct, setSelectedProduct] = React.useState<ProductItem | null>(null)

  return (
    <section id="products" className="py-20 lg:py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold tracking-widest text-sky-600 uppercase">
            OUR PRODUCT SUITE
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mt-2 tracking-tight">
            Everything You Need. In One Platform.
          </h2>
          <p className="text-slate-600 text-base sm:text-lg mt-3 leading-relaxed">
            From admissions to alumni, from CRM to finance — ERPIntellect brings all your operations together with the power of AI and automation.
          </p>
        </div>

        {/* 8 Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.id}
                className="group relative bg-white border border-slate-200/80 hover:border-sky-300 rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.iconBg} shadow-xs group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                        <Sparkles className="w-2.5 h-2.5" />
                        {item.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-sky-600 transition-colors">
                    {item.title}
                  </h3>
                  
                  <p className="text-slate-500 text-sm leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedProduct(item)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-800 transition-all pt-2 group-hover:translate-x-1"
                >
                  <span>Learn More</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )
          })}
        </div>

      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            >
              ✕
            </button>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedProduct.iconBg} mb-4`}>
              <selectedProduct.icon className="w-7 h-7" />
            </div>

            <h3 className="text-2xl font-extrabold text-slate-900">
              {selectedProduct.title}
            </h3>
            <p className="text-slate-600 text-sm mt-1 mb-6">
              {selectedProduct.description}
            </p>

            <div className="space-y-3 mb-8">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Key Features Included:
              </div>
              {selectedProduct.details.map((detail, idx) => (
                <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </div>
                  <span>{detail}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Link
                href="/login"
                className="flex-1 text-center py-3 rounded-full text-sm font-semibold bg-sky-600 hover:bg-sky-700 text-white shadow-sm transition"
              >
                Access Module
              </Link>
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-5 py-3 rounded-full text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
