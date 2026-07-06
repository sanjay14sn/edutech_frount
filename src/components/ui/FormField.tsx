"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FormFieldProps {
  label: string
  required?: boolean
  hint?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function FormField({ label, required, hint, error, htmlFor, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-muted-foreground leading-normal">{hint}</p>}
      {error && <p className="text-[10px] text-destructive font-medium">{error}</p>}
    </div>
  )
}
