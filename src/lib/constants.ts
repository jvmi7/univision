export const PARTICIPANT_TYPES = [
  "holder",
  "lp",
  "trader",
  "developer",
  "researcher",
  "governor",
] as const

export type ParticipantType = (typeof PARTICIPANT_TYPES)[number]

export const NODE_COLORS: Record<ParticipantType, string> = {
  holder: "#FC72FF",
  lp: "#F865F5",
  trader: "#FF79EE",
  developer: "#FF8AE7",
  researcher: "#FF9FEF",
  governor: "#FFC7F7",
}

export const PARTICLE_PINK_COLORS = [
  "#E14DFF",
  "#FF5FD2",
  "#FF87B7",
  "#FFB3E6",
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
