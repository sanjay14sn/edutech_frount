"use client"

import { cn } from "@/lib/utils"

type PageLoaderVariant = "page" | "overlay" | "fullscreen"

interface PageLoaderProps {
  message?: string
  variant?: PageLoaderVariant
  className?: string
}

export function PageLoader({
  message,
  variant = "page",
  className,
}: PageLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label={message ?? "Loading"}
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        variant === "fullscreen" && "h-screen w-screen bg-background",
        variant === "overlay" && "absolute inset-0 z-40 bg-background/50",
        variant === "page" && "min-h-[50vh] w-full py-20",
        className
      )}
    >
      <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
