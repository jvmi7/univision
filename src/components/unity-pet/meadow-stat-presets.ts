import type { UnityPetStatKey } from "./unity-pet-types"

const TRACK =
  "bg-black/[0.04] ring-1 ring-inset ring-black/[0.06] dark:bg-white/[0.08] dark:ring-white/12"

const FILL =
  "bg-gradient-to-r from-white to-white/90 shadow-sm ring-1 ring-black/[0.07] dark:from-white/95 dark:to-white/82 dark:ring-white/18"

const WHITE_STAT = { track: TRACK, fill: FILL } as const

/**
 * Meadow mode: neutral track + white meters (scene stays the color story).
 */
export const MEADOW_STAT_PRESETS: Record<
  UnityPetStatKey,
  { track: string; fill: string }
> = {
  researcher: WHITE_STAT,
  builder: WHITE_STAT,
  trader: WHITE_STAT,
  liquidityProvider: WHITE_STAT,
  governanceParticipant: WHITE_STAT,
  communityMember: WHITE_STAT,
}
