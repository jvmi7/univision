import { useQuery } from "@tanstack/react-query"
import { Search } from "lucide-react"
import { Link } from "react-router-dom"
import { useAccount } from "wagmi"

import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from "@/components/ScrollReveal"
import { Button } from "@/components/ui/button"
import {
  getUnityPetPortraitUrl,
  unityPetEggUrl,
} from "@/components/unity-pet/unity-pet-assets"
import { useLeaderboard } from "@/hooks/use-home-leaderboard"
import { resolveCompanion } from "@/lib/companion-storage"
import {
  LEADERBOARD_KINDS,
  LEADERBOARD_LABELS,
  type LeaderboardKind,
} from "@/lib/leaderboard-api"
import { searchProfiles } from "@/lib/profile-api"
import { cn } from "@/lib/utils"

/**
 * Pfp to show next to a leaderboard row.
 *
 *  - If the wallet has a real hatched companion stored in this browser, use it.
 *  - Else, for ~half the wallets (deterministic per address), show a random
 *    hatched companion so the demo feels populated.
 *  - The connected wallet is excluded from the random roll so your own row
 *    reflects your real hatched/egg state.
 */
function pfpSrcForWallet(
  wallet: string,
  connectedWallet: string | undefined,
): string {
  const companion = resolveCompanion(wallet, {
    excludeWallets: [connectedWallet],
  })
  if (companion.hatched) {
    return getUnityPetPortraitUrl({
      kind: "hatched",
      theme: companion.theme,
      stage: companion.stage,
    })
  }
  return unityPetEggUrl
}

function formatScore(kind: LeaderboardKind, value: number) {
  if (kind === "aura") {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value)
  }
  // REP categories are integer units — keep them exact.
  return new Intl.NumberFormat("en-US").format(Math.round(value))
}

function formatWalletAddress(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`
}

type LeaderboardSectionProps = {
  limit?: number
  offset?: number
  framed?: boolean
  showHeader?: boolean
  showSearch?: boolean
  showPagination?: boolean
  showViewAllButton?: boolean
  /** Which board to render — defaults to Aura. */
  kind?: LeaderboardKind
  /** If true, render clickable category tabs above the table. */
  showKindTabs?: boolean
  onKindChange?: (kind: LeaderboardKind) => void
  currentPage?: number
  onPageChange?: (page: number) => void
  searchQuery?: string
  onSearchChange?: (value: string) => void
  className?: string
}

export function LeaderboardSection({
  limit = 10,
  offset = 0,
  framed = true,
  showHeader = true,
  showSearch = false,
  showPagination = false,
  showViewAllButton = true,
  kind = "aura",
  showKindTabs = false,
  onKindChange,
  currentPage = 1,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  className,
}: LeaderboardSectionProps) {
  const { address: connectedWallet } = useAccount()

  const { data, isLoading, isError, isFetching } = useLeaderboard(
    kind,
    limit,
    offset,
  )

  // Live cross-profile search hits `/api/profiles/search` so users can find
  // anyone, not just profiles on the current leaderboard page.
  const normalizedQuery = searchQuery.trim()
  const searchResults = useQuery({
    queryKey: ["profiles-search", normalizedQuery],
    enabled: normalizedQuery.length > 0,
    staleTime: 15_000,
    queryFn: () => searchProfiles(normalizedQuery, 15),
  })

  const rows = data?.rows ?? []
  const hasMore = data?.hasMore ?? false
  const isSearching = normalizedQuery.length > 0

  const scoreHeader = kind === "aura" ? "Aura" : `${LEADERBOARD_LABELS[kind]} REP`

  const tabs = showKindTabs ? (
    <div
      aria-label="Leaderboard category"
      role="tablist"
      className="mb-6 flex flex-wrap gap-2 border border-white/10 bg-black/34 p-2 backdrop-blur-xl"
    >
      {LEADERBOARD_KINDS.map((k) => {
        const active = k === kind
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onKindChange?.(k)}
            className={cn(
              "whitespace-nowrap px-4 py-2 text-xs uppercase tracking-[0.18em] transition-colors",
              active
                ? "bg-[#FF57B7]/20 text-white ring-1 ring-inset ring-[#FF57B7]/40"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {LEADERBOARD_LABELS[k]}
          </button>
        )
      })}
    </div>
  ) : null

  const searchBar = showSearch ? (
    <div className="mb-4 flex items-center gap-3 border border-white/10 bg-black/34 px-4 py-3 backdrop-blur-xl">
      <Search className="size-4 shrink-0 text-white/45" />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchChange?.(event.target.value)}
        placeholder="Search all profiles by name"
        className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/38"
      />
    </div>
  ) : null

  const searchResultsList = isSearching ? (
    <div className="mb-6 overflow-hidden rounded-none border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-white/45 md:px-6">
        Matching profiles
      </div>
      {searchResults.isLoading ? (
        <div className="px-4 py-4 text-sm text-white/62 md:px-6">
          Searching…
        </div>
      ) : searchResults.isError ? (
        <div className="px-4 py-4 text-sm text-destructive md:px-6">
          Search failed.
        </div>
      ) : (searchResults.data?.length ?? 0) === 0 ? (
        <div className="px-4 py-4 text-sm text-white/62 md:px-6">
          No profiles match “{normalizedQuery}”.
        </div>
      ) : (
        searchResults.data?.map((profile) => (
          <Link
            key={profile.id}
            to={`/${profile.username}`}
            className="flex items-center justify-between gap-4 border-b border-white/8 px-5 py-4 text-base text-white/74 transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none last:border-b-0 md:px-8"
          >
            <span className="flex min-w-0 items-center gap-3">
              <img
                alt=""
                aria-hidden
                className="size-9 shrink-0 rounded-full border border-white/15 bg-black/40 object-contain p-1"
                decoding="async"
                draggable={false}
                loading="lazy"
                src={pfpSrcForWallet(profile.primaryWallet, connectedWallet)}
              />
              <span className="truncate font-medium text-white">
                {profile.username}
              </span>
            </span>
            <span className="truncate font-mono text-sm text-white/50">
              {formatWalletAddress(profile.primaryWallet)}
            </span>
          </Link>
        ))
      )}
    </div>
  ) : null

  // Tailwind grid template used for both the header and every row — keep the
  // two identical so columns stay aligned. The second column reserves space
  // for the companion pfp (egg or hatched portrait) before the profile name.
  const gridCols =
    "grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)]"

  const table = (
    <div className="overflow-hidden rounded-none border border-white/10 bg-white/[0.03]">
      <div className="w-full">
        <div
          className={cn(
            "grid gap-5 border-b border-white/10 px-5 py-5 text-xs uppercase tracking-[0.18em] text-white/45 md:px-8 md:py-6",
            gridCols,
          )}
        >
          <span>Rank</span>
          <span>Profile</span>
          <span>Primary Wallet</span>
          <span>{scoreHeader}</span>
        </div>

        {isLoading ? (
          <div className="border-b border-white/8 px-5 py-8 text-base text-white/62 md:px-8">
            Loading leaderboard...
          </div>
        ) : isError ? (
          <div className="border-b border-white/8 px-5 py-8 text-base text-white/62 md:px-8">
            Unable to load leaderboard data right now.
          </div>
        ) : rows.length > 0 ? (
          rows.map((profile) => (
            <Link
              key={`${profile.rank}-${profile.primaryWallet}`}
              to={profile.profileHref}
              className={cn(
                "grid items-center gap-5 border-b border-white/8 px-5 py-6 text-base text-white/74 transition-colors hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none last:border-b-0 md:px-8 md:py-7",
                gridCols,
              )}
            >
              <span className="text-base font-medium text-white md:text-lg">
                {profile.rank}
              </span>
              <span className="flex items-center gap-3 truncate">
                <img
                  alt=""
                  aria-hidden
                  className="size-10 shrink-0 rounded-full border border-white/15 bg-black/40 object-contain p-1"
                  decoding="async"
                  draggable={false}
                  loading="lazy"
                  src={pfpSrcForWallet(profile.primaryWallet, connectedWallet)}
                />
                <span className="truncate font-medium text-white">
                  {profile.profile}
                </span>
              </span>
              <span className="truncate font-mono text-sm">
                {formatWalletAddress(profile.primaryWallet)}
              </span>
              <span className="tabular-nums">
                {formatScore(kind, profile.score)}
              </span>
            </Link>
          ))
        ) : (
          <div className="border-b border-white/8 px-5 py-8 text-base text-white/62 md:px-8">
            No entries yet.
          </div>
        )}
      </div>
    </div>
  )

  const pagination = showPagination ? (
    <div className="mt-6 flex items-center justify-between gap-4">
      <Button
        variant="outline"
        className="h-11 px-6"
        disabled={currentPage <= 1 || isFetching}
        onClick={() => onPageChange?.(currentPage - 1)}
      >
        Previous
      </Button>
      <p className="text-sm uppercase tracking-[0.18em] text-white/50">
        Page {currentPage}
      </p>
      <Button
        variant="brand"
        className="h-11 px-6"
        disabled={!hasMore || isFetching}
        onClick={() => onPageChange?.(currentPage + 1)}
      >
        Next
      </Button>
    </div>
  ) : null

  return (
    <section
      id="leaderboard"
      className={`mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24 ${className ?? ""}`}
    >
      {framed ? (
        <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
          {showHeader ? (
            <ScrollRevealGroup className="max-w-3xl">
              <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                Leaderboard
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                The most aligned participants in the Uniswap economy
              </ScrollRevealItem>
            </ScrollRevealGroup>
          ) : null}
          <div className="mt-8">{tabs}</div>
          {table}
          {pagination}
          {showViewAllButton ? (
            <ScrollReveal className="mt-8" delay={0.1}>
              <Button asChild variant="brand" className="h-11 px-6">
                <Link to="/leaderboard">View Full Leaderboard</Link>
              </Button>
            </ScrollReveal>
          ) : null}
        </ScrollReveal>
      ) : (
        <>
          {tabs}
          {searchBar}
          {searchResultsList}
          {table}
          {pagination}
        </>
      )}
    </section>
  )
}
