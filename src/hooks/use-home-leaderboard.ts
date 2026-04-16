import { useQuery } from "@tanstack/react-query"
import { formatUnits } from "viem"

import {
  getAuraLeaderboard,
  getRepLeaderboard,
  type LeaderboardKind,
} from "@/lib/leaderboard-api"

const HOME_LEADERBOARD_LIMIT = 10

export type LeaderboardRow = {
  rank: number
  /** Display label — username when present, otherwise short wallet. */
  profile: string
  /** Raw username from onchain (null if unregistered). */
  username: string | null
  primaryWallet: string
  /**
   * Score for the currently-selected kind.
   *  - aura: 18-decimal normalized human number
   *  - rep categories: integer units
   */
  score: number
  /** Route-safe identifier: username if set, else primary wallet. */
  profileHref: string
}

export type LeaderboardResult = {
  rows: LeaderboardRow[]
  hasMore: boolean
}

function formatProfileName(username: string | null, primaryWallet: string) {
  if (username && username.trim().length > 0) {
    return username
  }

  return `${primaryWallet.slice(0, 6)}...${primaryWallet.slice(-4)}`
}

function hrefFor(username: string | null, primaryWallet: string) {
  return username && username.trim().length > 0
    ? `/${username}`
    : `/${primaryWallet}`
}

export function useLeaderboard(
  kind: LeaderboardKind,
  limit = HOME_LEADERBOARD_LIMIT,
  offset = 0,
) {
  return useQuery({
    queryKey: ["leaderboard", kind, limit, offset],
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    queryFn: async (): Promise<LeaderboardResult> => {
      if (kind === "aura") {
        const response = await getAuraLeaderboard({ limit, offset })
        return {
          rows: response.data.map((entry) => ({
            rank: entry.rank,
            profile: formatProfileName(entry.username, entry.primaryWallet),
            username: entry.username,
            primaryWallet: entry.primaryWallet,
            score: Number(formatUnits(BigInt(entry.aura), 18)),
            profileHref: hrefFor(entry.username, entry.primaryWallet),
          })),
          hasMore: response.data.length === limit,
        }
      }

      const response = await getRepLeaderboard({
        limit,
        offset,
        category: kind,
      })
      return {
        rows: response.data.map((entry) => {
          const score = Number(entry.total)
          return {
            rank: entry.rank,
            profile: formatProfileName(entry.username, entry.primaryWallet),
            username: entry.username,
            primaryWallet: entry.primaryWallet,
            score: Number.isFinite(score) ? score : 0,
            profileHref: hrefFor(entry.username, entry.primaryWallet),
          }
        }),
        hasMore: response.data.length === limit,
      }
    },
  })
}

/** Back-compat wrapper for the home-page teaser (always Aura). */
export function useAuraLeaderboard(
  limit = HOME_LEADERBOARD_LIMIT,
  offset = 0,
) {
  return useLeaderboard("aura", limit, offset)
}
