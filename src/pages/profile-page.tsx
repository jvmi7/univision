import { useConnectModal } from "@rainbow-me/rainbowkit"
import { animate, motion, useReducedMotion } from "framer-motion"
import { useEffect, useMemo, useRef, useState } from "react"
import { MoonStar, SunMedium } from "lucide-react"
import { Link } from "react-router-dom"
import { isAddress, zeroAddress } from "viem"
import {
  useAccount,
  useChainId,
  useReadContract,
  useSimulateContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { HatchingSpriteAnimation } from "@/components/unity-pet/hatching-sprite-animation"
import {
  deterministicCompanionFromSeed,
  getUnityPetPortraitUrl,
  rollRandomHatchedCompanion,
  unityPetEggUrl,
  type UnityPetStage,
  type UnityPetTheme,
} from "@/components/unity-pet/unity-pet-assets"
import { LocalChainDevPanel } from "@/components/local-chain-dev-panel"
import { MeadowScene } from "@/components/meadow-scene"
import { ProfileWalletMenu } from "@/components/profile-wallet-menu"
import { UnityPetCard } from "@/components/unity-pet/unity-pet-card"
import {
  UNITY_PET_AURA_POINTS_MAX,
  type UnityPetStats,
} from "@/components/unity-pet/unity-pet-types"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import { profileRegistryAbi } from "@/lib/abis/profile-registry"
import {
  isFakeUniConfigured,
  isLocalNftConfigured,
  isProfileRegistryConfigured,
  LOCAL_CHAIN,
  profileRegistryAddress,
} from "@/lib/local-chain-config"
import {
  defaultProfileUsernameFromAddress,
  PROFILE_USERNAME_MAX_LEN,
  sanitizeProfileUsername,
} from "@/lib/profile-username"
import {
  extractProfileAura,
  getProfileDetail,
  mapRepByCategoryToUnityPetStats,
  profileAuraDisplayTotal,
} from "@/lib/profile-api"
import { useDocumentTheme } from "@/hooks/use-document-theme"

const zeroPetStats: UnityPetStats = {
  researcher: 0,
  builder: 0,
  trader: 0,
  liquidityProvider: 0,
  governanceParticipant: 0,
  communityMember: 0,
}

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

const profileTopBarButtonClass =
  "pointer-events-auto border-white/25 bg-background/55 text-foreground shadow-lg backdrop-blur-md hover:bg-background/75 dark:border-white/15 dark:bg-background/40"

export function ProfilePage() {
  const { address, isConnected, status } = useAccount()
  const { setTheme } = useTheme()
  const resolved = useDocumentTheme()
  const isDark = resolved === "dark"
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { openConnectModal } = useConnectModal()
  const walletBusy = status === "connecting" || status === "reconnecting"
  /** Onchain profile flow: `ProfileRegistry.registerName` only (no ERC-721 `mint`). */
  const profileRegisterOnchain = Boolean(profileRegistryAddress)
  const profileReadEnabled =
    profileRegisterOnchain &&
    Boolean(address) &&
    isConnected &&
    chainId === LOCAL_CHAIN.id

  const {
    data: primaryWallet,
    status: primaryReadStatus,
    refetch: refetchPrimaryWallet,
  } = useReadContract({
    address: (profileRegistryAddress ?? zeroAddress) as `0x${string}`,
    abi: profileRegistryAbi,
    functionName: "getPrimaryWallet",
    args: [address ?? zeroAddress],
    chainId: LOCAL_CHAIN.id,
    query: { enabled: profileReadEnabled },
  })

  const hasPrimaryWallet =
    primaryReadStatus === "success" &&
    primaryWallet !== undefined &&
    primaryWallet !== zeroAddress

  const {
    data: profileTuple,
    status: profileReadStatus,
    refetch: refetchProfileTuple,
  } = useReadContract({
    address: (profileRegistryAddress ?? zeroAddress) as `0x${string}`,
    abi: profileRegistryAbi,
    functionName: "getProfile",
    args: hasPrimaryWallet ? [primaryWallet as `0x${string}`] : undefined,
    chainId: LOCAL_CHAIN.id,
    query: { enabled: profileReadEnabled && hasPrimaryWallet },
  })

  const onchainUsername =
    profileTuple && Array.isArray(profileTuple)
      ? (profileTuple[0] as string)
      : ""
  const hasOnchainProfile =
    profileReadEnabled &&
    profileReadStatus === "success" &&
    onchainUsername.length > 0

  const {
    writeContract: writeOnchainTx,
    data: mintTxHash,
    error: mintWriteError,
    isPending: mintWritePending,
    reset: resetMintWrite,
  } = useWriteContract()

  const {
    data: mintReceipt,
    isLoading: mintConfirmPending,
    isSuccess: mintReceiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  })

  const [mintError, setMintError] = useState<string | null>(null)
  const [petName, setPetName] = useState("Companion")
  const [registerUsername, setRegisterUsername] = useState("")
  const reduceMotion = useReducedMotion()
  const [companion, setCompanion] = useState<CompanionSnapshot>({ hatched: false })
  const hasHatched = companion.hatched === true

  const resolvedRegisterName = useMemo(() => {
    if (!address || !profileRegistryAddress) {
      return ""
    }
    const s = sanitizeProfileUsername(registerUsername)
    return s.length > 0 ? s : defaultProfileUsernameFromAddress(address)
  }, [address, registerUsername])

  /** Offline / demo hatch: blank field → same deterministic default as on-chain registration. */
  const offlineRevealPetName = useMemo(() => {
    const s = sanitizeProfileUsername(registerUsername)
    if (s.length > 0) {
      return s
    }
    if (address) {
      return defaultProfileUsernameFromAddress(address)
    }
    return "user"
  }, [registerUsername, address])

  const nameLookupEnabled =
    profileRegisterOnchain &&
    Boolean(profileRegistryAddress && address) &&
    resolvedRegisterName.length >= 1 &&
    chainId === LOCAL_CHAIN.id &&
    isConnected &&
    !hasHatched &&
    !hasOnchainProfile

  const {
    data: usernameOwnerWallet,
    status: usernameLookupStatus,
    error: usernameLookupError,
  } = useReadContract({
    address: (profileRegistryAddress ?? zeroAddress) as `0x${string}`,
    abi: profileRegistryAbi,
    functionName: "usernameToWallet",
    args: [resolvedRegisterName],
    chainId: LOCAL_CHAIN.id,
    query: { enabled: nameLookupEnabled },
  })

  const usernameTaken =
    nameLookupEnabled &&
    usernameLookupStatus === "success" &&
    usernameOwnerWallet !== undefined &&
    usernameOwnerWallet !== zeroAddress

  const registerNameSimulate = useSimulateContract({
    address: (profileRegistryAddress ?? zeroAddress) as `0x${string}`,
    abi: profileRegistryAbi,
    functionName: "registerName",
    args: [resolvedRegisterName],
    chainId: LOCAL_CHAIN.id,
    query: {
      enabled:
        profileRegisterOnchain &&
        Boolean(profileRegistryAddress && address) &&
        resolvedRegisterName.length >= 1 &&
        chainId === LOCAL_CHAIN.id &&
        isConnected &&
        !hasHatched &&
        !hasOnchainProfile,
    },
  })

  const [mintPhase, setMintPhase] = useState<"idle" | "hatching">("idle")
  const [cardStats, setCardStats] = useState<UnityPetStats>(zeroPetStats)
  const [auraPoints, setAuraPoints] = useState(0)
  /** Max aura for this profile (badge + “X of Y” rep line). From API when present, else on-chain derive cap. */
  const [auraTotalCap, setAuraTotalCap] = useState(UNITY_PET_AURA_POINTS_MAX)
  /** `onHatchComplete` timestamp for offline derive when the card entrance animation finishes. */
  const hatchCreatedAtRef = useRef<bigint>(0n)
  /** After hidden wait: card is allowed to spring in (hatched users only). */
  const [cardRevealStarted, setCardRevealStarted] = useState(false)
  const auraAnimRef = useRef<ReturnType<typeof animate> | null>(null)
  const statsRevealGuardRef = useRef(false)
  /** After Mint + hatch, skip the delayed entrance timer (card is already shown). */
  const skipCardEntranceDelayRef = useRef(false)
  /** Prevents duplicate `onHatchComplete` (e.g. Strict Mode / release + tail race). */
  const hatchCompleteGuardRef = useRef(false)
  /** Dedupes ProfileRegistry → UI hydration (Strict Mode + refetch). */
  const lastHydratedProfileKeyRef = useRef("")
  /** Invalidates in-flight `GET /api/profiles` when the on-chain profile identity changes. */
  const profileApiFetchGenRef = useRef(0)

  /**
   * Meadow entrance must run **before** the ProfileRegistry hydration effect below.
   * On the commit where `profileTuple` first arrives, `hasHatched` is still false until
   * hydration runs; this effect resets `cardRevealStarted`. If hydration ran first and
   * then this effect, the reset would win the batch and the next run would consume
   * `skipCardEntranceDelayRef` without scheduling the delayed reveal — leaving the card
   * stuck at opacity 0 for returning profiles.
   */
   
  useEffect(() => {
    if (!hasHatched) {
      setCardRevealStarted(false)
      statsRevealGuardRef.current = false
      return
    }

    if (reduceMotion) {
      setCardRevealStarted(true)
      const fromChain =
        profileRegisterOnchain &&
        profileReadEnabled &&
        profileReadStatus === "success" &&
        onchainUsername.length > 0
      if (!fromChain) {
        setCardStats(zeroPetStats)
        setAuraPoints(0)
      }
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
  }, [
    hasHatched,
    reduceMotion,
    profileRegisterOnchain,
    profileReadEnabled,
    profileReadStatus,
    onchainUsername,
  ])
   

   
  useEffect(() => {
    if (!profileReadEnabled || !profileTuple || !Array.isArray(profileTuple)) {
      return
    }
    const [username, linkedWallet, createdAt] = profileTuple as [
      string,
      `0x${string}`,
      bigint,
    ]
    if (!username) {
      return
    }

    const dedupeKey = `${username}:${createdAt.toString()}`
    if (lastHydratedProfileKeyRef.current === dedupeKey) {
      return
    }
    lastHydratedProfileKeyRef.current = dedupeKey

    console.log("[univision] ProfileRegistry getProfile", {
      username,
      linkedWallet,
      createdAt: createdAt.toString(),
      // note: "REP + aura: GET /api/profiles/<connectedWallet> (repByCategory, aura). Contract has no scores.",
    })

    const { theme, stage } = deterministicCompanionFromSeed(username, createdAt)

    setPetName(username)
    skipCardEntranceDelayRef.current = true
    setCardRevealStarted(true)
    statsRevealGuardRef.current = true
    setCompanion({ hatched: true, theme, stage })
    /** REP + aura come from `GET /api/profiles/<wallet>` (following effect); avoid a misleading pre-API flash. */
    setCardStats(zeroPetStats)
    setAuraTotalCap(UNITY_PET_AURA_POINTS_MAX)
    setAuraPoints(0)
    auraAnimRef.current?.stop()
  }, [profileReadEnabled, profileTuple])
   

  /** Load REP + aura from the API whenever we have a valid wallet — independent of chain or on-chain registry username. */
  useEffect(() => {
    if (!isConnected || !address || !isAddress(address)) {
      console.log('no isConnected or address or isAddress(address)')
      return
    }

    const wallet = address as `0x${string}`

    const applyApiFailureFallback = () => {
      setCardStats(zeroPetStats)
      setAuraTotalCap(1)
      setAuraPoints(0)
      auraAnimRef.current?.stop()
    }
    console.log('keep going')

    const applyDetail = (detail: NonNullable<Awaited<ReturnType<typeof getProfileDetail>>>) => {
      const mapped = mapRepByCategoryToUnityPetStats(detail.repByCategory)
      const rawAura = extractProfileAura(detail)
      console.log('mapped', mapped)

      if (mapped === null && rawAura === null) {
        applyApiFailureFallback()
        return
      }
      console.log('keep going 1')

      if (mapped) {
        setCardStats(mapped)
      } else {
        setCardStats(zeroPetStats)
      }
      console.log('keep going 2')

      const auraTarget = rawAura !== null ? profileAuraDisplayTotal(rawAura) : 0

      const cap = Math.max(1, auraTarget)
      setAuraTotalCap(cap)
      setAuraPoints(0)
      auraAnimRef.current?.stop()
      auraAnimRef.current = animate(0, auraTarget, {
        type: "spring",
        stiffness: 36,
        damping: 13,
        mass: 1.25,
        restDelta: 0.35,
        onUpdate: (latest) =>
          setAuraPoints(Math.min(cap, Math.max(0, Math.round(latest)))),
      })
      console.log('keep going 3')
    }

    const fetchGen = ++profileApiFetchGenRef.current
    const ac = new AbortController()

    void (async () => {
      try {
        let detail = await getProfileDetail(wallet, { signal: ac.signal })
        console.log('detail', detail)
        if (
          detail === null &&
          profileReadEnabled &&
          hasPrimaryWallet &&
          primaryWallet &&
          primaryWallet !== zeroAddress &&
          primaryWallet.toLowerCase() !== wallet.toLowerCase()
        ) {
          detail = await getProfileDetail(primaryWallet as `0x${string}`, {
            signal: ac.signal,
          })
        }

        if (fetchGen !== profileApiFetchGenRef.current) {
          return
        }
        if (detail === null) {
          applyApiFailureFallback()
          return
        }
        applyDetail(detail)
      } catch (err: unknown) {
        if (fetchGen !== profileApiFetchGenRef.current) {
          return
        }
        if (err instanceof DOMException && err.name === "AbortError") {
          return
        }
        applyApiFailureFallback()
      }
    })()

    return () => ac.abort()
  }, [
    isConnected,
    address,
    profileReadEnabled,
    hasPrimaryWallet,
    primaryWallet,
  ])

  const assignedAuraFull = Math.max(0, Math.round(auraTotalCap / 3))
  const assignedAura =
    auraPoints >= auraTotalCap
      ? assignedAuraFull
      : Math.round((assignedAuraFull * auraPoints) / Math.max(1, auraTotalCap))

  const portraitUrl =
    companion.hatched === true
      ? getUnityPetPortraitUrl({
          kind: "hatched",
          theme: companion.theme,
          stage: companion.stage,
        })
      : getUnityPetPortraitUrl({ kind: "egg" })

  useEffect(() => {
    return () => {
      auraAnimRef.current?.stop()
      auraAnimRef.current = null
    }
  }, [])

   
  useEffect(() => {
    if (isConnected) {
      return
    }
    setCompanion({ hatched: false })
    lastHydratedProfileKeyRef.current = ""
    hatchCreatedAtRef.current = 0n
    setPetName("Companion")
    setRegisterUsername("")
    setCardStats(zeroPetStats)
    setAuraTotalCap(UNITY_PET_AURA_POINTS_MAX)
    setAuraPoints(0)
    setCardRevealStarted(false)
    statsRevealGuardRef.current = false
    if (mintPhase !== "hatching") {
      return
    }
    setMintPhase("idle")
    resetMintWrite()
  }, [isConnected, mintPhase, resetMintWrite])
   

   
  useEffect(() => {
    if (mintPhase !== "hatching" || !profileRegisterOnchain) {
      return
    }
    if (!mintWriteError) {
      return
    }
    setMintPhase("idle")
    setMintError(
      "message" in mintWriteError ? mintWriteError.message : String(mintWriteError),
    )
    resetMintWrite()
  }, [mintPhase, profileRegisterOnchain, mintWriteError, resetMintWrite])

  useEffect(() => {
    if (mintPhase !== "hatching" || !profileRegisterOnchain || !mintTxHash) {
      return
    }
    if (mintConfirmPending || !mintReceipt) {
      return
    }
    if (mintReceipt.status === "success") {
      return
    }
    setMintPhase("idle")
    setMintError("Onchain transaction did not succeed.")
    resetMintWrite()
  }, [
    mintPhase,
    profileRegisterOnchain,
    mintTxHash,
    mintConfirmPending,
    mintReceipt,
    resetMintWrite,
  ])
   

  const onMint = () => {
    setMintError(null)
    if (!isConnected || !address) {
      openConnectModal?.()
      return
    }

    hatchCompleteGuardRef.current = false

    if (profileRegisterOnchain) {
      if (chainId !== LOCAL_CHAIN.id) {
        switchChain?.({ chainId: LOCAL_CHAIN.id })
        setMintError("Switch to Anvil Local, then tap Mint again.")
        return
      }
      if (!address) {
        return
      }
      if (usernameTaken) {
        setMintError("This name is already taken. Choose another.")
        return
      }
      if (nameLookupEnabled && usernameLookupStatus === "error") {
        setMintError(
          usernameLookupError?.message ??
            "Could not verify name availability. Try again.",
        )
        return
      }
      const nameForTx = resolvedRegisterName
      if (!nameForTx) {
        setMintError("Could not resolve a profile name for registration.")
        return
      }
      resetMintWrite()
      const request = registerNameSimulate.data?.request
      if (!request) {
        setMintError(
          registerNameSimulate.isError
            ? (registerNameSimulate.error?.message ??
                "Profile registration simulation failed.")
            : "Still preparing registration — wait a moment and tap Mint again.",
        )
        return
      }
      writeOnchainTx(request)
      setMintPhase("hatching")
      return
    }

    setMintPhase("hatching")
  }

  const onHatchComplete = () => {
    if (hatchCompleteGuardRef.current) {
      return
    }
    hatchCompleteGuardRef.current = true
    if (profileRegistryAddress) {
      console.log(
        "[univision] Profile registered — registry:",
        profileRegistryAddress,
        "name:",
        resolvedRegisterName,
        "tx:",
        mintTxHash,
      )
    }
    if (profileRegisterOnchain) {
      setPetName(resolvedRegisterName)
    } else {
      setPetName(offlineRevealPetName)
    }
    const nowCreated = BigInt(Math.floor(Date.now() / 1000))
    hatchCreatedAtRef.current = nowCreated
    const rolled = profileRegisterOnchain
      ? deterministicCompanionFromSeed(
          resolvedRegisterName || petName,
          nowCreated,
        )
      : rollRandomHatchedCompanion()
    skipCardEntranceDelayRef.current = true
    setCardRevealStarted(true)
    setCompanion({ hatched: true, theme: rolled.theme, stage: rolled.stage })
    setMintPhase("idle")
    setCardStats(zeroPetStats)
    setAuraTotalCap(UNITY_PET_AURA_POINTS_MAX)
    setAuraPoints(0)
    statsRevealGuardRef.current = false
    resetMintWrite()
    setMintError(null)
    if (profileRegisterOnchain) {
      void refetchPrimaryWallet()
      void refetchProfileTuple()
    }
  }

  /** Lookup free + simulation succeeded — required before Mint (on-chain path). */
  const onchainNameValidAndAvailable =
    nameLookupEnabled &&
    usernameLookupStatus === "success" &&
    usernameOwnerWallet !== undefined &&
    usernameOwnerWallet === zeroAddress &&
    Boolean(registerNameSimulate.data?.request) &&
    !registerNameSimulate.isError

  const mintPrepPending =
    profileRegisterOnchain &&
    isConnected &&
    chainId === LOCAL_CHAIN.id &&
    mintPhase === "idle" &&
    !registerNameSimulate.isError &&
    !registerNameSimulate.data?.request &&
    (registerNameSimulate.isPending ||
      registerNameSimulate.isFetching ||
      (nameLookupEnabled && usernameLookupStatus === "pending"))

  const mintActionDisabled =
    isConnected &&
    (mintPhase === "hatching" ||
      mintPrepPending ||
      (profileRegisterOnchain &&
        mintPhase === "idle" &&
        !onchainNameValidAndAvailable))

  return (
    <main className="fixed inset-0 h-svh w-full overflow-hidden bg-black text-white">
      <MeadowScene theme={resolved} />
      {/* Readability over the meadow near the bottom UI — avoid a full-screen wash that hides the canvas */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-background/35 to-transparent dark:from-black/45" />

      <div className="absolute right-4 top-4 z-20">
        <ProfileWalletMenu />
      </div>

      {isFakeUniConfigured() ||
      isLocalNftConfigured() ||
      isProfileRegistryConfigured() ? (
        <div className="pointer-events-none absolute bottom-6 left-4 z-20">
          <LocalChainDevPanel />
        </div>
      ) : null}

      <div className="absolute left-4 top-4 z-10 flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className={profileTopBarButtonClass}>
          <Link to="/">Back</Link>
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={cn(profileTopBarButtonClass, "gap-2")}
          onClick={() => setTheme(isDark ? "light" : "dark")}
        >
          {isDark ? <SunMedium /> : <MoonStar />}
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
                  "text-white/80"
                }`}
              >
                {mintPhase === "hatching"
                  ? profileRegisterOnchain
                    ? mintWritePending
                      ? "Confirm profile registration in your wallet…"
                      : mintConfirmPending
                        ? "Registering onchain — hatching your companion…"
                        : "Hatching your companion…"
                    : "Hatching your companion…"
                  : isConnected
                    ? profileRegisterOnchain
                      ? "Choose an onchain profile name. We check it is available before you register and reveal your Unity Pet."
                      : "Name your companion, then mint to reveal your Unity Pet."
                    : "Connect your wallet to mint and reveal your Unity Pet."}
              </p>
              {isConnected && mintPhase === "idle" ? (
                <label className="block w-full space-y-1.5 text-left">
                  <span
                    className={`text-[0.65rem] font-medium uppercase tracking-[0.14em] ${
                      isDark ? "text-white/55" : "text-slate-700/80"
                    }`}
                  >
                    {profileRegisterOnchain
                      ? `Onchain name (a–z, 0–9, max ${PROFILE_USERNAME_MAX_LEN})`
                      : "Pet name (a–z, 0–9)"}
                  </span>
                  <input
                    className={cn(
                      "w-full rounded-xl border border-white/25 bg-white/[0.08] px-3 py-2 text-sm text-foreground outline-none",
                      "placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-white/25",
                      "dark:border-white/15 dark:bg-black/[0.2]",
                      profileRegisterOnchain &&
                        usernameTaken &&
                        "border-red-400/55 focus-visible:ring-red-400/30 dark:border-red-400/40",
                    )}
                    maxLength={PROFILE_USERNAME_MAX_LEN}
                    placeholder="Name"
                    type="text"
                    value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)}
                  />
                  {profileRegisterOnchain ? (
                    <div className="space-y-1">
                      {nameLookupEnabled &&
                      usernameLookupStatus === "pending" ? (
                        <p
                          className={`text-[0.7rem] leading-snug ${
                            isDark ? "text-white/55" : "text-slate-600/90"
                          }`}
                        >
                          Checking if this name is available…
                        </p>
                      ) : null}
                      {usernameTaken ? (
                        <p
                          className={`text-[0.7rem] leading-snug ${
                            isDark ? "text-red-300/90" : "text-red-700/90"
                          }`}
                        >
                          This name is already taken. Choose another.
                        </p>
                      ) : null}
                      {nameLookupEnabled &&
                      usernameLookupStatus === "error" &&
                      !usernameTaken ? (
                        <p
                          className={`text-[0.7rem] leading-snug ${
                            isDark ? "text-red-300/90" : "text-red-700/90"
                          }`}
                        >
                          {usernameLookupError?.message ??
                            "Could not verify this name. Try adjusting it."}
                        </p>
                      ) : null}
                      {registerNameSimulate.isError && !usernameTaken ? (
                        <p
                          className={`text-[0.7rem] leading-snug ${
                            isDark ? "text-red-300/90" : "text-red-700/90"
                          }`}
                        >
                          {registerNameSimulate.error?.shortMessage ??
                            registerNameSimulate.error?.message ??
                            "Registration cannot proceed with this name."}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </label>
              ) : null}
              {mintError ? (
                <p
                  className={`text-balance text-[0.7rem] leading-snug ${
                    "text-red-300/90"
                  }`}
                >
                  {mintError}
                </p>
              ) : null}
              <div className="flex min-h-9 w-full items-center justify-center">
                <Button
                  aria-busy={isConnected && mintPhase === "hatching"}
                  className="w-full min-w-[8rem] border-white/30 bg-white/25 text-foreground shadow-sm backdrop-blur-sm hover:bg-white/35 disabled:opacity-60 dark:border-white/20 dark:bg-white/15 dark:hover:bg-white/25 cursor-pointer"
                  disabled={
                    isConnected
                      ? mintActionDisabled
                      : walletBusy || !openConnectModal
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
                  {!isConnected
                    ? walletBusy
                      ? "Connecting…"
                      : "Connect wallet"
                    : mintPrepPending
                      ? "Preparing…"
                      : mintPhase === "hatching"
                        ? profileRegisterOnchain
                          ? "Registering…"
                          : "Revealing…"
                        : "Mint"}
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
                  holdUntilRelease={profileRegisterOnchain}
                  release={mintReceiptSuccess}
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
                // Registry path: stats + aura come from `GET /api/profiles/:id` (separate effect).
                if (profileRegisterOnchain) {
                  console.log('profileRegisterOnchain')
                  return
                }
                const created = hatchCreatedAtRef.current
                if (created === 0n) {
                  return
                }
                const name = petName.trim()
                const pathParam: string | undefined =
                  address && isAddress(address)
                    ? address
                    : name && isAddress(name as `0x${string}`)
                      ? name
                      : name.length > 0
                        ? name
                        : undefined
                const runAuraSpring = (auraTarget: number) => {
                  const cap = Math.max(1, auraTarget)
                  setAuraTotalCap(cap)
                  setAuraPoints(0)
                  auraAnimRef.current?.stop()
                  auraAnimRef.current = animate(0, auraTarget, {
                    type: "spring",
                    stiffness: 36,
                    damping: 13,
                    mass: 1.25,
                    restDelta: 0.35,
                    onUpdate: (latest) =>
                      setAuraPoints(
                        Math.min(cap, Math.max(0, Math.round(latest))),
                      ),
                  })
                }
                if (!pathParam) {
                  setCardStats(zeroPetStats)
                  runAuraSpring(0)
                  return
                }
                void getProfileDetail(pathParam)
                  .then((detail) => {
                    if (!detail) {
                      setCardStats(zeroPetStats)
                      runAuraSpring(0)
                      return
                    }
                    const mapped = mapRepByCategoryToUnityPetStats(
                      detail.repByCategory,
                    )
                    const rawAura = extractProfileAura(detail)
                    setCardStats(mapped ?? zeroPetStats)
                    const auraTarget =
                      rawAura !== null ? profileAuraDisplayTotal(rawAura) : 0
                    runAuraSpring(auraTarget)
                  })
                  .catch(() => {
                    setCardStats(zeroPetStats)
                    runAuraSpring(0)
                  })
              }}
            >
              <UnityPetCard
                assignedReputationAura={assignedAura}
                auraPoints={auraPoints}
                className={cn("w-full", MEADOW_PROFILE_GLASS)}
                reputationSummaryNumbers={{
                  totalAura: auraTotalCap,
                  assignedReputationAura: assignedAura,
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
