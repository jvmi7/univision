import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"

type LeaderboardFilter =
  | "top-aura"
  | "top-rep"
  | "builders"
  | "researchers"
  | "governance"

type LeaderboardProfile = {
  profile: string
  aura: number
  totalRep: number
  topCategory: string
  categoryRep: {
    Builder: number
    Researcher: number
    "Governance Participant": number
    Trader: number
    "Liquidity Provider": number
    "Community Member": number
  }
}

const filters: Array<{ id: LeaderboardFilter; label: string }> = [
  { id: "top-aura", label: "Top Aura" },
  { id: "top-rep", label: "Top REP" },
  { id: "builders", label: "Builders" },
  { id: "researchers", label: "Researchers" },
  { id: "governance", label: "Governance" },
]

const profiles: LeaderboardProfile[] = [
  {
    profile: "unicornwhale",
    aura: 94210,
    totalRep: 1847,
    topCategory: "Liquidity Provider",
    categoryRep: {
      Builder: 182,
      Researcher: 94,
      "Governance Participant": 168,
      Trader: 221,
      "Liquidity Provider": 1182,
      "Community Member": 0,
    },
  },
  {
    profile: "defibuilder",
    aura: 87445,
    totalRep: 1623,
    topCategory: "Builder",
    categoryRep: {
      Builder: 1098,
      Researcher: 160,
      "Governance Participant": 125,
      Trader: 80,
      "Liquidity Provider": 60,
      "Community Member": 100,
    },
  },
  {
    profile: "govqueen",
    aura: 81090,
    totalRep: 1401,
    topCategory: "Governance Participant",
    categoryRep: {
      Builder: 96,
      Researcher: 108,
      "Governance Participant": 977,
      Trader: 40,
      "Liquidity Provider": 42,
      "Community Member": 138,
    },
  },
  {
    profile: "lpmaxi",
    aura: 78334,
    totalRep: 1288,
    topCategory: "Liquidity Provider",
    categoryRep: {
      Builder: 52,
      Researcher: 48,
      "Governance Participant": 84,
      Trader: 126,
      "Liquidity Provider": 874,
      "Community Member": 104,
    },
  },
  {
    profile: "researcho",
    aura: 72118,
    totalRep: 1195,
    topCategory: "Researcher",
    categoryRep: {
      Builder: 64,
      Researcher: 836,
      "Governance Participant": 120,
      Trader: 34,
      "Liquidity Provider": 41,
      "Community Member": 100,
    },
  },
  {
    profile: "swapoor",
    aura: 68901,
    totalRep: 1044,
    topCategory: "Trader",
    categoryRep: {
      Builder: 34,
      Researcher: 46,
      "Governance Participant": 82,
      Trader: 642,
      "Liquidity Provider": 126,
      "Community Member": 114,
    },
  },
  {
    profile: "hookcraftr",
    aura: 65773,
    totalRep: 987,
    topCategory: "Builder",
    categoryRep: {
      Builder: 711,
      Researcher: 62,
      "Governance Participant": 56,
      Trader: 30,
      "Liquidity Provider": 24,
      "Community Member": 104,
    },
  },
  {
    profile: "delegatedao",
    aura: 61229,
    totalRep: 921,
    topCategory: "Governance Participant",
    categoryRep: {
      Builder: 30,
      Researcher: 44,
      "Governance Participant": 652,
      Trader: 21,
      "Liquidity Provider": 18,
      "Community Member": 156,
    },
  },
  {
    profile: "poolpilot",
    aura: 58445,
    totalRep: 876,
    topCategory: "Liquidity Provider",
    categoryRep: {
      Builder: 28,
      Researcher: 25,
      "Governance Participant": 60,
      Trader: 73,
      "Liquidity Provider": 612,
      "Community Member": 78,
    },
  },
  {
    profile: "communitypulse",
    aura: 54112,
    totalRep: 812,
    topCategory: "Community Member",
    categoryRep: {
      Builder: 24,
      Researcher: 41,
      "Governance Participant": 88,
      Trader: 18,
      "Liquidity Provider": 21,
      "Community Member": 488,
    },
  },
]

const categoryMap: Record<
  Exclude<LeaderboardFilter, "top-aura" | "top-rep">,
  keyof LeaderboardProfile["categoryRep"]
> = {
  builders: "Builder",
  researchers: "Researcher",
  governance: "Governance Participant",
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value)
}

export function LeaderboardSection() {
  const [activeFilter, setActiveFilter] = useState<LeaderboardFilter>("top-aura")

  const filteredProfiles = useMemo(() => {
    if (activeFilter === "top-aura") {
      return [...profiles].sort((a, b) => b.aura - a.aura)
    }

    if (activeFilter === "top-rep") {
      return [...profiles].sort((a, b) => b.totalRep - a.totalRep)
    }

    const category = categoryMap[activeFilter]

    return [...profiles]
      .filter((profile) => profile.categoryRep[category] > 0)
      .sort((a, b) => b.categoryRep[category] - a.categoryRep[category])
  }, [activeFilter])

  return (
    <section
      id="leaderboard"
      className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
    >
      <div className="rounded-[2rem] border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-white/50">
            Leaderboard
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
            The most aligned participants in the Uniswap economy, updated every
            epoch.
          </h2>
          <p className="mt-5 text-base leading-8 text-white/68 md:text-lg">
            Each row links to the user&apos;s full profile. The leaderboard has
            tabbed filters so visitors can explore by overall Aura, total REP,
            or drill into a specific category. This makes the reputation system
            tangible the moment someone lands on the page.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {filters.map((filter) => {
            const isActive = filter.id === activeFilter

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveFilter(filter.id)}
                className={[
                  "rounded-full border px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "border-[#FC72FF]/60 bg-[#FC72FF]/18 text-white"
                    : "border-white/10 bg-white/4 text-white/72 hover:border-white/18 hover:bg-white/8",
                ].join(" ")}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <div className="mt-8 overflow-x-auto rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[0.55fr_1.4fr_1fr_1.3fr_1fr] gap-4 border-b border-white/10 px-4 py-4 text-xs uppercase tracking-[0.18em] text-white/45 md:px-6">
              <span>Rank</span>
              <span>Profile</span>
              <span>Aura</span>
              <span>Top REP Category</span>
              <span>Total REP</span>
            </div>

            <div>
              {filteredProfiles.map((profile, index) => (
                <a
                  key={profile.profile}
                  href="#get-started"
                  className="grid grid-cols-[0.55fr_1.4fr_1fr_1.3fr_1fr] gap-4 border-b border-white/8 px-4 py-4 text-sm text-white/74 transition-colors hover:bg-white/[0.04] last:border-b-0 md:px-6"
                >
                  <span className="font-medium text-white">{index + 1}</span>
                  <span className="font-medium text-white">{profile.profile}</span>
                  <span>{formatNumber(profile.aura)}</span>
                  <span>{profile.topCategory}</span>
                  <span>{formatNumber(profile.totalRep)}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Button
            asChild
            className="h-11 rounded-full border border-[#FC72FF]/40 bg-[#FC72FF]/18 px-6 text-white hover:bg-[#FC72FF]/24"
          >
            <a href="#get-started">View Full Leaderboard</a>
          </Button>
        </div>
      </div>
    </section>
  )
}
