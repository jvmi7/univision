import { useQuery } from "@tanstack/react-query"
import { formatUnits } from "viem"

import { getAuraLeaderboard } from "@/lib/leaderboard-api"

const HOME_LEADERBOARD_LIMIT = 10

export type AuraLeaderboardRow = {
  rank: number
  profile: string
  primaryWallet: string
  aura: number
}

export type AuraLeaderboardResult = {
  rows: AuraLeaderboardRow[]
  hasMore: boolean
}

function formatProfileName(username: string | null, primaryWallet: string) {
  if (username && username.trim().length > 0) {
    return username
  }

  return `${primaryWallet.slice(0, 6)}...${primaryWallet.slice(-4)}`
}

export function useAuraLeaderboard(limit = HOME_LEADERBOARD_LIMIT, offset = 0) {
  return useQuery({
    queryKey: ["aura-leaderboard", limit, offset],
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
    queryFn: async (): Promise<AuraLeaderboardResult> => {
      const auraResponse = await getAuraLeaderboard({ limit, offset })

      return {
        rows: auraResponse.data.map((entry) => ({
          rank: entry.rank,
          profile: formatProfileName(entry.username, entry.primaryWallet),
          primaryWallet: entry.primaryWallet,
          aura: Number(formatUnits(BigInt(entry.aura), 18)),
        })),
        hasMore: auraResponse.data.length === limit,
      }
    },
  })
}
