const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001"

type LeaderboardResponse<T> = {
  data: T[]
  meta: {
    limit: number
    offset: number
    category?: string
  }
}

export type AuraLeaderboardEntry = {
  rank: number
  profileId: number
  username: string | null
  primaryWallet: string
  linkedWallet: string | null
  aura: string
  epochNumber: number
  saleDetected: boolean
}

export type RepLeaderboardEntry = {
  rank: number
  profileId: number
  username: string | null
  primaryWallet: string
  total: string
  category: string
}

type LeaderboardParams = {
  limit?: number
  offset?: number
}

type RepLeaderboardParams = LeaderboardParams & {
  category?: string
}

async function fetchLeaderboard<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<LeaderboardResponse<T>> {
  const url = new URL(path, API_BASE_URL)

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      url.searchParams.set(key, String(value))
    }
  })

  const response = await fetch(url.toString())

  if (!response.ok) {
    throw new Error(`Leaderboard request failed with status ${response.status}`)
  }

  return response.json() as Promise<LeaderboardResponse<T>>
}

export function getAuraLeaderboard(params: LeaderboardParams = {}) {
  return fetchLeaderboard<AuraLeaderboardEntry>("/api/leaderboard/aura", params)
}

export function getRepLeaderboard(params: RepLeaderboardParams = {}) {
  return fetchLeaderboard<RepLeaderboardEntry>("/api/leaderboard/rep", params)
}

/** Boards the leaderboard page can render. */
export type LeaderboardKind =
  | "aura"
  | "research"
  | "builder"
  | "trader"
  | "liquidity"
  | "governance"
  | "community"

export const LEADERBOARD_KINDS = [
  "aura",
  "research",
  "builder",
  "trader",
  "liquidity",
  "governance",
  "community",
] as const satisfies readonly LeaderboardKind[]

export const LEADERBOARD_LABELS: Record<LeaderboardKind, string> = {
  aura: "Aura",
  research: "Researcher",
  builder: "Builder",
  trader: "Trader",
  liquidity: "Liquidity Provider",
  governance: "Governance",
  community: "Community",
}
