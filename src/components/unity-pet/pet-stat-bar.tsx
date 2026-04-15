import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"

import { clampUnityPetStat, UNITY_PET_STAT_MAX } from "./unity-pet-types"

/** `spring` uses Framer spring physics on the fill; `css` uses a width transition. */
export type PetStatFillLayout = "css" | "spring"

export type PetStatBarProps = {
  label: string
  value: number
  max?: number
  size?: "default" | "large"
  className?: string
  /** Track tint behind the fill (e.g. meadow palette). When set, uses a slim ring + flat track. */
  trackClassName?: string
  fillClassName?: string
  fillLayout?: PetStatFillLayout
}

const springFillTransition = {
  type: "spring" as const,
  stiffness: 46,
  damping: 17,
  mass: 1.05,
}

/** Soft halo on the fill (track/fill stay `overflow-visible` so shadow is not clipped). */
const fillGlowClass =
  "shadow-[0_0_8px_rgba(255,255,255,0.35),0_0_2px_rgba(255,255,255,0.55)] dark:shadow-[0_0_10px_rgba(255,255,255,0.28),0_0_3px_rgba(255,255,255,0.45)]"

export function PetStatBar({
  label,
  value,
  max = UNITY_PET_STAT_MAX,
  size = "default",
  className,
  trackClassName,
  fillClassName,
  fillLayout = "css",
}: PetStatBarProps) {
  const reduceMotion = useReducedMotion()
  const safeMax = max > 0 ? max : UNITY_PET_STAT_MAX
  const clamped = clampUnityPetStat(value, safeMax)
  const percent = Math.min(100, Math.max(0, (clamped / safeMax) * 100))
  const sculpted = Boolean(trackClassName)
  const useSpringFill = fillLayout === "spring" && !reduceMotion
  const fillMinClass = clamped > 0 ? "min-w-[4px]" : "min-w-0"

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
          "relative w-full overflow-visible rounded-full",
          size === "large" ? "h-4" : "h-2",
          sculpted
            ? cn("shadow-sm", trackClassName)
            : "bg-muted/70 ring-1 ring-inset ring-black/[0.04] dark:bg-white/[0.08] dark:ring-white/10",
        )}
        role="progressbar"
      >
        {useSpringFill ? (
          <motion.div
            className={cn(
              "box-border h-full rounded-full",
              fillMinClass,
              fillClassName ?? "bg-primary",
              fillGlowClass,
            )}
            initial={false}
            animate={{ width: `${percent}%` }}
            transition={springFillTransition}
          />
        ) : (
          <div
            className={cn(
              "box-border h-full rounded-full motion-reduce:transition-none",
              fillMinClass,
              fillLayout === "css"
                ? "transition-[width] duration-[1400ms] ease-[cubic-bezier(0.33,0,0.2,1)]"
                : "",
              fillClassName ?? "bg-primary",
              fillGlowClass,
            )}
            style={{ width: `${percent}%` }}
          />
        )}
      </div>
    </div>
  )
}
