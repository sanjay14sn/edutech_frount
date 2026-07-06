import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: LucideIcon
  iconPosition?: "left" | "right"
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", error, icon: Icon, iconPosition = "left", ...props }, ref) => {
    return (
      <div className="relative w-full">
        {Icon && iconPosition === "left" && (
          <div className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-10 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:border-ring disabled:cursor-not-allowed disabled:opacity-50",
            Icon && iconPosition === "left" && "pl-9",
            Icon && iconPosition === "right" && "pr-9",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
        />
        {Icon && iconPosition === "right" && (
          <div className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground pointer-events-none">
            <Icon className="h-4 w-4" />
          </div>
        )}
        {error && (
          <p className="mt-1 text-xs text-destructive animate-fade-in">{error}</p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"
