import { MoonStar, SunMedium } from "lucide-react"

import { SplashSphere } from "@/components/splash-sphere"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

export function App() {
  const { theme, setTheme } = useTheme()
  const isDarkTheme = theme === "dark"

  return (
    <main className="relative isolate min-h-svh overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.24),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.16),transparent_28%)]" />
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <section className="mx-auto grid min-h-svh max-w-7xl gap-12 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-10">
        <div className="flex max-w-2xl min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex w-fit items-center rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground backdrop-blur">
              Univision splash
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
            >
              {isDarkTheme ? <SunMedium /> : <MoonStar />}
              Toggle theme
            </Button>
          </div>

          <div className="space-y-4">
            <h1 className="max-w-xl text-5xl font-semibold tracking-tight text-balance sm:text-6xl">
              A cinematic splash screen with a living 3D sphere.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
              This hero section combines Tailwind CSS, shadcn/ui, React
              Three Fiber, and Three.js to render a softly animated spherical
              orb inside a responsive canvas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg">Enter experience</Button>
            <Button size="lg" variant="outline">
              View concept
            </Button>
          </div>

          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
            <p>React + TypeScript + Vite</p>
            <p>Tailwind CSS + shadcn/ui</p>
            <p>Three.js canvas scene</p>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-8 -z-10 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative aspect-square overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%),linear-gradient(135deg,#020617_0%,#1e1b4b_45%,#020617_100%)] shadow-2xl shadow-violet-950/30">
            <SplashSphere />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent p-6">
              <p className="text-sm font-medium text-white/90">
                Rendered with React canvas and Three.js.
              </p>
              <p className="mt-1 text-sm text-white/60">
                Press <kbd className="rounded bg-white/10 px-1.5 py-0.5">d</kbd>{" "}
                to toggle the app theme.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
