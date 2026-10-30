"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useStore } from "@/store/useStore"
import { 
  Search, 
  Menu, 
  X, 
  ArrowRight
} from "lucide-react"

interface NavbarProps {
  onOpenDemo?: () => void
}

export function Navbar({ onOpenDemo }: NavbarProps) {
  const { isAuthenticated, user } = useStore()
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const [searchOpen, setSearchOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center group py-1">
              <Image 
                src="/erplogo.png" 
                alt="ERP Intellect" 
                width={260} 
                height={85} 
                priority
                className="h-12 sm:h-14 lg:h-15 w-auto object-contain group-hover:opacity-95 transition-opacity" 
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
              <Link 
                href="/" 
                className="px-3.5 py-2 text-sm font-semibold text-sky-600 hover:text-sky-700 transition"
              >
                Home
              </Link>
              <Link 
                href="#products" 
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition"
              >
                Products
              </Link>
              <Link 
                href="#industries" 
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition"
              >
                Industries
              </Link>
              <Link 
                href="#features" 
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition"
              >
                Features
              </Link>
              <Link 
                href="#footer" 
                className="px-3.5 py-2 text-sm font-medium text-slate-700 hover:text-sky-600 transition"
              >
                About Us
              </Link>
            </nav>

            {/* Right Action Buttons */}
            <div className="hidden md:flex items-center gap-3.5">
              <button 
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 text-slate-500 hover:text-sky-600 hover:bg-slate-50 rounded-full transition"
              >
                <Search className="w-4 h-4" />
              </button>

              {isAuthenticated ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 shadow-sm shadow-sky-600/30 transition-all hover:shadow-md"
                >
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-5 py-2 rounded-full text-sm font-semibold text-sky-600 border border-sky-400 hover:bg-sky-50/80 transition-colors shadow-2xs"
                  >
                    Login
                  </Link>
                  <Link
                    href="/login"
                    className="px-5 py-2 rounded-full text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700 transition-all shadow-sm shadow-sky-600/25 hover:shadow-md"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu hamburger */}
            <div className="flex md:hidden items-center gap-2">
              <button 
                onClick={() => setSearchOpen(true)}
                aria-label="Search"
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <Search className="w-5 h-5" />
              </button>
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle navigation"
                className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 pt-3 pb-6 space-y-3 animate-in slide-in-from-top-4 duration-200">
            <Link 
              href="/" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-semibold text-sky-600 bg-sky-50"
            >
              Home
            </Link>
            <Link 
              href="#products" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Products
            </Link>
            <Link 
              href="#industries" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Industries
            </Link>
            <Link 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              Features
            </Link>
            <Link 
              href="#footer" 
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-base font-medium text-slate-700 hover:bg-slate-50"
            >
              About Us
            </Link>
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-sm font-semibold text-sky-600 border border-sky-400 hover:bg-sky-50"
              >
                Login
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-full text-sm font-semibold bg-sky-600 text-white hover:bg-sky-700"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* Quick Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100">
            <div className="flex items-center px-4 py-3 border-b border-slate-100">
              <Search className="w-5 h-5 text-slate-400 mr-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search modules, industries, or features..."
                className="w-full text-sm outline-none text-slate-800 placeholder-slate-400"
                autoFocus
              />
              <button 
                onClick={() => setSearchOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 text-xs text-slate-500">
              <div className="font-semibold text-slate-700 mb-2">Popular Searches:</div>
              <div className="flex flex-wrap gap-2">
                {["Education ERP", "AI Sales Assistant", "Fee Collection", "Lead Pipeline", "Attendance", "Placement OS"].map((term) => (
                  <button
                    key={term}
                    onClick={() => {
                      setSearchOpen(false)
                      window.location.hash = "products"
                    }}
                    className="px-3 py-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 rounded-full transition"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
