import { Star } from "lucide-react"

import { cn } from "@/lib/utils"

import { clampAuraPoints } from "./unity-pet-types"

export type AuraPointsBadgeProps = {
  points: number
  className?: string
  size?: "default" | "large"
}

export function AuraPointsBadge({
  points,
  className,
  size = "default",
}: AuraPointsBadgeProps) {
  const n = clampAuraPoints(points)
  const isLarge = size === "large"

  return (
    <div
      aria-label={`${n} aura points`}
      className={cn(
        "relative flex items-center overflow-hidden rounded-full border border-amber-500/35 bg-gradient-to-b from-amber-200 to-yellow-400 text-amber-950 shadow-md dark:border-amber-400/30 dark:from-amber-300 dark:to-yellow-500 dark:text-amber-950",
        isLarge ? "gap-2 px-3 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2" : "gap-1.5 px-2.5 py-1",
        className,
      )}
    >
      <span
        aria-hidden
        className="unity-aura-badge__shimmer pointer-events-none absolute inset-y-0 -left-3/4 w-3/4 bg-gradient-to-r from-transparent via-white/75 to-transparent"
      />
      <Star
        aria-hidden
        className={cn(
          "relative z-10 shrink-0 fill-amber-700/90 text-amber-800 dark:fill-amber-900/85 dark:text-amber-950",
          isLarge ? "size-4 sm:size-5" : "size-3.5",
        )}
        strokeWidth={1.5}
      />
      <span
        className={cn(
          "relative z-10 min-w-[1.5ch] font-bold tabular-nums tracking-tight",
          isLarge ? "text-sm sm:text-base" : "text-xs sm:text-sm",
        )}
      >
        {n}
      </span>
    </div>
  )
}
