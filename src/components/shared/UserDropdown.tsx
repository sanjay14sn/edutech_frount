"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut, ChevronDown } from "lucide-react"
import { useStore } from "@/store/useStore"

export function UserDropdown() {
  const { user, logout } = useStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const router = useRouter()

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (!user) return null

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-muted/60 transition-colors focus:outline-hidden cursor-pointer"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-xs shadow-xs border border-border">
          {user.avatar || (user.name ? user.name.substring(0, 2).toUpperCase() : "ST")}
        </div>
        <div className="hidden md:block text-left">
          <p className="font-semibold text-xs leading-none text-foreground">{user.name}</p>
          <p className="text-[10px] text-muted-foreground leading-normal mt-0.5 capitalize">
            {user.role.replace("_", " ")}
          </p>
        </div>
        <ChevronDown className="h-3 w-3 text-muted-foreground hidden md:block" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-border bg-card p-1 shadow-lg animate-scale-in">
          <div className="px-2.5 py-2 border-b border-border/40">
            <p className="text-xs font-semibold text-foreground">{user.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-left text-destructive hover:bg-destructive/10 cursor-pointer transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
