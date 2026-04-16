export const PARTICIPANT_TYPES = [
  "holder",
  "lp",
  "trader",
  "developer",
  "researcher",
  "governor",
] as const

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number]

export const BRAND_PINK = "#FF57B7"
export const BRAND_PINK_SOFT = "#FF74D0"

export const NODE_COLORS: Record<ParticipantType, string> = {
  holder: BRAND_PINK,
  lp: "#FF3BCD",
  trader: "#FF57B7",
  developer: "#FF74D0",
  researcher: "#FF88D8",
  governor: "#FFADD8",
}

export const PARTICLE_PINK_COLORS = [
  "#FF1FBF",
  "#FF3BCD",
  "#FF57B7",
  "#FF74D0",
] as const

export const NETWORK_CONFIG = {
  nodeCount: 9000,
  edgeCount: 0,
  sphereRadius: 42,
  labelPercentile: 0.02,
  farDistance: 90,
  mediumDistance: 52,
  nearDistance: 28,
} as const

export const TYPE_CLUSTER_CENTERS: Record<
  ParticipantType,
  readonly [number, number, number]
> = {
  holder: [-16, 10, 7],
  lp: [16, 12, -6],
  trader: [0, -15, 16],
  developer: [-7, -8, -17],
  researcher: [10, 3, 18],
  governor: [4, 18, -2],
}

export const HERO_STATS = [
  { label: "UNI Holders", value: 381_113, suffix: "" },
  { label: "Aura Distributed", value: 12.4, suffix: "M" },
  { label: "Sparks Assigned", value: 2.1, suffix: "M" },
] as const
