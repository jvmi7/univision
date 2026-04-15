export const UNITY_PET_AURA_POINTS_MAX = 100

export function clampAuraPoints(value: number): number {
  if (Number.isNaN(value)) return 0
  return Math.min(
    UNITY_PET_AURA_POINTS_MAX,
    Math.max(0, Math.round(value)),
  )
}

export const UNITY_PET_STAT_MAX = 50

export const UNITY_PET_STAT_KEYS = [
  "researcher",
  "builder",
  "trader",
  "liquidityProvider",
  "governanceParticipant",
  "communityMember",
] as const

export type UnityPetStatKey = (typeof UNITY_PET_STAT_KEYS)[number]

export type UnityPetStats = Record<UnityPetStatKey, number>

export const UNITY_PET_DEFAULT_STAT_LABELS: Record<UnityPetStatKey, string> = {
  researcher: "Researcher",
  builder: "Builder",
  trader: "Trader",
  liquidityProvider: "Liquidity Provider",
  governanceParticipant: "Governance Participant",
  communityMember: "Community Member",
}

export function clampUnityPetStat(
  value: number,
  max: number = UNITY_PET_STAT_MAX,
): number {
  const cap = max > 0 ? max : UNITY_PET_STAT_MAX
  if (Number.isNaN(value)) return 0
  return Math.min(cap, Math.max(0, Math.round(value)))
}
