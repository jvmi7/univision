import { useEffect, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"
import { Link } from "react-router-dom"

import { MeadowScene } from "@/components/meadow-scene"
import { getUnityPetPortraitUrl } from "@/components/unity-pet/unity-pet-assets"
import { UnityPetCard } from "@/components/unity-pet/unity-pet-card"
import type { UnityPetStats } from "@/components/unity-pet/unity-pet-types"
import { useDocumentTheme } from "@/hooks/use-document-theme"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"

const demoPetStats: UnityPetStats = {
  researcher: 28,
  builder: 35,
  trader: 18,
  liquidityProvider: 42,
  governanceParticipant: 22,
  communityMember: 31,
}

export function ProfilePage() {
  const { setTheme } = useTheme()
  const resolved = useDocumentTheme()
  const isDark = resolved === "dark"
  const [petName, setPetName] = useState("Companion")

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setTheme(isDark ? "light" : "dark")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isDark, setTheme])

  return (
    <main className="fixed inset-0 h-svh w-full overflow-hidden bg-black text-foreground">
      <MeadowScene theme={resolved} />

      {/* Readability behind footer copy only — a full-screen `to-background` layer was washing the whole canvas gray over the mountains */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background/30 to-transparent" />

      <div
        className={`pointer-events-none absolute inset-x-0 bottom-0 p-6 text-center text-sm drop-shadow-sm ${
          isDark ? "text-white/70" : "text-slate-900/75"
        }`}
      >
        <p>
          Meadow view · Press{" "}
          <kbd className="rounded border border-white/25 bg-white/10 px-1.5 py-0.5 font-mono text-xs text-white/90">
            d
          </kbd>{" "}
          to change light
        </p>
      </div>

      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <Button
          asChild
          className="pointer-events-auto border-white/25 bg-background/55 text-foreground shadow-lg backdrop-blur-md hover:bg-background/75 dark:border-white/15 dark:bg-background/40"
          size="sm"
          variant="outline"
        >
          <Link to="/">Back</Link>
        </Button>
        <Button
          className="pointer-events-auto border-white/25 bg-background/55 text-foreground shadow-lg backdrop-blur-md hover:bg-background/75 dark:border-white/15 dark:bg-background/40"
          size="sm"
          variant="outline"
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
          {isDark ? "Daylight" : "Night sky"}
        </Button>
      </div>

      <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
        <UnityPetCard
          assignedReputationAura={24}
          auraPoints={72}
          className="pointer-events-auto w-full max-w-[min(44rem,calc(100vw-2rem))] border-white/25 bg-white/[0.06] shadow-none backdrop-blur-2xl dark:border-white/15 dark:bg-black/[0.12]"
          imageAlt={`${petName} portrait`}
          imageSrc={getUnityPetPortraitUrl({
            kind: "hatched",
            theme: "cute",
            stage: 2,
          })}
          petName={petName}
          onAssignReputation={() => {}}
          onPetNameChange={setPetName}
          size="large"
          stats={demoPetStats}
        />
      </div>
    </main>
  )
}
