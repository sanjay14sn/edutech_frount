"use client"

import Link from "next/link"
import { Info, ArrowUpRight } from "lucide-react"
import {
  type CapacityResource,
  type CenterPolicy,
  getCapacityDetails,
} from "@/lib/centerPolicyClient"
import { cn } from "@/lib/utils"

type CapacityLimitNoticeProps = {
  resource: CapacityResource
  policy: CenterPolicy | null
  variant?: "banner" | "compact" | "inline"
  className?: string
  showWhenAvailable?: boolean
}

export function CapacityLimitNotice({
  resource,
  policy,
  variant = "banner",
  className,
  showWhenAvailable = false,
}: CapacityLimitNoticeProps) {
  const details = getCapacityDetails(policy, resource)

  if (!policy) return null
  if (!details.atCapacity && !showWhenAvailable) return null

  const isFull = details.atCapacity

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
          isFull
            ? "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "border-border bg-muted/40 text-muted-foreground",
          className
        )}
        title={
          isFull
            ? `${details.meta.shortLabel} full — upgrade for more`
            : `${details.current} of ${details.limit} ${details.meta.plural} used`
        }
      >
        <Info className="h-3 w-3 shrink-0" />
        {details.current}/{details.limit} {details.meta.plural}
      </div>
    )
  }

  if (variant === "inline") {
    if (!isFull) return null
    return (
      <p className={cn("text-xs text-amber-700 dark:text-amber-300 flex items-start gap-2", className)}>
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <span>
          {details.meta.title}. You&apos;re using all {details.limit} {details.meta.plural} on your current plan.{" "}
          <Link href="/support" className="font-semibold underline underline-offset-2 hover:text-foreground">
            Upgrade for more
          </Link>
        </span>
      </p>
    )
  }

  return (
    <div
      className={cn(
        "rounded-2xl border px-4 py-4 flex flex-col sm:flex-row sm:items-start gap-4",
        isFull
          ? "border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent"
          : "border-border/60 bg-muted/20",
        className
      )}
    >
      <div
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
          isFull ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "bg-muted text-muted-foreground"
        )}
      >
        <Info className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {isFull ? details.meta.title : `${details.meta.shortLabel} usage`}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isFull ? (
            <>
              <span className="font-medium text-foreground">{details.centerName}</span> is using all{" "}
              <span className="font-medium text-foreground">{details.limit}</span> {details.meta.plural} included in
              your current plan. To enroll more {details.meta.plural}, upgrade your institute capacity.
            </>
          ) : (
            <>
              {details.current} of {details.limit} {details.meta.plural} used
              {details.remaining > 0 && (
                <> · {details.remaining} remaining</>
              )}
            </>
          )}
        </p>
      </div>

      {isFull && (
        <Link
          href="/support"
          className="inline-flex items-center justify-center gap-1.5 shrink-0 rounded-xl border border-amber-500/30 bg-background px-3 py-2 text-xs font-semibold hover:bg-amber-500/10 transition-colors"
        >
          Upgrade for more
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  )
}

export function showCapacityLimitToast(
  addNotification: (n: { title: string; description: string; type: "system" | "fees" | "attendance" | "admissions" | "assignments" | "leads" | "tasks" }) => void,
  resource: CapacityResource,
  policy: CenterPolicy | null,
  fallbackMessage?: string
) {
  const details = getCapacityDetails(policy, resource)
  addNotification({
    title: details.meta.title,
    description:
      fallbackMessage ||
      `All ${details.limit} ${details.meta.plural} are in use. Contact support or upgrade your plan to add more.`,
    type: "system",
  })
}
