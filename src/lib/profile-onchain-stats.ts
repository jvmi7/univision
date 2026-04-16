import { keccak256, stringToBytes } from "viem"

import {
  UNITY_PET_STAT_KEYS,
  type UnityPetStats,
  UNITY_PET_STAT_MAX,
} from "@/components/unity-pet/unity-pet-types"

/** Deterministic REP-style bars from onchain profile (registry has no per-category scores). */
export function deriveUnityPetStatsFromProfile(
  username: string,
  createdAt: bigint,
): UnityPetStats {
  const h = keccak256(stringToBytes(`${username}:${createdAt.toString()}:stats`))
  let seed = BigInt(h)
  const out: UnityPetStats = {
    researcher: 0,
    builder: 0,
    trader: 0,
    liquidityProvider: 0,
    governanceParticipant: 0,
    communityMember: 0,
  }
  for (let i = 0; i < UNITY_PET_STAT_KEYS.length; i++) {
    const key = UNITY_PET_STAT_KEYS[i]!
    const v = Number(seed % BigInt(UNITY_PET_STAT_MAX + 1))
    out[key] = v
    seed = seed >> 8n
  }
  return out
}

/** Aura grows with profile age (onchain `createdAt`). Capped at `cap`. */
export function deriveAuraPointsFromCreatedAt(
  createdAt: bigint,
  cap: number,
  nowSec: number = Math.floor(Date.now() / 1000),
): number {
  const c = Number(createdAt)
  if (!Number.isFinite(c) || c <= 0 || c > nowSec) {
    return 0
  }
  const ageSec = nowSec - c
  const days = ageSec / 86400
  const points = Math.min(cap, Math.floor(days * 5))
  return points
}
