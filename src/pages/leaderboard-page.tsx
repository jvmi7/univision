import { useState } from "react"
import { ArrowLeft } from "lucide-react"
import { Link } from "react-router-dom"

import { LeaderboardSection } from "@/components/LeaderboardSection"
import { Button } from "@/components/ui/button"

const PAGE_SIZE = 25

export default function LeaderboardPage() {
  const [page, setPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState("")
  const offset = (page - 1) * PAGE_SIZE

  return (
    <main className="relative min-h-svh bg-[#0D0D0E] text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,87,183,0.18),transparent_0,transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,116,208,0.16),transparent_0,transparent_30%),radial-gradient(circle_at_50%_85%,rgba(255,87,183,0.12),transparent_0,transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,14,0.9),rgba(13,13,14,0.72)_22%,rgba(13,13,14,0.58)_58%,rgba(13,13,14,0.88))]" />
      </div>

      <div className="relative z-10">
        <section className="mx-auto max-w-7xl px-6 pt-8 md:px-8 md:pt-10">
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
            <div className="max-w-3xl">
              <h1 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Leaderboard
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Explore the most aligned participants in the Uniswap economy.
              </p>
            </div>

            <Button asChild variant="outline" className="h-11 gap-2 px-6">
              <Link to="/">
                <ArrowLeft className="size-4" />
                Back Home
              </Link>
            </Button>
          </div>
        </section>

        <LeaderboardSection
          className="pt-6 md:pt-8"
          limit={PAGE_SIZE}
          offset={offset}
          framed={false}
          showHeader={false}
          showSearch
          showPagination
          showViewAllButton={false}
          currentPage={page}
          onPageChange={setPage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </div>
    </main>
  )
}
