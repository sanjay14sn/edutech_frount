"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ArrowUpRight, ArrowDownRight, LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/Card"
import { cn } from "@/lib/utils"

export interface KPICardProps {
  title: string
  value: string | number
  subtext?: string
  trend?: {
    value: number
    label: string
    isPositive: boolean
  }
  icon: LucideIcon
  className?: string
  delay?: number
}

export function KPICard({ title, value, subtext, trend, icon: Icon, className, delay = 0 }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className={cn("overflow-hidden border border-border bg-card", className)}>
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {title}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary/80 text-foreground border border-border/50">
              <Icon className="h-4.5 w-4.5" />
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </h3>
            
            <div className="flex items-center gap-2 mt-1.5 min-h-[1.25rem]">
              {trend && (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    trend.isPositive
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 shrink-0" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 shrink-0" />
                  )}
                  <span>{trend.value}%</span>
                </span>
              )}
              {subtext && (
                <span className="text-[11px] text-muted-foreground leading-snug line-clamp-2 sm:line-clamp-1">
                  {subtext}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
