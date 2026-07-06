"use client"

import * as React from "react"
import { Building2, ChevronsUpDown, Check } from "lucide-react"
import { useStore } from "@/store/useStore"
import { cn } from "@/lib/utils"

export function TenantSwitcher() {
  const { tenants, activeTenant, setActiveTenant, user } = useStore()
  const [isOpen, setIsOpen] = React.useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Handle clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  if (user?.role === "super_admin") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <Building2 className="h-3.5 w-3.5" />
        <span>Super Admin Mode</span>
      </div>
    )
  }

  if (!activeTenant) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-lg border border-border/60 bg-card p-2 text-sm shadow-xs hover:bg-muted/50 focus:outline-hidden cursor-pointer"
      >
        <div className="flex items-center gap-2.5 text-left">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground font-semibold text-xs shadow-xs">
            {activeTenant.name.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="font-medium text-xs leading-none text-foreground">{activeTenant.name}</p>
            <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">{activeTenant.domain}</p>
          </div>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 w-56 rounded-lg border border-border bg-card p-1 shadow-lg animate-scale-in">
          <p className="px-2.5 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
            Switch Tenant
          </p>
          <div className="space-y-0.5">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => {
                  setActiveTenant(tenant.id)
                  setIsOpen(false)
                }}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-left cursor-pointer",
                  activeTenant.id === tenant.id
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="flex h-5 w-5 items-center justify-center rounded-sm bg-primary/10 text-primary font-bold text-[10px]">
                    {tenant.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="leading-none">{tenant.name}</p>
                    <span className="text-[9px] text-muted-foreground opacity-80 leading-normal">{tenant.plan}</span>
                  </div>
                </div>
                {activeTenant.id === tenant.id && <Check className="h-3 w-3 text-primary" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
