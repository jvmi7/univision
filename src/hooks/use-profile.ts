import { useQuery } from "@tanstack/react-query"
import { isAddress } from "viem"

import { getProfile } from "@/lib/profile-api"

/**
 * Normalize the identifier used as a cache key so `/ALICE`, `/Alice`, and
 * `/alice` share the same query — usernames are lowercase-only onchain, and
 * wallet addresses are case-insensitive for lookup.
 */
function normalizeIdentifier(identifier: string | undefined) {
  if (!identifier) return undefined
  return identifier.toLowerCase()
}

export function useProfile(identifier: string | undefined) {
  const normalized = normalizeIdentifier(identifier)

  return useQuery({
    queryKey: ["profile", normalized],
    enabled: Boolean(normalized),
    // Keep polling so new REP/Aura show up. `refetchOnMount: "always"` +
    // `refetchOnWindowFocus: "always"` ensure a local-chain reset is reflected
    // as soon as the user returns to the tab instead of waiting 30 s.
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    queryFn: () => getProfile(normalized!),
  })
}

/** True when the identifier is a 0x-prefixed EVM address (any case). */
export function isWalletIdentifier(identifier: string | undefined): boolean {
  if (!identifier) return false
  return isAddress(identifier)
}
