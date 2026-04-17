import {
  UNITY_PET_STAT_KEYS,
  type UnityPetStatKey,
  type UnityPetStats,
  clampAuraPoints,
  clampUnityPetStat,
} from "@/components/unity-pet/unity-pet-types"

function resolveApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "")
  if (fromEnv) {
    return fromEnv
  }
  if (typeof window !== "undefined") {
    const h = window.location.hostname
    if (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "[::1]" ||
      h.endsWith(".localhost")
    ) {
      return `${window.location.protocol}//${window.location.host}`
    }
  }
  return "http://localhost:3001"
}

/**
 * GET /api/profiles/:identifier
 * - Wallet: `0x` + 40 hex (42 chars) — resolved via getProfileByWallet (primary or linked). 404 if unknown.
 * - Otherwise treated as username.
 */
export type ProfileDetailResponse = {
  /** Internal DB id when the API returns it (e.g. profiles.id). */
  id?: number
  username?: string | null
  primaryWallet?: string
  linkedWallet?: string | null
  /** From getProfileRepBreakdown — category → rep score. */
  repByCategory?: Record<string, unknown>
  /** Total aura (string is common for bigint / decimal JSON). */
  aura?: string | number | null
  totalAura?: string | number | null
  auraPoints?: string | number | null
}

const DISPLAY_NAME_TO_KEY: Record<string, UnityPetStatKey> = {
  researcher: "researcher",
  builder: "builder",
  trader: "trader",
  "liquidity provider": "liquidityProvider",
  liquidityprovider: "liquidityProvider",
  "governance participant": "governanceParticipant",
  governanceparticipant: "governanceParticipant",
  "community member": "communityMember",
  communitymember: "communityMember",
}

function parseNumeric(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const n = Number.parseFloat(value.replace(/,/g, ""))
    return Number.isFinite(n) ? n : null
  }
  return null
}

function snakeToCamelKey(s: string): string {
  return s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
}

function normalizeCategoryKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ")
}

/**
 * Maps API `repByCategory` into Unity pet stat bars.
 * Accepts camelCase stat keys, snake_case, UPPER_SNAKE, or display names (e.g. "Liquidity Provider").
 */
export function mapRepByCategoryToUnityPetStats(
  repByCategory: Record<string, unknown> | null | undefined,
): UnityPetStats | null {
  if (!repByCategory || typeof repByCategory !== "object") {
    return null
  }

  const out: UnityPetStats = {
    researcher: 0,
    builder: 0,
    trader: 0,
    liquidityProvider: 0,
    governanceParticipant: 0,
    communityMember: 0,
  }

  let any = false
  for (const [rawKey, rawVal] of Object.entries(repByCategory)) {
    const n = parseNumeric(rawVal)
    if (n === null) {
      continue
    }

    const norm = normalizeCategoryKey(rawKey)
    const camel = snakeToCamelKey(norm.replace(/ /g, "_"))
    const key =
      (UNITY_PET_STAT_KEYS as readonly string[]).includes(rawKey)
        ? (rawKey as UnityPetStatKey)
        : (UNITY_PET_STAT_KEYS as readonly string[]).includes(camel)
          ? (camel as UnityPetStatKey)
          : DISPLAY_NAME_TO_KEY[norm] ??
            DISPLAY_NAME_TO_KEY[camel] ??
            (DISPLAY_NAME_TO_KEY[norm.replace(/\s/g, "")] as UnityPetStatKey | undefined)

    if (!key) {
      continue
    }

    out[key] = clampUnityPetStat(n)
    any = true
  }

  return any ? out : null
}

/**
 * Reads total aura from a profile payload (supports common field names).
 * Returns a **raw** numeric value (not clamped); callers should clamp for UI (e.g. `clampAuraPoints`).
 */
export function extractProfileAura(
  detail: ProfileDetailResponse | Record<string, unknown>,
): number | null {
  const d = detail as Record<string, unknown>
  const candidates: unknown[] = [
    detail.aura,
    detail.totalAura,
    detail.auraPoints,
    d.total_aura,
    d.aura_points,
  ]
  for (const c of candidates) {
    const n = parseNumeric(c)
    if (n !== null) {
      return n
    }
  }
  return null
}

/** Aura total for badge + bar math (0–`UNITY_PET_AURA_POINTS_MAX`). */
export function profileAuraDisplayTotal(raw: number | null | undefined): number {
  if (raw === null || raw === undefined) {
    return 0
  }
  return clampAuraPoints(raw)
}

/**
 * Normalizes path params for `GET /api/profiles/:id`.
 * Postgres / APIs often store wallets lowercase; EIP-55 checksum in the URL can 404 otherwise.
 */
export function normalizeProfilesPathIdentifier(raw: string): string {
  const t = raw.trim()
  if (/^0x[a-fA-F0-9]{40}$/i.test(t)) {
    return t.toLowerCase()
  }
  return t
}

/**
 * @returns Profile JSON, or **null** if the server responds **404** (no row for that wallet/username).
 * Other HTTP errors still throw.
 */
export async function getProfileDetail(
  identifier: string,
  init?: RequestInit,
): Promise<ProfileDetailResponse | null> {
  const trimmed = normalizeProfilesPathIdentifier(identifier)
  if (!trimmed) {
    throw new Error("Profile identifier is empty")
  }

  const path = `/api/profiles/0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
  const url = `${resolveApiBaseUrl()}${path}`
  console.log('url', url)
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init?.headers,
    },
  })
  console.log('response', response)

  if (response.status === 404) {
    return null
  }
  console.log('response ok')
  if (!response.ok) {
    throw new Error(
      `Profile request failed: ${response.status} ${response.statusText} — ${url}`,
    )
  }

  const json: unknown = await response.json()
  console.log('json', json)
  if (
    json &&
    typeof json === "object" &&
    "data" in json &&
    (json as { data: unknown }).data &&
    typeof (json as { data: unknown }).data === "object"
  ) {
    return (json as { data: ProfileDetailResponse }).data
  }
  return json as ProfileDetailResponse
}
