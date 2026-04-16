import { useConnectModal } from "@rainbow-me/rainbowkit"
import { animate, motion, useReducedMotion } from "framer-motion"
import { useEffect, useRef, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"
import { Link } from "react-router-dom"
import { useAccount } from "wagmi"

import { MeadowScene } from "@/components/meadow-scene"
import { HatchingSpriteAnimation } from "@/components/unity-pet/hatching-sprite-animation"
import {
  getUnityPetPortraitUrl,
  rollRandomHatchedCompanion,
  unityPetEggUrl,
  type UnityPetStage,
  type UnityPetTheme,
} from "@/components/unity-pet/unity-pet-assets"
import { ProfileWalletMenu } from "@/components/profile-wallet-menu"
import { UnityPetCard } from "@/components/unity-pet/unity-pet-card"
import type { UnityPetStats } from "@/components/unity-pet/unity-pet-types"
import { useDocumentTheme } from "@/hooks/use-document-theme"
import { cn } from "@/lib/utils"
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

const zeroPetStats: UnityPetStats = {
  researcher: 0,
  builder: 0,
  trader: 0,
  liquidityProvider: 0,
  governanceParticipant: 0,
  communityMember: 0,
}

const TARGET_AURA_POINTS = 72
const TARGET_ASSIGNED_AURA = 24

/** Meadow-only beat: card stays fully hidden, then springs in (real-time `setTimeout`, not motion `delay`). */
const PET_CARD_ENTRANCE_DELAY_S = 1.5
const PET_CARD_ENTRANCE_DELAY_MS = Math.round(PET_CARD_ENTRANCE_DELAY_S * 1000)

/** Seconds after the mint panel is shown before the egg fades/scales in. */
const EGG_ENTRANCE_DELAY_S = 1
/** Starting scale for the egg entrance (very small → 1). */
const EGG_ENTRANCE_INITIAL_SCALE = 0.28

/** Matches `UnityPetCard` meadow glass (frosted panel over the scene). */
const MEADOW_PROFILE_GLASS =
  "border-white/25 bg-white/[0.06] shadow-none backdrop-blur-2xl [isolation:isolate] dark:border-white/15 dark:bg-black/[0.12]"

type CompanionSnapshot =
  | { hatched: false }
  | { hatched: true; theme: UnityPetTheme; stage: UnityPetStage }

export function ProfilePage() {
  const { isConnected, status } = useAccount()
  const { openConnectModal } = useConnectModal()
  const walletBusy = status === "connecting" || status === "reconnecting"
  const { setTheme } = useTheme()
  const resolved = useDocumentTheme()
  const isDark = resolved === "dark"
  const [petName, setPetName] = useState("Companion")
  const reduceMotion = useReducedMotion()
  const [companion, setCompanion] = useState<CompanionSnapshot>({ hatched: false })
  const hasHatched = companion.hatched === true
  const [mintPhase, setMintPhase] = useState<"idle" | "hatching">("idle")
  const [cardStats, setCardStats] = useState<UnityPetStats>(zeroPetStats)
  const [auraPoints, setAuraPoints] = useState(0)
  /** After hidden wait: card is allowed to spring in (hatched users only). */
  const [cardRevealStarted, setCardRevealStarted] = useState(false)
  const auraAnimRef = useRef<ReturnType<typeof animate> | null>(null)
  const statsRevealGuardRef = useRef(false)
  /** After Mint + hatch, skip the delayed entrance timer (card is already shown). */
  const skipCardEntranceDelayRef = useRef(false)

  const assignedAura =
    auraPoints >= TARGET_AURA_POINTS
      ? TARGET_ASSIGNED_AURA
      : Math.round((TARGET_ASSIGNED_AURA * auraPoints) / TARGET_AURA_POINTS)

  const portraitUrl =
    companion.hatched === true
      ? getUnityPetPortraitUrl({
          kind: "hatched",
          theme: companion.theme,
          stage: companion.stage,
        })
      : getUnityPetPortraitUrl({ kind: "egg" })

  /* eslint-disable react-hooks/set-state-in-effect -- meadow entrance + reduced-motion hydration */
  useEffect(() => {
    if (!hasHatched) {
      setCardRevealStarted(false)
      statsRevealGuardRef.current = false
      return
    }

    if (reduceMotion) {
      setCardRevealStarted(true)
      setCardStats(demoPetStats)
      setAuraPoints(TARGET_AURA_POINTS)
      return
    }

    if (skipCardEntranceDelayRef.current) {
      skipCardEntranceDelayRef.current = false
      return
    }

    const id = window.setTimeout(() => {
      setCardRevealStarted(true)
    }, PET_CARD_ENTRANCE_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [hasHatched, reduceMotion])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      auraAnimRef.current?.stop()
      auraAnimRef.current = null
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "d" || e.key === "D") setTheme(isDark ? "light" : "dark")
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isDark, setTheme])

  /* eslint-disable react-hooks/set-state-in-effect -- wallet disconnected mid-hatch */
  useEffect(() => {
    if (isConnected) {
      return
    }
    if (mintPhase !== "hatching") {
      return
    }
    setMintPhase("idle")
  }, [isConnected, mintPhase])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onMint = () => {
    setMintPhase("hatching")
  }

  const onHatchComplete = () => {
    const rolled = rollRandomHatchedCompanion()
    skipCardEntranceDelayRef.current = true
    setCardRevealStarted(true)
    setCompanion({ hatched: true, theme: rolled.theme, stage: rolled.stage })
    setMintPhase("idle")
    setCardStats(zeroPetStats)
    setAuraPoints(0)
    statsRevealGuardRef.current = false
  }

  return (
    <main className="fixed inset-0 h-svh w-full overflow-hidden bg-black text-foreground">
      <MeadowScene theme={resolved} />

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-background/30 to-transparent" />

      <div className="absolute right-4 top-4 z-20">
        <ProfileWalletMenu />
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

      {!hasHatched && (mintPhase === "idle" || mintPhase === "hatching") ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-end px-6 pb-[clamp(5rem,20vmin,11.5rem)] pt-24 sm:pb-[clamp(5.5rem,22vmin,13rem)]">
          <div className="pointer-events-auto flex max-w-sm flex-col items-center gap-16 text-center sm:gap-20">
            <motion.div
              className={cn(
                "w-full space-y-3 rounded-2xl px-8 py-8",
                MEADOW_PROFILE_GLASS,
              )}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      delay: EGG_ENTRANCE_DELAY_S,
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1],
                    }
              }
            >
              <p
                className={`text-balance text-sm ${
                  isDark ? "text-white/80" : "text-slate-900/85"
                }`}
              >
                {mintPhase === "hatching"
                  ? "Hatching your companion…"
                  : isConnected
                    ? "Reveal your Unity Pet"
                    : "Connect your wallet to mint and reveal your Unity Pet."}
              </p>
              <div className="flex min-h-9 w-full items-center justify-center">
                <Button
                  aria-busy={isConnected && mintPhase === "hatching"}
                  className="w-full min-w-[8rem] border-white/30 bg-white/25 text-foreground shadow-sm backdrop-blur-sm hover:bg-white/35 disabled:opacity-60 dark:border-white/20 dark:bg-white/15 dark:hover:bg-white/25"
                  disabled={
                    isConnected ? mintPhase === "hatching" : walletBusy || !openConnectModal
                  }
                  size="lg"
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (!isConnected) {
                      openConnectModal?.()
                      return
                    }
                    onMint()
                  }}
                >
                  {isConnected
                    ? "Mint"
                    : walletBusy
                      ? "Connecting…"
                      : "Connect wallet"}
                </Button>
              </div>
            </motion.div>
            <div className="relative aspect-[309/350] h-[min(37vh,17rem)] w-auto max-w-full shrink-0 translate-y-9 overflow-hidden rounded-2xl sm:translate-y-12">
              {mintPhase === "idle" || !isConnected ? (
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, scale: EGG_ENTRANCE_INITIAL_SCALE }
                  }
                  animate={{ opacity: 1, scale: 1 }}
                  transition={
                    reduceMotion
                      ? { duration: 0 }
                      : {
                          delay: EGG_ENTRANCE_DELAY_S,
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }
                  }
                >
                  <img
                    alt="Unhatched companion egg"
                    className="h-full w-full object-contain select-none drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
                    decoding="async"
                    draggable={false}
                    src={unityPetEggUrl}
                  />
                </motion.div>
              ) : (
                <HatchingSpriteAnimation
                  className="absolute inset-0 h-full w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
                  onComplete={onHatchComplete}
                />
              )}
            </div>
          </div>
        </div>
      ) : null}

      {hasHatched ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center p-4">
          <div
            className={cn(
              "w-full max-w-[min(54rem,calc(100vw-2rem))] transition-none",
              reduceMotion || cardRevealStarted
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0",
            )}
          >
            <motion.div
              className="w-full"
              initial={reduceMotion ? false : { marginTop: 32 }}
              animate={
                reduceMotion || cardRevealStarted ? { marginTop: 0 } : { marginTop: 32 }
              }
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      marginTop: {
                        type: "spring",
                        stiffness: 44,
                        damping: 18,
                        mass: 1.12,
                      },
                    }
              }
              onAnimationComplete={() => {
                if (reduceMotion || !cardRevealStarted) return
                if (statsRevealGuardRef.current) return
                statsRevealGuardRef.current = true
                setCardStats(demoPetStats)
                auraAnimRef.current?.stop()
                auraAnimRef.current = animate(0, TARGET_AURA_POINTS, {
                  type: "spring",
                  stiffness: 36,
                  damping: 13,
                  mass: 1.25,
                  restDelta: 0.35,
                  onUpdate: (latest) =>
                    setAuraPoints(
                      Math.min(TARGET_AURA_POINTS, Math.max(0, Math.round(latest))),
                    ),
                })
              }}
            >
              <UnityPetCard
                assignedReputationAura={assignedAura}
                auraPoints={auraPoints}
                className={cn("w-full", MEADOW_PROFILE_GLASS)}
                reputationSummaryNumbers={{
                  totalAura: TARGET_AURA_POINTS,
                  assignedReputationAura: TARGET_ASSIGNED_AURA,
                }}
                statFillLayout="spring"
                imageAlt={`${petName} portrait`}
                imageSrc={portraitUrl}
                petName={petName}
                onAssignReputation={() => {}}
                onPetNameChange={setPetName}
                size="large"
                stats={cardStats}
              />
            </motion.div>
          </div>
        </div>
      ) : null}

    </main>
  )
}
