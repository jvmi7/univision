import { useEffect, useRef, useState } from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { AuraPointsBadge } from "./aura-points-badge"
import { MEADOW_STAT_PRESETS } from "./meadow-stat-presets"
import { PetStatBar, type PetStatFillLayout } from "./pet-stat-bar"
import {
  clampAuraPoints,
  UNITY_PET_DEFAULT_STAT_LABELS,
  UNITY_PET_STAT_KEYS,
  type UnityPetStatKey,
  type UnityPetStats,
} from "./unity-pet-types"

const MAX_PET_NAME_LENGTH = 28

export type UnityPetCardProps = {
  imageSrc: string
  imageAlt: string
  petName: string
  onPetNameChange: (name: string) => void
  stats: UnityPetStats
  /** Shown on the pet portrait (clamped 0–100). */
  auraPoints: number
  /** Aura already assigned to reputation (0–`auraPoints` after clamp). */
  assignedReputationAura: number
  onAssignReputation: () => void
  statLabels?: Partial<Record<UnityPetStatKey, string>>
  size?: "default" | "large"
  /** Meadow uses the glass track + white fill; default uses white fill with a simpler track. */
  statPalette?: "meadow" | "default"
  /** How stat bar fills animate when `value` changes (e.g. intro from 0). */
  statFillLayout?: PetStatFillLayout
  /**
   * When set, the “unassigned of total” copy uses these values instead of `auraPoints` /
   * `assignedReputationAura` (e.g. keep copy fixed while the aura badge still animates).
   */
  reputationSummaryNumbers?: {
    totalAura: number
    assignedReputationAura: number
  }
  className?: string
}

export function UnityPetCard({
  imageSrc,
  imageAlt,
  petName,
  onPetNameChange,
  stats,
  auraPoints,
  assignedReputationAura,
  onAssignReputation,
  statLabels,
  size = "default",
  statPalette = "meadow",
  statFillLayout = "css",
  reputationSummaryNumbers,
  className,
}: UnityPetCardProps) {
  const isLarge = size === "large"
  const useMeadowStats = statPalette === "meadow"
  const totalAura = clampAuraPoints(auraPoints)
  const repLineTotal = clampAuraPoints(
    reputationSummaryNumbers?.totalAura ?? totalAura,
  )
  const repLineAssigned = Math.min(
    repLineTotal,
    Math.max(
      0,
      Math.round(
        reputationSummaryNumbers?.assignedReputationAura ??
          assignedReputationAura,
      ),
    ),
  )
  const repLineUnassigned = repLineTotal - repLineAssigned
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(petName)
  const inputRef = useRef<HTMLInputElement>(null)
  const skipBlurCommitRef = useRef(false)

  useEffect(() => {
    if (!isEditing) setDraft(petName)
  }, [petName, isEditing])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const commitName = () => {
    const trimmed = draft.trim()
    const next =
      trimmed.length > 0
        ? trimmed.slice(0, MAX_PET_NAME_LENGTH)
        : petName
    if (next !== petName) onPetNameChange(next)
    setIsEditing(false)
  }

  const cancelEdit = () => {
    skipBlurCommitRef.current = true
    setDraft(petName)
    setIsEditing(false)
  }

  const onNameBlur = () => {
    if (skipBlurCommitRef.current) {
      skipBlurCommitRef.current = false
      return
    }
    commitName()
  }

  return (
    <div
      className={cn(
        "flex max-h-[90vh] min-h-0 w-full flex-col overflow-y-auto overscroll-contain border border-border bg-card text-card-foreground shadow-sm sm:flex-row sm:items-stretch",
        isLarge
          ? "gap-7 rounded-2xl p-7 sm:gap-9 sm:p-9 md:gap-10 md:p-10"
          : "gap-4 rounded-xl p-4",
        className,
      )}
    >
      <div
        className={cn(
          "flex w-full shrink-0 flex-col items-center",
          isLarge
            ? "gap-3.5 sm:w-52 sm:gap-4 md:w-64"
            : "gap-2 sm:w-[7.5rem]",
        )}
      >
        <div
          className={cn(
            "relative flex aspect-square w-full items-center justify-center overflow-hidden",
            isLarge
              ? "rounded-2xl bg-white/[0.08] dark:bg-white/[0.06]"
              : "rounded-lg bg-muted/40",
          )}
        >
          <AuraPointsBadge
            className={cn(
              "absolute z-10",
              isLarge
                ? "right-0 top-0 sm:right-2 sm:top-2"
                : "right-0 top-0",
            )}
            points={auraPoints}
            size={isLarge ? "large" : "default"}
          />
          <img
            alt={imageAlt}
            className={cn(
              "max-h-full max-w-full object-contain",
              isLarge ? "rounded-xl p-2 sm:rounded-2xl sm:p-3" : "rounded-md p-1",
            )}
            decoding="async"
            draggable={false}
            loading="lazy"
            src={imageSrc}
          />
        </div>

        <div
          className={cn(
            "flex w-full min-w-0 items-center justify-center gap-1",
            isLarge ? "text-lg sm:text-xl" : "text-xs",
          )}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              aria-label="Companion name"
              className={cn(
                "min-w-0 flex-1 rounded-md border border-white/30 bg-background/60 px-1.5 py-0.5 text-center font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-white/40 dark:border-white/20 dark:bg-black/30",
                isLarge ? "text-lg sm:text-xl" : "text-xs",
              )}
              maxLength={MAX_PET_NAME_LENGTH}
              type="text"
              value={draft}
              onBlur={onNameBlur}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  commitName()
                }
                if (e.key === "Escape") {
                  e.preventDefault()
                  cancelEdit()
                }
              }}
            />
          ) : (
            <>
              <p
                className={cn(
                  "min-w-0 truncate text-center font-semibold text-foreground",
                )}
              >
                {petName}
              </p>
              <button
                type="button"
                aria-label="Edit companion name"
                className={cn(
                  "shrink-0 rounded-md p-0.5 text-zinc-600 transition-colors hover:bg-white/15 hover:text-foreground dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-foreground",
                  isLarge ? "sm:p-1" : "",
                )}
                onClick={() => {
                  setDraft(petName)
                  setIsEditing(true)
                }}
              >
                <Pencil
                  className={cn(isLarge ? "size-4 sm:size-5" : "size-3")}
                  strokeWidth={2}
                />
              </button>
            </>
          )}
        </div>

        <div
          className={cn(
            "flex w-full flex-col items-stretch gap-1.5",
            isLarge ? "gap-2" : "gap-1",
          )}
        >
          <p
            className={cn(
              "text-balance text-center text-black/75 dark:text-white/80",
              isLarge ? "text-xs leading-snug sm:text-sm" : "text-[0.65rem]",
            )}
          >
            <span className="font-semibold tabular-nums text-black dark:text-white">
              {repLineUnassigned}
            </span>
            <span className="text-black/70 dark:text-white/70"> of </span>
            <span className="font-semibold tabular-nums text-black dark:text-white">
              {repLineTotal}
            </span>
            <span className="text-black/70 dark:text-white/70">
              {" "}
              reputation points unassigned
            </span>
          </p>
          <Button
            className={cn(
              "w-full border-white/30 bg-white/20 text-foreground shadow-sm backdrop-blur-sm hover:bg-white/30 dark:border-white/20 dark:bg-white/10 dark:hover:bg-white/15 cursor-pointer",
              isLarge && "text-base",
            )}
            size={isLarge ? "lg" : "xs"}
            type="button"
            variant="outline"
            onClick={onAssignReputation}
          >
            Explore leaderboard
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "flex w-full min-w-0 flex-1 flex-col justify-center",
          isLarge ? "gap-3.5 sm:gap-5" : "gap-2.5",
        )}
      >
        {UNITY_PET_STAT_KEYS.map((key) => {
          const meadow = MEADOW_STAT_PRESETS[key]
          return (
            <PetStatBar
              key={key}
              fillClassName={meadow.fill}
              fillLayout={statFillLayout}
              label={statLabels?.[key] ?? UNITY_PET_DEFAULT_STAT_LABELS[key]}
              size={isLarge ? "large" : "default"}
              trackClassName={useMeadowStats ? meadow.track : undefined}
              value={stats[key]}
            />
          )
        })}
      </div>
    </div>
  )
}
