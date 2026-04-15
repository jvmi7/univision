import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

import { clampAuraPoints } from "./unity-pet-types"

export type AuraPointsBadgeProps = {
  points: number
  className?: string
}

export function AuraPointsBadge({ points, className }: AuraPointsBadgeProps) {
  const n = clampAuraPoints(points)

  return (
    <div
      aria-label={`${n} aura points`}
      className={cn(
        "relative flex items-center gap-1.5 overflow-hidden rounded-full border border-amber-500/35 bg-gradient-to-b from-amber-200 to-yellow-400 px-2.5 py-1 text-amber-950 shadow-md dark:border-amber-400/30 dark:from-amber-300 dark:to-yellow-500 dark:text-amber-950",
        className,
      )}
    >
      <span
        aria-hidden
        className="unity-aura-badge__shimmer pointer-events-none absolute inset-y-0 -left-3/4 w-3/4 bg-gradient-to-r from-transparent via-white/75 to-transparent"
      />
      <Star
        aria-hidden
        className="relative z-10 size-3.5 shrink-0 fill-amber-700/90 text-amber-800 dark:fill-amber-900/85 dark:text-amber-950"
        strokeWidth={1.5}
      />
      <span className="relative z-10 min-w-[1.5ch] text-xs font-bold tabular-nums tracking-tight sm:text-sm">
        {n}
      </span>
    </div>
  )
}
