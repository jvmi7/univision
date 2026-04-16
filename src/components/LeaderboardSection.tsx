import { Search } from "lucide-react"
import { Link } from "react-router-dom"

import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from "@/components/ScrollReveal"
import { Button } from "@/components/ui/button"
import { useAuraLeaderboard } from "@/hooks/use-home-leaderboard"

function formatAura(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value)
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
  currentPage = 1,
  onPageChange,
  searchQuery = "",
  onSearchChange,
  className,
}: LeaderboardSectionProps) {
  const { data, isLoading, isError, isFetching } = useAuraLeaderboard(limit, offset)
  const profiles =
    data?.rows.filter((profile) => {
      const normalizedQuery = searchQuery.trim().toLowerCase()
      if (!normalizedQuery) {
        return true
      }

      return (
        profile.profile.toLowerCase().includes(normalizedQuery) ||
        profile.primaryWallet.toLowerCase().includes(normalizedQuery)
      )
    }) ?? []
  const hasMore = data?.hasMore ?? false

  const table = (
    <div className="mt-8 overflow-hidden rounded-none border border-white/10 bg-white/[0.03]">
      <div className="w-full">
        <div className="grid grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-4 border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.18em] text-white/45 md:px-6">
          <span>Rank</span>
          <span>Profile</span>
          <span>Primary Wallet</span>
          <span>Aura</span>
        </div>

        {isLoading ? (
          <div className="border-b border-white/8 px-4 py-6 text-sm text-white/62 md:px-6">
            Loading leaderboard...
          </div>
        ) : isError ? (
          <div className="border-b border-white/8 px-4 py-6 text-sm text-white/62 md:px-6">
            Unable to load leaderboard data right now.
          </div>
        ) : (
          <>
            {profiles.length > 0 ? (
              profiles.map((profile) => (
                <div
                  key={`${profile.rank}-${profile.profile}`}
                  className="grid grid-cols-[3rem_minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] gap-4 border-b border-white/8 px-4 py-4 text-sm text-white/74 transition-colors hover:bg-white/[0.04] last:border-b-0 md:px-6"
                >
                  <span className="font-medium text-white">{profile.rank}</span>
                  <span className="truncate font-medium text-white">{profile.profile}</span>
                  <span className="truncate">{formatWalletAddress(profile.primaryWallet)}</span>
                  <span>{formatAura(profile.aura)}</span>
                </div>
              ))
            ) : (
              <div className="border-b border-white/8 px-4 py-6 text-sm text-white/62 md:px-6">
                No leaderboard entries match that search.
              </div>
            )}
          </>
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
          {showSearch ? (
            <div className="mb-6 flex items-center gap-3 border border-white/10 bg-black/34 px-4 py-3 backdrop-blur-xl">
              <Search className="size-4 shrink-0 text-white/45" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder="Search by profile or wallet"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/38"
              />
            </div>
          ) : null}
          {table}
          {pagination}
        </>
      )}
    </section>
  )
}
