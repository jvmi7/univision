import {
  UNITY_PET_THEMES,
  type UnityPetStage,
  type UnityPetTheme,
} from "@/components/unity-pet/unity-pet-assets"

export type CompanionSnapshot =
  | { hatched: false }
  | { hatched: true; theme: UnityPetTheme; stage: UnityPetStage }

/**
 * Persist the hatched companion per wallet so returning users see the same
 * pfp. The onchain mint is the source of truth for *that the user hatched*;
 * this stores *which art to show* (theme + stage) since those are rolled
 * locally rather than onchain. Anyone viewing a profile in their own browser
 * only sees a hatched pfp for wallets they've interacted with in this browser.
 */
const COMPANION_STORAGE_PREFIX = "unity:companion:"

export function companionStorageKey(wallet: string): string {
  return `${COMPANION_STORAGE_PREFIX}${wallet.toLowerCase()}`
}

export function loadCompanion(wallet: string | undefined): CompanionSnapshot {
  if (!wallet || typeof window === "undefined") return { hatched: false }
  try {
    const raw = window.localStorage.getItem(companionStorageKey(wallet))
    if (!raw) return { hatched: false }
    const parsed = JSON.parse(raw) as {
      theme?: string
      stage?: number
    }
    if (
      parsed.theme &&
      UNITY_PET_THEMES.includes(parsed.theme as UnityPetTheme) &&
      (parsed.stage === 1 || parsed.stage === 2 || parsed.stage === 3)
    ) {
      return {
        hatched: true,
        theme: parsed.theme as UnityPetTheme,
        stage: parsed.stage as UnityPetStage,
      }
    }
  } catch {
    // Ignore malformed stored data — fall through to "not hatched".
  }
  return { hatched: false }
}

export function saveCompanion(
  wallet: string | undefined,
  companion: CompanionSnapshot,
): void {
  if (!wallet || typeof window === "undefined") return
  try {
    if (companion.hatched) {
      window.localStorage.setItem(
        companionStorageKey(wallet),
        JSON.stringify({
          theme: companion.theme,
          stage: companion.stage,
        }),
      )
    } else {
      window.localStorage.removeItem(companionStorageKey(wallet))
    }
  } catch {
    // Quota / privacy mode — non-fatal, the UI will just reset next session.
  }
}

/**
 * Deterministic per-wallet hash → small non-negative integer.
 *
 * Used to seed a fake companion for wallets we don't have stored hatched art
 * for, so the demo feels populated without randomness-churn on every render.
 */
function hashAddressToNumber(wallet: string): number {
  const lower = wallet.toLowerCase()
  let h = 2166136261 // FNV offset basis
  for (let i = 0; i < lower.length; i++) {
    h ^= lower.charCodeAt(i)
    // FNV-1a prime step, truncated to 32 bits via Math.imul.
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Populate roughly half of unknown wallets with a deterministic hatched
 * companion so the leaderboard + visited profiles feel alive. Returns a
 * plain egg snapshot for the other half. The same wallet always rolls the
 * same art across page loads.
 */
export function pseudoRandomCompanion(wallet: string): CompanionSnapshot {
  const hash = hashAddressToNumber(wallet)
  if ((hash & 1) === 0) return { hatched: false }
  const theme = UNITY_PET_THEMES[hash % UNITY_PET_THEMES.length]!
  const stage = (((hash >>> 4) % 3) + 1) as UnityPetStage
  return { hatched: true, theme, stage }
}

/**
 * Resolve what pfp to show for a wallet.
 *
 *  1. If the wallet has a real hatched companion in `localStorage`, use it.
 *  2. Otherwise, for any wallet in `excludeWallets` (typically the connected
 *     user), return the egg — we don't fake their real state.
 *  3. Otherwise, fall back to the deterministic half-random companion so the
 *     demo feels populated.
 */
export function resolveCompanion(
  wallet: string | undefined,
  options?: { excludeWallets?: ReadonlyArray<string | undefined | null> },
): CompanionSnapshot {
  if (!wallet) return { hatched: false }
  const stored = loadCompanion(wallet)
  if (stored.hatched) return stored

  const excluded =
    options?.excludeWallets?.some(
      (w) => typeof w === "string" && w.toLowerCase() === wallet.toLowerCase(),
    ) ?? false
  if (excluded) return { hatched: false }

  return pseudoRandomCompanion(wallet)
}
