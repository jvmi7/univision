const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"

export const REP_CATEGORY_NAMES = [
  "research",
  "builder",
  "trader",
  "liquidity",
  "governance",
  "community",
] as const

export type RepCategoryName = (typeof REP_CATEGORY_NAMES)[number]

export type ProfileRepByCategory = Partial<Record<RepCategoryName, string>>

export type ProfileData = {
  id: number
  username: string | null
  primaryWallet: string
  linkedWallet: string | null
  createdAt: string | null
  aura: string
  epochNumber: number | null
  saleDetected: boolean
  repByCategory: ProfileRepByCategory
  recentAuraHistory?: unknown[]
}

/** Returns `null` when the API responds with 404 (profile not registered yet). */
export async function getProfile(
  identifier: string,
): Promise<ProfileData | null> {
  const response = await fetch(
    `${API_BASE_URL}/api/profiles/${encodeURIComponent(identifier)}`,
  )
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Profile request failed with status ${response.status}`)
  }
  return (await response.json()) as ProfileData
}

export type ProfileSearchResult = {
  id: number
  username: string
  primaryWallet: string
}

export type RepEvent = {
  id: number
  fromAddress: string
  toAddress: string
  category: number
  categoryName: string
  amount: string
  txHash: string
  blockNumber: string
  blockTimestamp: string
  counted: boolean
  rejectionReason: string | null
}

/**
 * `/api/rep/events` — returns counted + (optionally) rejected events.
 *
 * The indexer validates REP against the giver's current Aura. Events that
 * exceed the budget (or other rules) are stored with `counted=false` and a
 * non-null `rejectionReason` — surface these in the UI so the user can see
 * why their REP didn't show up on the recipient.
 */
export async function getRepEvents(opts: {
  from?: string
  to?: string
  category?: RepCategoryName
  limit?: number
  /** Defaults to `true` (counted-only). Pass `false` to include rejections. */
  countedOnly?: boolean
}): Promise<RepEvent[]> {
  const url = new URL("/api/rep/events", API_BASE_URL)
  if (opts.from) url.searchParams.set("from", opts.from)
  if (opts.to) url.searchParams.set("to", opts.to)
  if (opts.category) url.searchParams.set("category", opts.category)
  if (opts.limit !== undefined)
    url.searchParams.set("limit", String(opts.limit))
  if (opts.countedOnly === false) url.searchParams.set("counted", "false")
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`REP events fetch failed: ${response.status}`)
  }
  const json = (await response.json()) as { data: RepEvent[] }
  return json.data ?? []
}

/** `/api/profiles/search?q=…&limit=…` — matches usernames via ILIKE. */
export async function searchProfiles(
  query: string,
  limit = 10,
): Promise<ProfileSearchResult[]> {
  const trimmed = query.trim()
  if (trimmed.length === 0) return []
  const url = new URL("/api/profiles/search", API_BASE_URL)
  url.searchParams.set("q", trimmed)
  url.searchParams.set("limit", String(limit))
  const response = await fetch(url.toString())
  if (!response.ok) {
    throw new Error(`Search failed with status ${response.status}`)
  }
  const json = (await response.json()) as { data: ProfileSearchResult[] }
  return json.data ?? []
}
