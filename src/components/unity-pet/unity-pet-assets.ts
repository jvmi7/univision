import { keccak256, stringToBytes } from "viem"

import classic1 from "@/assets/unity-pets/classic-1.png"
import classic2 from "@/assets/unity-pets/classic-2.png"
import classic3 from "@/assets/unity-pets/classic-3.png"
import cute1 from "@/assets/unity-pets/cute-1.png"
import cute2 from "@/assets/unity-pets/cute-2.png"
import cute3 from "@/assets/unity-pets/cute-3.png"
import galaxy1 from "@/assets/unity-pets/galaxy-1.png"
import galaxy2 from "@/assets/unity-pets/galaxy-2.png"
import galaxy3 from "@/assets/unity-pets/galaxy-3.png"
import pastel1 from "@/assets/unity-pets/pastel-1.png"
import pastel2 from "@/assets/unity-pets/pastel-2.png"
import pastel3 from "@/assets/unity-pets/pastel-3.png"
import retro1 from "@/assets/unity-pets/retro-1.png"
import retro2 from "@/assets/unity-pets/retro-2.png"
import retro3 from "@/assets/unity-pets/retro-3.png"
import spooky1 from "@/assets/unity-pets/spooky-1.png"
import spooky2 from "@/assets/unity-pets/spooky-2.png"
import spooky3 from "@/assets/unity-pets/spooky-3.png"
import unityEgg from "@/assets/unity-pets/unity-egg.png"

export const UNITY_PET_THEMES = [
  "classic",
  "cute",
  "galaxy",
  "pastel",
  "retro",
  "spooky",
] as const

export type UnityPetTheme = (typeof UNITY_PET_THEMES)[number]

export type UnityPetStage = 1 | 2 | 3

const themePortraits: Record<UnityPetTheme, Record<UnityPetStage, string>> = {
  classic: { 1: classic1, 2: classic2, 3: classic3 },
  cute: { 1: cute1, 2: cute2, 3: cute3 },
  galaxy: { 1: galaxy1, 2: galaxy2, 3: galaxy3 },
  pastel: { 1: pastel1, 2: pastel2, 3: pastel3 },
  retro: { 1: retro1, 2: retro2, 3: retro3 },
  spooky: { 1: spooky1, 2: spooky2, 3: spooky3 },
}

export const unityPetEggUrl = unityEgg

export function getUnityPetPortraitUrl(
  input:
    | { kind: "egg" }
    | { kind: "hatched"; theme: UnityPetTheme; stage: UnityPetStage },
): string {
  if (input.kind === "egg") return unityEgg
  return themePortraits[input.theme][input.stage]
}

/** Uniform random theme and stage (e.g. post-mint reveal). */
export function rollRandomHatchedCompanion(): {
  theme: UnityPetTheme
  stage: UnityPetStage
} {
  const theme =
    UNITY_PET_THEMES[Math.floor(Math.random() * UNITY_PET_THEMES.length)]!
  const stage = (Math.floor(Math.random() * 3) + 1) as UnityPetStage
  return { theme, stage }
}

/** Stable theme/stage for a given onchain profile (username + `createdAt`). */
export function deterministicCompanionFromSeed(
  username: string,
  createdAt: bigint,
): { theme: UnityPetTheme; stage: UnityPetStage } {
  const h = keccak256(stringToBytes(`${username}:${createdAt.toString()}:pet`))
  const n = BigInt(h)
  const theme =
    UNITY_PET_THEMES[Number(n % BigInt(UNITY_PET_THEMES.length))]!
  const stage = (Number((n >> 16n) % 3n) + 1) as UnityPetStage
  return { theme, stage }
}
