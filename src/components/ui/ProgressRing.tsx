"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ProgressRingProps {
  value: number
  size?: number
  strokeWidth?: number
  color?: string
  label?: string
  sublabel?: string
  labelColor?: string
  className?: string
}

export const ProgressRing: React.FC<ProgressRingProps> = ({
  value,
  size = 80,
  strokeWidth = 6,
  color = "#6366f1",
  label,
  sublabel,
  labelColor,
  className,
}) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, value)) / 100) * circumference

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        {label && (
          <span className={cn("text-sm font-bold leading-none text-foreground", labelColor)}>
            {label}
          </span>
        )}
        {sublabel && (
          <span className="text-[10px] text-muted-foreground mt-0.5 font-medium">{sublabel}</span>
        )}
      </div>
    </div>
  )
}
