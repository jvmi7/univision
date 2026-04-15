import { cn } from "@/lib/utils"

import { clampUnityPetStat, UNITY_PET_STAT_MAX } from "./unity-pet-types"

export type PetStatBarProps = {
  label: string
  value: number
  max?: number
  size?: "default" | "large"
  className?: string
  /** Track tint behind the fill (e.g. meadow palette). When set, uses a slim ring + flat track. */
  trackClassName?: string
  fillClassName?: string
}

export function PetStatBar({
  label,
  value,
  max = UNITY_PET_STAT_MAX,
  size = "default",
  className,
  trackClassName,
  fillClassName,
}: PetStatBarProps) {
  const safeMax = max > 0 ? max : UNITY_PET_STAT_MAX
  const clamped = clampUnityPetStat(value, safeMax)
  const percent = Math.min(100, Math.max(0, (clamped / safeMax) * 100))
  const sculpted = Boolean(trackClassName)

  return (
    <div
      className={cn("min-w-0", size === "large" ? "space-y-1.5" : "space-y-1", className)}
    >
      <div
        className={cn(
          "flex items-baseline justify-between gap-2",
          size === "large" ? "text-sm" : "text-xs",
        )}
      >
        <span className="truncate font-medium text-foreground">{label}</span>
        <span className="shrink-0 tabular-nums text-foreground">
          {clamped}/{safeMax}
        </span>
      </div>
      <div
        aria-valuemax={safeMax}
        aria-valuemin={0}
        aria-valuenow={clamped}
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          size === "large" ? "h-6" : "h-3",
          sculpted
            ? cn("shadow-sm", trackClassName)
            : "bg-muted/70 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.08] dark:ring-white/10",
        )}
        role="progressbar"
      >
        <div
          className={cn(
            "h-full min-w-[4px] overflow-hidden rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none",
            fillClassName ?? "bg-primary",
          )}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
