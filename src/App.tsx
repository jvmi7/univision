import { lazy, Suspense, useEffect, useState } from "react"

import { HeroOverlay } from "@/components/HeroOverlay"
import { NodeTooltip } from "@/components/NodeTooltip"
import type { NetworkNode } from "@/lib/generateMockData"

const NetworkGraph = lazy(() => import("@/components/NetworkGraph"))

export function App() {
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
      const nextProgress =
        scrollHeight > 0 ? window.scrollY / scrollHeight : 0

      setScrollProgress(Math.min(Math.max(nextProgress, 0), 1))
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
          id="how-it-works"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <div className="rounded-[2rem] border border-white/10 bg-black/34 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.32)] backdrop-blur-xl md:p-10">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                How It Works
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-5xl">
                A shared trust layer for the Uniswap ecosystem.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68 md:text-lg">
                Univision turns onchain behavior into a credibility graph. Aura
                reflects long-term alignment, sparks represent attestations, and
                the network surface shows how conviction compounds across the
                protocol.
              </p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Observe",
                  body: "Track UNI holders, LPs, traders, governors, researchers, and developers inside one living graph.",
                },
                {
                  title: "Score",
                  body: "Convert participation, reputation, and peer acknowledgement into readable aura signals.",
                },
                {
                  title: "Coordinate",
                  body: "Help contributors discover aligned peers, high-context clusters, and credible collaboration paths.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/8 bg-white/4 p-6"
                >
                  <p className="text-sm font-medium text-[#FC72FF]">{item.title}</p>
                  <p className="mt-3 text-sm leading-7 text-white/62">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="explore"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[2rem] border border-white/10 bg-black/34 p-8 backdrop-blur-xl md:p-10">
              <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                Explore the Graph
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                Move from noisy addresses to legible network structure.
              </h2>
              <p className="mt-5 text-base leading-8 text-white/68 md:text-lg">
                The graph remains alive in the background while the page scrolls.
                This lets the product story and the network visualization coexist:
                interface in the foreground, protocol topology beneath it.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                "Scrollable storytelling layout over a persistent WebGL background.",
                "Glass panels and gradients keep copy readable without hiding the scene.",
                "Interactive node tooltip stays available when you focus on a participant.",
              ].map((line) => (
                <div
                  key={line}
                  className="rounded-[1.5rem] border border-white/8 bg-white/4 p-6 backdrop-blur-xl"
                >
                  <p className="text-sm leading-7 text-white/68">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="docs"
          className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24"
        >
          <div className="rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(252,114,255,0.12),rgba(13,13,14,0.52))] p-8 backdrop-blur-xl md:p-10">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                  Docs & Roadmap
                </p>
                <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
                  Build the interface layer on top of the credibility graph.
                </h2>
              </div>
              <p className="text-base leading-8 text-white/68 md:text-lg">
                This setup is now ready for longer-form content: docs, product
                explanation, ecosystem examples, and future protocol modules,
                all while the scene stays pinned behind the page as ambient context.
              </p>
            </div>
          </div>
        </section>

        <div className="h-24" />
        <NodeTooltip node={selectedNode} position={tooltipPosition} />
      </div>
    </main>
  )
}

export default App
