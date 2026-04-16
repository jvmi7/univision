import { lazy, Suspense, useEffect, useState } from "react"
import type { RemixiconComponentType } from "@remixicon/react"
import {
  RiCommunityLine,
  RiExchangeLine,
  RiFlaskLine,
  RiGovernmentLine,
  RiToolsLine,
  RiWaterFlashLine,
} from "@remixicon/react"
import { Route, Routes } from "react-router-dom"

import { HeroOverlay } from "@/components/HeroOverlay"
import { EnterExperienceButton } from "@/components/enter-experience-button"
import { LeaderboardSection } from "@/components/LeaderboardSection"
import { NodeTooltip } from "@/components/NodeTooltip"
import { ScrollReveal, ScrollRevealGroup, ScrollRevealItem } from "@/components/ScrollReveal"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { NetworkNode } from "@/lib/generateMockData"

const NetworkGraph = lazy(() => import("@/components/NetworkGraph"))
const ProfileExperience = lazy(() => import("@/pages/profile-experience"))

const howItWorksItems = [
  {
    title: "Hold UNI. Build Aura.",
    body: "Your Aura score grows automatically the longer you hold UNI. No staking. No lockups. Just hold, and your alignment speaks for itself. Providing liquidity earns a 2x Aura boost.",
  },
  {
    title: "Earn REP from the community.",
    body: "Aura holders can recognize others by assigning REP in categories like Builder, Governance Participant, or Community Member. REP is permanent and public - a lasting record of your contributions.",
  },
  {
    title: "Your profile, your identity.",
    body: "Claim a unique onchain username, link your wallets, and watch your Unigotchi evolve as your reputation grows. Your profile is a living snapshot of everything you've done in the Uniswap ecosystem.",
  },
]

const repCategories = [
  {
    name: "Researcher",
    icon: RiFlaskLine,
    description:
      "Advancing knowledge of DeFi mechanisms and protocol design.",
  },
  {
    name: "Builder",
    icon: RiToolsLine,
    description:
      "Shipping tools, interfaces, and integrations that expand the ecosystem.",
  },
  {
    name: "Trader",
    icon: RiExchangeLine,
    description: "Actively participating in markets across Uniswap pools.",
  },
  {
    name: "Liquidity Provider",
    icon: RiWaterFlashLine,
    description: "Supplying depth and stability to the protocol.",
  },
  {
    name: "Governance Participant",
    icon: RiGovernmentLine,
    description: "Engaging in proposals, voting, and delegation.",
  },
  {
    name: "Community Member",
    icon: RiCommunityLine,
    description: "Showing up, helping others, and strengthening the culture.",
  },
] satisfies Array<{
  name: string
  icon: RemixiconComponentType
  description: string
}>

const numbers = [
  { value: "381,113", label: "UNI holders." },
  { value: "One", label: "reputation layer." },
  { value: "Zero", label: "gatekeepers." },
]

const unityConceptParagraphs = [
  "Unity is a reputation layer built on top of the UNI token. It recognizes the people who show up - not just the capital that passes through.",
  "Every UNI holder earns Aura, a score that reflects how long you've been part of the ecosystem. The longer you hold, the more your presence is recognized. Provide liquidity and your Aura grows even faster.",
  "But alignment is only half the picture. The community also assigns REP - reputation points across categories like Builder, Researcher, Trader, and more. REP is how the network says \"this person contributes.\"",
  "Together, Aura and REP give you a living onchain profile that reflects who you are in the Uniswap economy.",
]

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route
        path="/profile"
        element={
          <Suspense
            fallback={<main className="fixed inset-0 bg-black" aria-busy aria-label="Loading" />}
          >
            <ProfileExperience />
          </Suspense>
        }
      />
    </Routes>
  )
}

function Home() {
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number
    y: number
  } | null>(null)
  const [exploreSignal, setExploreSignal] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    let rafId = 0

    const updateScrollProgress = () => {
      const scrollHeight =
        document.documentElement.scrollHeight - window.innerHeight
      const nextProgress = scrollHeight > 0 ? window.scrollY / scrollHeight : 0
      const clampedProgress = Math.min(Math.max(nextProgress, 0), 1)

      setScrollProgress((current) =>
        Math.abs(current - clampedProgress) < 0.004 ? current : clampedProgress
      )
    }

    const handleScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateScrollProgress)
    }

    updateScrollProgress()
    window.addEventListener("scroll", handleScroll, { passive: true })
    window.addEventListener("resize", handleScroll)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("scroll", handleScroll)
      window.removeEventListener("resize", handleScroll)
    }
  }, [])

  return (
    <main className="relative min-h-svh bg-[#0D0D0E] text-white">
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(252,114,255,0.18),transparent_0,transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,155,241,0.16),transparent_0,transparent_30%),radial-gradient(circle_at_50%_85%,rgba(252,114,255,0.12),transparent_0,transparent_28%)]" />
        <Suspense
          fallback={
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(252,114,255,0.18),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(255,170,246,0.12),transparent_30%)]" />
          }
        >
          <div className="absolute inset-0">
            <NetworkGraph
              exploreSignal={exploreSignal}
              onSelectionChange={setSelectedNode}
              onTooltipPositionChange={setTooltipPosition}
              scrollProgress={scrollProgress}
            />
          </div>
        </Suspense>
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,14,0.72),rgba(13,13,14,0.28)_24%,rgba(13,13,14,0.16)_55%,rgba(13,13,14,0.72))]" />
      </div>

      <div className="relative z-10">
        <HeroOverlay
          onExploreGraph={() => setExploreSignal((current) => current + 1)}
        />

        <section
          id="hero-section"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <ScrollRevealGroup>
              <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                Unity
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Your Reputation in the Uniswap Economy
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Unity turns your UNI into more than a token. Hold it,
                contribute, and watch your onchain identity come to life.
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-8">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="brand" className="h-11 px-6">
                      Learn More
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                        What is Unity?
                      </p>
                      <DialogTitle>
                        A reputation layer built on top of the UNI token.
                      </DialogTitle>
                      <DialogDescription>
                        Unity turns long-term alignment and visible contribution
                        into a profile the Uniswap economy can recognize.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 text-base leading-8 text-white/68 md:text-lg">
                      {unityConceptParagraphs.map((paragraph) => (
                        <p key={paragraph}>{paragraph}</p>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
              </ScrollRevealItem>
            </ScrollRevealGroup>
          </ScrollReveal>
        </section>

        <section
          id="how-it-works"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <ScrollRevealGroup className="max-w-3xl">
              <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                How It Works
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Your identity grows from holding, contributing, and being seen.
              </ScrollRevealItem>
            </ScrollRevealGroup>

            <ScrollRevealGroup className="mt-10 grid gap-4 md:grid-cols-3" delayChildren={0.08}>
              {howItWorksItems.map((item) => (
                <ScrollRevealItem
                  key={item.title}
                  className="rounded-none border border-white/8 bg-white/4 p-6"
                >
                  <p className="text-sm font-medium text-[#FC72FF]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-white/62">{item.body}</p>
                </ScrollRevealItem>
              ))}
            </ScrollRevealGroup>
          </ScrollReveal>
        </section>

        <section
          id="why-it-matters"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-[linear-gradient(180deg,rgba(252,114,255,0.12),rgba(13,13,14,0.52))] p-8 backdrop-blur-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <ScrollRevealGroup>
                <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                  Why It Matters
                </ScrollRevealItem>
                <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  History and contribution finally become visible.
                </ScrollRevealItem>
              </ScrollRevealGroup>
              <ScrollRevealGroup className="space-y-5 text-base leading-8 text-white/68 md:text-lg">
                <ScrollRevealItem>
                  <p>
                    Uniswap moves billions in volume. But until now, there&apos;s
                    been no way to distinguish someone who&apos;s been here since day
                    one from someone who showed up yesterday.
                  </p>
                </ScrollRevealItem>
                <ScrollRevealItem>
                  <p>
                    Unity changes that. Your history matters. Your
                    contributions are visible. And the people building,
                    governing, and supporting the protocol finally have a way to
                    be seen.
                  </p>
                </ScrollRevealItem>
              </ScrollRevealGroup>
            </div>
          </ScrollReveal>
        </section>

        <LeaderboardSection />

        <section
          id="rep-categories"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <ScrollRevealGroup className="max-w-3xl">
              <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                REP Categories
              </ScrollRevealItem>
              <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                Reputation points that describe how you show up.
              </ScrollRevealItem>
            </ScrollRevealGroup>

            <ScrollRevealGroup className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3" delayChildren={0.08}>
              {repCategories.map((category) => (
                <ScrollRevealItem
                  key={category.name}
                  className="rounded-none border border-white/8 bg-white/4 p-6"
                >
                  <div className="flex items-center gap-3 text-[#FC72FF]">
                    <category.icon className="size-5 shrink-0" />
                    <p className="text-sm font-medium">{category.name}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-white/62">
                    {category.description}
                  </p>
                </ScrollRevealItem>
              ))}
            </ScrollRevealGroup>
          </ScrollReveal>
        </section>

        <section
          id="the-numbers"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
              The Numbers
            </ScrollRevealItem>
            <ScrollRevealGroup className="mt-8 grid gap-4 md:grid-cols-3" delayChildren={0.08}>
              {numbers.map((item) => (
                <ScrollRevealItem
                  key={item.label}
                  className="rounded-none border border-white/8 bg-white/4 p-6"
                >
                  <p className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
                    {item.value}
                  </p>
                  <p className="mt-3 text-sm uppercase tracking-[0.18em] text-white/50">
                    {item.label}
                  </p>
                </ScrollRevealItem>
              ))}
            </ScrollRevealGroup>
          </ScrollReveal>
        </section>

        <section
          id="get-started"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <ScrollReveal className="overflow-hidden rounded-none border border-white/10 bg-[linear-gradient(180deg,rgba(252,114,255,0.14),rgba(13,13,14,0.5))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <ScrollRevealGroup className="max-w-3xl">
                <ScrollRevealItem className="text-xs uppercase tracking-[0.24em] text-white/50">
                  Get Started
                </ScrollRevealItem>
                <ScrollRevealItem className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                  Claim your username. Link your wallet. See where you stand.
                </ScrollRevealItem>
              </ScrollRevealGroup>
              <ScrollReveal delay={0.08}>
                <EnterExperienceButton className="h-11 px-6" />
              </ScrollReveal>
            </div>
          </ScrollReveal>
        </section>

        <div className="h-24" />
        <NodeTooltip node={selectedNode} position={tooltipPosition} />
      </div>
    </main>
  )
}

export default App
