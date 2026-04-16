import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"
import { Link, Navigate, useNavigate, useParams } from "react-router-dom"
import {
  formatUnits,
  getAddress,
  isAddress,
  zeroAddress,
} from "viem"
import {
  useAccount,
  useChainId,
  useSimulateContract,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { AssignRepDialog } from "@/components/assign-rep-dialog"
import { ClaimNameDialog } from "@/components/claim-name-dialog"
import { LinkWalletDialog } from "@/components/link-wallet-dialog"
import { LocalChainDevPanel } from "@/components/local-chain-dev-panel"
import { ProfileWalletMenu } from "@/components/profile-wallet-menu"
import { Button } from "@/components/ui/button"
import { HatchingSpriteAnimation } from "@/components/unity-pet/hatching-sprite-animation"
import { UnityPetCard } from "@/components/unity-pet/unity-pet-card"
import {
  getUnityPetPortraitUrl,
  rollRandomHatchedCompanion,
  unityPetEggUrl,
} from "@/components/unity-pet/unity-pet-assets"
import {
  loadCompanion,
  resolveCompanion,
  saveCompanion,
  type CompanionSnapshot,
} from "@/lib/companion-storage"
import {
  addPendingRep,
  getPendingRepFor,
  onPendingRepChange,
  reconcilePendingRepFor,
  type PendingRepByCategory,
} from "@/lib/pending-rep-storage"
import type { UnityPetStats } from "@/components/unity-pet/unity-pet-types"
import { useProfile } from "@/hooks/use-profile"
import { localNftMintToAbi } from "@/lib/abis/local-dev"
import { profileRegistryAbi } from "@/lib/abis/profile-registry"
import {
  isFakeUniConfigured,
  isLocalNftConfigured,
  LOCAL_CHAIN,
  localNftAddress,
  profileRegistryAddress,
} from "@/lib/local-chain-config"
import {
  REP_CATEGORY_NAMES,
  type ProfileData,
  type RepCategoryName,
} from "@/lib/profile-api"
import { cn } from "@/lib/utils"

const MEADOW_PROFILE_GLASS =
  "border-white/25 bg-white/[0.06] shadow-none backdrop-blur-2xl [isolation:isolate] dark:border-white/15 dark:bg-black/[0.12]"

const ZERO_STATS: UnityPetStats = {
  researcher: 0,
  builder: 0,
  trader: 0,
  liquidityProvider: 0,
  governanceParticipant: 0,
  communityMember: 0,
}

type ViewerMode = "self" | "visitor" | "anonymous"

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`
}

/** Format an 18-decimal wei-style BigInt string as a human number (max 2 dp). */
function formatAura(raw: string | undefined | null): string {
  if (!raw) return "0"
  try {
    const parsed = Number(formatUnits(BigInt(raw), 18))
    if (!Number.isFinite(parsed)) return "0"
    return parsed.toLocaleString(undefined, { maximumFractionDigits: 2 })
  } catch {
    return "0"
  }
}

function auraAsNumber(raw: string | undefined | null): number {
  if (!raw) return 0
  try {
    const n = Number(formatUnits(BigInt(raw), 18))
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}

function buildStatsFromRep(
  profile: ProfileData | null | undefined,
  pendingByCategory: PendingRepByCategory = {},
): UnityPetStats {
  if (!profile) {
    // No profile data yet — only the pending overlay contributes.
    return {
      researcher: Math.max(0, Math.round(pendingByCategory.research ?? 0)),
      builder: Math.max(0, Math.round(pendingByCategory.builder ?? 0)),
      trader: Math.max(0, Math.round(pendingByCategory.trader ?? 0)),
      liquidityProvider: Math.max(
        0,
        Math.round(pendingByCategory.liquidity ?? 0),
      ),
      governanceParticipant: Math.max(
        0,
        Math.round(pendingByCategory.governance ?? 0),
      ),
      communityMember: Math.max(
        0,
        Math.round(pendingByCategory.community ?? 0),
      ),
    }
  }
  const r = profile.repByCategory
  const toNum = (v: string | undefined) => {
    if (!v) return 0
    const n = Number(v)
    return Number.isFinite(n) ? Math.round(n) : 0
  }
  const merge = (key: RepCategoryName, base: number): number =>
    Math.max(0, base + (pendingByCategory[key] ?? 0))
  return {
    researcher: merge("research", toNum(r.research)),
    builder: merge("builder", toNum(r.builder)),
    trader: merge("trader", toNum(r.trader)),
    liquidityProvider: merge("liquidity", toNum(r.liquidity)),
    governanceParticipant: merge("governance", toNum(r.governance)),
    communityMember: merge("community", toNum(r.community)),
  }
}

/**
 * Max stat value for the bar UI. Scales up with the highest category so that
 * categories with very few points are still visible rather than pinned to 100%.
 */
function computeStatMax(stats: UnityPetStats): number {
  const top = Math.max(...Object.values(stats))
  if (top <= 10) return 10
  if (top <= 25) return 25
  if (top <= 50) return 50
  return Math.ceil((top * 1.25) / 10) * 10
}

export type ProfilePageProps = {
  /** Identifier from the route: either a username or `0x…` wallet. */
  identifier?: string
}

export function ProfilePage({ identifier: identifierProp }: ProfilePageProps) {
  const { identifier: identifierParam } = useParams<{ identifier: string }>()
  const rawIdentifier = identifierProp ?? identifierParam

  const { address, isConnected, status: walletStatus } = useAccount()
  const walletBusy = walletStatus === "connecting" || walletStatus === "reconnecting"

  // ── Redirect the no-identifier case to the right URL ──────────────────
  // (`<Navigate>` happens below once we know the user's username — or wallet.)
  const ownProfileQuery = useProfile(isConnected && address ? address : undefined)

  if (!rawIdentifier) {
    if (!isConnected || !address) {
      return <NoWalletConnectPrompt walletBusy={walletBusy} />
    }
    if (ownProfileQuery.isLoading) {
      return <ProfileLoadingFallback />
    }
    const username = ownProfileQuery.data?.username
    const target = username && username.length > 0 ? username : address
    return <Navigate replace to={`/${target}`} />
  }

  return <ProfilePageInner rawIdentifier={rawIdentifier} />
}

function ProfilePageInner({ rawIdentifier }: { rawIdentifier: string }) {
  const { address, isConnected, status } = useAccount()
  const walletBusy = status === "connecting" || status === "reconnecting"
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { openConnectModal } = useConnectModal()
  const navigate = useNavigate()

  const profileQuery = useProfile(rawIdentifier)
  const profile = profileQuery.data

  // If the URL is a wallet address but the profile has a username, swap to
  // the canonical `/username` form. Using `replace` keeps the back stack clean.
  const identifierIsWalletForRedirect = isAddress(rawIdentifier)
  /* eslint-disable react-hooks/set-state-in-effect -- synchronising the URL
     to match the authoritative profile record is a cross-system transition. */
  useEffect(() => {
    if (!identifierIsWalletForRedirect) return
    const username = profile?.username
    if (!username || username.length === 0) return
    if (rawIdentifier.toLowerCase() === username.toLowerCase()) return
    navigate(`/${username}`, { replace: true })
  }, [identifierIsWalletForRedirect, profile?.username, rawIdentifier, navigate])
  /* eslint-enable react-hooks/set-state-in-effect */

  // Resolved display values (work even for unregistered wallet addresses).
  const identifierIsWallet = isAddress(rawIdentifier)
  const displayWallet: `0x${string}` | null = (() => {
    if (profile?.primaryWallet) {
      try {
        return getAddress(profile.primaryWallet) as `0x${string}`
      } catch {
        return profile.primaryWallet as `0x${string}`
      }
    }
    if (identifierIsWallet) return getAddress(rawIdentifier) as `0x${string}`
    return null
  })()

  const displayName =
    (profile?.username && profile.username.length > 0 && profile.username) ||
    (displayWallet ? shortWallet(displayWallet) : rawIdentifier)

  const viewerMode: ViewerMode = useMemo(() => {
    if (!isConnected || !address) return "anonymous"
    if (!displayWallet) return "visitor"
    return displayWallet.toLowerCase() === address.toLowerCase()
      ? "self"
      : "visitor"
  }, [isConnected, address, displayWallet])

  // ── Live REP / Aura ───────────────────────────────────────────────────
  // Optimistic REP overlay — see `pending-rep-storage` for the full story.
  // We subscribe to the store with a version counter; whenever entries are
  // added or reconciled, the memos below re-run and the stats/Top-REP line
  // visibly bump without waiting for the indexer.
  const [pendingVersion, setPendingVersion] = useState(0)
  useEffect(() => {
    const unsubscribe = onPendingRepChange(() =>
      setPendingVersion((v) => v + 1),
    )
    return unsubscribe
  }, [])

  const pending = useMemo(() => {
    return getPendingRepFor(displayWallet ?? undefined)
    // `pendingVersion` is a deliberate re-render trigger (storage is off-tree).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayWallet, pendingVersion])

  // Collapse the overlay the moment the API catches up: if the counted total
  // already reaches `baseline + amount`, the pending entry is dropped. Runs
  // on every profile refetch.
  useEffect(() => {
    if (!displayWallet || !profile) return
    const apiRep: PendingRepByCategory = {}
    for (const key of REP_CATEGORY_NAMES) {
      const raw = profile.repByCategory[key]
      if (raw === undefined) continue
      const n = Number(raw)
      if (Number.isFinite(n)) apiRep[key] = n
    }
    reconcilePendingRepFor(displayWallet, apiRep)
  }, [displayWallet, profile])

  const stats = useMemo(
    () => buildStatsFromRep(profile, pending.totals),
    [profile, pending.totals],
  )
  const statMax = useMemo(() => computeStatMax(stats), [stats])
  const auraHuman = formatAura(profile?.aura)
  const auraNumber = auraAsNumber(profile?.aura)

  // ── Companion (self-only UX state) ────────────────────────────────────
  // Lazy-init from localStorage so returning users see their existing pfp.
  const [companion, setCompanion] = useState<CompanionSnapshot>(() =>
    loadCompanion(address),
  )
  const hasHatched = companion.hatched === true
  const [mintPhase, setMintPhase] = useState<"idle" | "hatching">("idle")

  /* eslint-disable react-hooks/set-state-in-effect -- synchronize local state
     to the active wallet: when the user switches wallets, re-read the hatched
     companion for that address (or clear it if no companion is stored). */
  useEffect(() => {
    setCompanion(loadCompanion(address))
    setMintPhase("idle")
  }, [address])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Onchain mint (local-dev NFT) ──────────────────────────────────────
  const nftMintOnchain = Boolean(localNftAddress)

  const {
    writeContract: writeMintNft,
    data: mintTxHash,
    error: mintWriteError,
    isPending: mintWritePending,
    reset: resetMintWrite,
  } = useWriteContract()

  const {
    isLoading: mintConfirmPending,
    isSuccess: mintReceiptSuccess,
  } = useWaitForTransactionReceipt({
    hash: mintTxHash,
  })

  const mintSimulate = useSimulateContract({
    address: (localNftAddress ?? zeroAddress) as `0x${string}`,
    abi: localNftMintToAbi,
    functionName: "mint",
    args: [(address ?? zeroAddress) as `0x${string}`],
    chainId: LOCAL_CHAIN.id,
    query: {
      enabled:
        nftMintOnchain &&
        Boolean(localNftAddress && address) &&
        chainId === LOCAL_CHAIN.id &&
        isConnected &&
        viewerMode === "self" &&
        !hasHatched,
    },
  })

  const [mintError, setMintError] = useState<string | null>(null)

  /* eslint-disable react-hooks/set-state-in-effect -- surface writeContract
     failures so the user sees them and reset the write state so retries work. */
  useEffect(() => {
    if (!mintWriteError) return
    setMintError(
      "message" in mintWriteError
        ? mintWriteError.message.split("\n")[0] ?? String(mintWriteError)
        : String(mintWriteError),
    )
    setMintPhase("idle")
    resetMintWrite()
  }, [mintWriteError, resetMintWrite])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onMint = () => {
    setMintError(null)
    if (!isConnected || !address) {
      openConnectModal?.()
      return
    }

    if (nftMintOnchain) {
      if (chainId !== LOCAL_CHAIN.id) {
        switchChain?.({ chainId: LOCAL_CHAIN.id })
        setMintError("Switch to Anvil Local, then tap Hatch again.")
        return
      }
      resetMintWrite()
      const request = mintSimulate.data?.request
      if (!request) {
        setMintError(
          mintSimulate.isError
            ? (mintSimulate.error?.message ?? "Mint simulation failed.")
            : "Still preparing — wait a moment and tap Hatch again.",
        )
        return
      }
      setMintPhase("hatching")
      writeMintNft(request)
      return
    }

    // No onchain NFT configured — play the animation locally only.
    setMintPhase("hatching")
  }

  const onHatchComplete = () => {
    // Roll the art, persist, and transition to hatched. Guarded by mintPhase
    // so the animation's `onComplete` firing after phase is already idle is
    // a no-op.
    if (mintPhase !== "hatching") return
    const rolled = rollRandomHatchedCompanion()
    const next: CompanionSnapshot = {
      hatched: true,
      theme: rolled.theme,
      stage: rolled.stage,
    }
    setCompanion(next)
    saveCompanion(address, next)
    setMintPhase("idle")
    setMintError(null)
  }

  const mintPrepPending =
    nftMintOnchain &&
    isConnected &&
    chainId === LOCAL_CHAIN.id &&
    viewerMode === "self" &&
    !hasHatched &&
    !mintSimulate.isError &&
    !mintSimulate.data?.request &&
    (mintSimulate.isPending || mintSimulate.isFetching)

  const mintInFlight = mintWritePending || mintConfirmPending

  // ── Pet portrait ──────────────────────────────────────────────────────
  // Self view: show the user's own hatched companion (driven by mint state).
  // Visitor view: show that wallet's stored companion if we have it in this
  // browser, otherwise a deterministic demo companion (half the time) or egg.
  // Either way, the connected wallet is excluded from the random roll so its
  // real state (egg until they actually hatch) is preserved.
  const displayedCompanion: CompanionSnapshot = useMemo(() => {
    if (viewerMode === "self") return companion
    return resolveCompanion(displayWallet ?? undefined, {
      excludeWallets: [address],
    })
  }, [viewerMode, companion, displayWallet, address])

  const portraitUrl = useMemo(() => {
    if (displayedCompanion.hatched === true) {
      return getUnityPetPortraitUrl({
        kind: "hatched",
        theme: displayedCompanion.theme,
        stage: displayedCompanion.stage,
      })
    }
    return unityPetEggUrl
  }, [displayedCompanion])

  // ── Assign REP / Claim name / Link wallet dialogs ─────────────────────
  const [assignOpen, setAssignOpen] = useState(false)
  const [claimOpen, setClaimOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const viewerProfile = useProfile(
    isConnected && address ? address : undefined,
  )
  const queryClient = useQueryClient()

  // Post-Assign-REP polling window. The REP tx is instant onchain, but the
  // indexer batches events per epoch (~2 min locally), so the profile API
  // doesn't reflect the assignment until the next epoch settles. We show a
  // pending banner and poll faster than the baseline 30 s while we wait, so
  // the page self-updates the moment the indexer catches up.
  const POLL_WINDOW_MS = 150_000
  const POLL_INTERVAL_MS = 5_000
  const [pendingAssignUntil, setPendingAssignUntil] = useState<number | null>(
    null,
  )
  const assignmentPending =
    pendingAssignUntil !== null && Date.now() < pendingAssignUntil

  useEffect(() => {
    if (pendingAssignUntil === null) return

    const tick = () => {
      if (Date.now() >= pendingAssignUntil) {
        setPendingAssignUntil(null)
        return
      }
      // Invalidate so React Query bypasses `staleTime` and refetches now.
      queryClient.invalidateQueries({ queryKey: ["profile"] })
    }

    tick() // Kick once immediately.
    const id = window.setInterval(tick, POLL_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [pendingAssignUntil, queryClient])

  // Onchain unlinkWallet call (self-only).
  const {
    writeContract: writeUnlink,
    data: unlinkTxHash,
    isPending: unlinkPending,
    error: unlinkError,
    reset: resetUnlink,
  } = useWriteContract()

  const {
    isLoading: unlinkReceiptPending,
    isSuccess: unlinkReceiptSuccess,
  } = useWaitForTransactionReceipt({ hash: unlinkTxHash })

  /* eslint-disable react-hooks/set-state-in-effect -- refetch profile + clear
     the write state after the unlink receipt lands. */
  useEffect(() => {
    if (!unlinkReceiptSuccess) return
    profileQuery.refetch()
    resetUnlink()
  }, [unlinkReceiptSuccess, profileQuery, resetUnlink])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onUnlinkWallet = () => {
    if (!profileRegistryAddress) return
    if (chainId !== LOCAL_CHAIN.id) {
      switchChain?.({ chainId: LOCAL_CHAIN.id })
      return
    }
    resetUnlink()
    writeUnlink({
      abi: profileRegistryAbi,
      address: profileRegistryAddress,
      functionName: "unlinkWallet",
      args: [],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const showMintOverlay = viewerMode === "self" && !hasHatched

  const profileNotFound =
    profileQuery.isSuccess && profile === null

  // A username URL that 404s is genuinely unknown — there's no wallet fallback
  // and no self-context to assume. Don't render it as a normal profile with
  // the URL slug as the "name"; show a dedicated not-found state instead.
  const usernameNotFound =
    profileNotFound && !identifierIsWallet && !profileQuery.isLoading

  if (usernameNotFound) {
    return (
      <ProfileNotFoundView identifier={rawIdentifier} />
    )
  }

  return (
    <main className="fixed inset-0 h-svh w-full overflow-y-auto bg-[#0D0D0E] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,87,183,0.18),transparent_0,transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,116,208,0.16),transparent_0,transparent_30%),radial-gradient(circle_at_50%_85%,rgba(255,87,183,0.12),transparent_0,transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,14,0.9),rgba(13,13,14,0.72)_22%,rgba(13,13,14,0.58)_58%,rgba(13,13,14,0.88))]" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ProfileWalletMenu />
      </div>

      {isFakeUniConfigured() || isLocalNftConfigured() ? (
        <div className="pointer-events-none absolute bottom-6 left-4 z-20">
          <LocalChainDevPanel />
        </div>
      ) : null}

      {/* z-30 keeps these buttons above the scrolling content container below
          (which is z-10 and covers the viewport). Without this, the content
          panel can intercept clicks on the top-left buttons. */}
      <div className="pointer-events-none absolute left-4 top-4 z-30 flex gap-2">
        <Button
          asChild
          variant="outline"
          className="pointer-events-auto h-11 cursor-pointer gap-2 px-6"
        >
          <Link to="/">Back</Link>
        </Button>
        <Button
          asChild
          variant="brand"
          className="pointer-events-auto h-11 cursor-pointer gap-2 px-6"
        >
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
      </div>

      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-[min(64rem,calc(100vw-2rem))] flex-col items-stretch justify-center gap-6 px-4 pb-12 pt-24 sm:pt-28">
        {assignmentPending || pending.hasPending ? (
          <div
            aria-live="polite"
            className="rounded-xl border border-[#FF57B7]/40 bg-[#FF57B7]/10 px-4 py-3 text-sm text-white/85"
          >
            {pending.hasPending
              ? "REP assignment showing optimistically — the indexer will confirm it within an epoch (~2 min locally)."
              : "REP assignment submitted. The indexer runs each epoch (~2 min locally) — this profile will update automatically once the event is counted."}
          </div>
        ) : null}

        <ProfileHeader
          displayName={displayName}
          displayWallet={displayWallet}
          auraHuman={auraHuman}
          epochNumber={profile?.epochNumber ?? null}
          hasUsername={Boolean(profile?.username)}
          isLoading={profileQuery.isLoading}
          isError={profileQuery.isError}
          profileNotFound={profileNotFound}
          saleDetected={Boolean(profile?.saleDetected)}
          canClaimName={viewerMode === "self" && !profile?.username}
          onClaimName={() => setClaimOpen(true)}
        />

        {viewerMode === "self" || profile?.linkedWallet ? (
          <LinkedWalletsSection
            primaryWallet={displayWallet}
            linkedWallet={profile?.linkedWallet ?? null}
            viewerMode={viewerMode}
            onLinkWallet={() => setLinkOpen(true)}
            onUnlinkWallet={onUnlinkWallet}
            unlinkInFlight={unlinkPending || unlinkReceiptPending}
            unlinkError={unlinkError?.message ?? null}
          />
        ) : null}

        <UnityPetCard
          className={cn("w-full", MEADOW_PROFILE_GLASS)}
          assignedReputationAura={0}
          auraPoints={Math.min(100, Math.round(auraNumber))}
          hideImage={showMintOverlay}
          imageAlt={`${displayName} portrait`}
          imageSrc={portraitUrl}
          petName={displayName}
          petNameEditable={false}
          pfpOverlay={
            showMintOverlay ? (
              <MintOverlay
                eggSrc={unityPetEggUrl}
                isConnected={isConnected}
                isWrongChain={
                  nftMintOnchain &&
                  isConnected &&
                  chainId !== LOCAL_CHAIN.id
                }
                mintError={mintError}
                mintInFlight={mintInFlight}
                mintPrepPending={mintPrepPending ?? false}
                mintWritePending={mintWritePending}
                mintConfirmPending={mintConfirmPending}
                walletBusy={walletBusy}
                mintPhase={mintPhase}
                holdUntilReceipt={nftMintOnchain}
                hatchReleaseReady={!nftMintOnchain || mintReceiptSuccess}
                onConnect={() => openConnectModal?.()}
                onMint={onMint}
                onHatchComplete={onHatchComplete}
                onSwitchChain={() =>
                  switchChain?.({ chainId: LOCAL_CHAIN.id })
                }
              />
            ) : null
          }
          reputationSummaryText={
            <RepSummary
              auraHuman={auraHuman}
              viewerMode={viewerMode}
              topCategoryLabel={topCategoryLabel(stats)}
            />
          }
          showAction={viewerMode === "visitor"}
          actionLabel="Assign REP"
          onAssignReputation={() => {
            if (!isConnected) {
              openConnectModal?.()
              return
            }
            setAssignOpen(true)
          }}
          size="large"
          statFillLayout="css"
          statMax={statMax}
          stats={stats}
        />
      </div>

      {displayWallet ? (
        <AssignRepDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          targetDisplayName={displayName}
          targetWallet={displayWallet}
          viewerAura={viewerProfile.data?.aura}
          onSuccess={(info) => {
            profileQuery.refetch()
            viewerProfile.refetch()
            setPendingAssignUntil(Date.now() + POLL_WINDOW_MS)
            // Optimistically overlay the REP so the stat bar / top category
            // update instantly. Baseline the *current* API value so we can
            // auto-reconcile later.
            const apiBaseline = Number(
              profile?.repByCategory?.[info.category] ?? 0,
            )
            addPendingRep({
              targetWallet: displayWallet,
              category: info.category,
              amount: info.amount,
              baseline: Number.isFinite(apiBaseline) ? apiBaseline : 0,
              txHash: info.txHash,
            })
          }}
        />
      ) : null}

      {viewerMode === "self" ? (
        <>
          <ClaimNameDialog
            open={claimOpen}
            onOpenChange={setClaimOpen}
            onSuccess={(registeredName) => {
              profileQuery.refetch()
              viewerProfile.refetch()
              // Swap the URL to the canonical `/username` form so it survives
              // page reloads and shares cleanly.
              navigate(`/${registeredName}`, { replace: true })
            }}
          />
          {displayWallet ? (
            <LinkWalletDialog
              open={linkOpen}
              onOpenChange={setLinkOpen}
              callerWallet={displayWallet}
              onSuccess={() => {
                profileQuery.refetch()
                viewerProfile.refetch()
              }}
            />
          ) : null}
        </>
      ) : null}
    </main>
  )
}

function ProfileHeader({
  displayName,
  displayWallet,
  auraHuman,
  epochNumber,
  hasUsername,
  isLoading,
  isError,
  profileNotFound,
  saleDetected,
  canClaimName,
  onClaimName,
}: {
  displayName: string
  displayWallet: `0x${string}` | null
  auraHuman: string
  epochNumber: number | null
  hasUsername: boolean
  isLoading: boolean
  isError: boolean
  profileNotFound: boolean
  saleDetected: boolean
  canClaimName: boolean
  onClaimName: () => void
}) {
  return (
    <header className={cn("rounded-2xl px-6 py-5", MEADOW_PROFILE_GLASS)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/55">
            {hasUsername ? "Profile" : "Wallet"}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {displayName}
            </h1>
            {canClaimName ? (
              <Button
                className="border-[#FF57B7]/40 bg-[#FF57B7]/12 text-white hover:!bg-[#FF74D0]/18"
                size="sm"
                type="button"
                variant="brand"
                onClick={onClaimName}
              >
                Claim username
              </Button>
            ) : null}
          </div>
          {displayWallet ? (
            <p className="mt-1 font-mono text-xs text-white/55">
              {displayWallet}
            </p>
          ) : null}
          {isError ? (
            <p className="mt-2 text-xs text-destructive">
              Unable to load live data for this profile.
            </p>
          ) : null}
          {profileNotFound ? (
            <p className="mt-2 text-xs text-white/55">
              Not registered onchain yet. Aura and REP totals are zero.
            </p>
          ) : null}
          {saleDetected ? (
            <p className="mt-2 inline-flex items-center gap-2 rounded-full border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] text-amber-100/90">
              fUNI sale detected — Aura reset this epoch
            </p>
          ) : null}
        </div>

        <div
          aria-live="polite"
          className="flex items-baseline gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 sm:self-start"
        >
          <span className="text-[0.6rem] font-medium uppercase tracking-[0.22em] text-white/55">
            Aura
          </span>
          <span className="text-3xl font-semibold tabular-nums text-white md:text-4xl">
            {isLoading ? "…" : auraHuman}
          </span>
          {epochNumber !== null ? (
            <span className="text-[0.6rem] uppercase tracking-[0.18em] text-white/45">
              epoch {epochNumber}
            </span>
          ) : null}
        </div>
      </div>
    </header>
  )
}

function LinkedWalletsSection({
  primaryWallet,
  linkedWallet,
  viewerMode,
  onLinkWallet,
  onUnlinkWallet,
  unlinkInFlight,
  unlinkError,
}: {
  primaryWallet: `0x${string}` | null
  linkedWallet: string | null
  viewerMode: ViewerMode
  onLinkWallet: () => void
  onUnlinkWallet: () => void
  unlinkInFlight: boolean
  unlinkError: string | null
}) {
  const isSelf = viewerMode === "self"
  const hasLinked = Boolean(linkedWallet)

  return (
    <section
      aria-label="Linked wallets"
      className={cn("rounded-2xl px-6 py-5", MEADOW_PROFILE_GLASS)}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/55">
            Linked wallets
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            {primaryWallet ? (
              <li className="flex flex-wrap items-center gap-2">
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-white/45">
                  Primary
                </span>
                <span className="break-all font-mono text-white/85">
                  {primaryWallet}
                </span>
              </li>
            ) : null}
            {hasLinked ? (
              <li className="flex flex-wrap items-center gap-2">
                <span className="text-[0.6rem] font-medium uppercase tracking-[0.18em] text-white/45">
                  Linked
                </span>
                <span className="break-all font-mono text-white/85">
                  {linkedWallet}
                </span>
                {isSelf ? (
                  <Button
                    className="border-white/20 bg-transparent"
                    size="xs"
                    type="button"
                    variant="outline"
                    disabled={unlinkInFlight}
                    onClick={onUnlinkWallet}
                  >
                    {unlinkInFlight ? "Unlinking…" : "Unlink"}
                  </Button>
                ) : null}
              </li>
            ) : (
              <li className="text-xs text-white/55">
                {isSelf
                  ? "No additional wallet linked yet."
                  : "No additional wallet linked."}
              </li>
            )}
          </ul>
          {unlinkError ? (
            <p className="mt-2 text-xs text-destructive">
              {unlinkError.split("\n")[0]}
            </p>
          ) : null}
        </div>

        {isSelf && !hasLinked ? (
          <Button
            className="sm:self-start"
            size="lg"
            type="button"
            variant="brand"
            onClick={onLinkWallet}
          >
            Link wallet
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function topCategoryLabel(stats: UnityPetStats): string | null {
  const entries = Object.entries(stats) as Array<[keyof UnityPetStats, number]>
  entries.sort((a, b) => b[1] - a[1])
  const [topKey, topValue] = entries[0] ?? ["researcher", 0]
  if (!topValue || topValue <= 0) return null
  const labels: Record<keyof UnityPetStats, string> = {
    researcher: "Researcher",
    builder: "Builder",
    trader: "Trader",
    liquidityProvider: "Liquidity Provider",
    governanceParticipant: "Governance Participant",
    communityMember: "Community Member",
  }
  return labels[topKey]
}

function RepSummary({
  auraHuman,
  viewerMode,
  topCategoryLabel,
}: {
  auraHuman: string
  viewerMode: ViewerMode
  topCategoryLabel: string | null
}) {
  if (topCategoryLabel) {
    return (
      <>
        <span className="text-black/70 dark:text-white/70">Top REP category: </span>
        <span className="font-semibold text-black dark:text-white">
          {topCategoryLabel}
        </span>
        <span className="text-black/70 dark:text-white/70"> · Aura </span>
        <span className="font-semibold tabular-nums text-black dark:text-white">
          {auraHuman}
        </span>
        {viewerMode === "visitor" ? (
          <span className="text-black/70 dark:text-white/70">
            {" "}
            · Sign REP below
          </span>
        ) : null}
      </>
    )
  }
  return (
    <>
      <span className="text-black/70 dark:text-white/70">Aura </span>
      <span className="font-semibold tabular-nums text-black dark:text-white">
        {auraHuman}
      </span>
      <span className="text-black/70 dark:text-white/70">
        {" "}
        · No REP received yet
      </span>
    </>
  )
}

function MintOverlay({
  eggSrc,
  isConnected,
  isWrongChain,
  mintError,
  mintInFlight,
  mintPrepPending,
  mintWritePending,
  mintConfirmPending,
  walletBusy,
  mintPhase,
  holdUntilReceipt,
  hatchReleaseReady,
  onConnect,
  onMint,
  onHatchComplete,
  onSwitchChain,
}: {
  eggSrc: string
  isConnected: boolean
  isWrongChain: boolean
  mintError: string | null
  mintInFlight: boolean
  mintPrepPending: boolean
  mintWritePending: boolean
  mintConfirmPending: boolean
  walletBusy: boolean
  mintPhase: "idle" | "hatching"
  /** Hold the animation's tail loop until the mint receipt lands. */
  holdUntilReceipt: boolean
  /** Gate for the held tail loop (true ⇒ release + complete). */
  hatchReleaseReady: boolean
  onConnect: () => void
  onMint: () => void
  onHatchComplete: () => void
  onSwitchChain: () => void
}) {
  // While hatching, show the cracking sprite sequence instead of the static
  // egg + button. `holdUntilRelease` keeps the last few frames looping until
  // the onchain receipt lands, so a slow tx doesn't finish the animation
  // before the companion is actually minted.
  if (mintPhase === "hatching") {
    return (
      <div className="pointer-events-none relative h-full w-full">
        <HatchingSpriteAnimation
          className="absolute inset-0 h-full w-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
          holdUntilRelease={holdUntilReceipt}
          release={hatchReleaseReady}
          onComplete={onHatchComplete}
        />
        {mintError ? (
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            <p className="line-clamp-2 max-w-[90%] rounded-md bg-black/70 px-2 py-1 text-center text-[0.65rem] leading-snug text-red-300/90 backdrop-blur-sm">
              {mintError}
            </p>
          </div>
        ) : null}
      </div>
    )
  }

  const buttonLabel = !isConnected
    ? walletBusy
      ? "Connecting…"
      : "Connect to hatch"
    : isWrongChain
      ? "Switch to Anvil"
      : mintWritePending
        ? "Confirm in wallet…"
        : mintConfirmPending
          ? "Hatching…"
          : mintPrepPending
            ? "Preparing…"
            : "Hatch"

  const disabled =
    isConnected && (mintInFlight || (mintPrepPending && !isWrongChain))

  return (
    <div className="pointer-events-auto relative h-full w-full">
      <img
        alt="Unhatched companion egg"
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_12px_28px_rgba(0,0,0,0.35)]"
        decoding="async"
        draggable={false}
        src={eggSrc}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <Button
          aria-busy={mintInFlight}
          className={cn(
            // Vivid pink so the CTA reads clearly on any hatched/egg background.
            "border-transparent bg-[#FF57B7] px-6 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,87,183,0.45)] hover:bg-[#FF74D0] focus-visible:ring-[#FF57B7]/40 disabled:opacity-70",
            "uppercase tracking-[0.12em]",
          )}
          disabled={disabled}
          size="lg"
          type="button"
          variant="brand"
          onClick={() => {
            if (!isConnected) {
              onConnect()
              return
            }
            if (isWrongChain) {
              onSwitchChain()
              return
            }
            onMint()
          }}
        >
          {buttonLabel}
        </Button>
        {mintError ? (
          <p className="mt-2 line-clamp-2 max-w-[90%] rounded-md bg-black/70 px-2 py-1 text-[0.65rem] leading-snug text-red-300/90 backdrop-blur-sm">
            {mintError}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function ProfileNotFoundView({ identifier }: { identifier: string }) {
  return (
    <main className="fixed inset-0 h-svh w-full overflow-y-auto bg-[#0D0D0E] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,87,183,0.18),transparent_0,transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,116,208,0.16),transparent_0,transparent_30%),radial-gradient(circle_at_50%_85%,rgba(255,87,183,0.12),transparent_0,transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,14,0.9),rgba(13,13,14,0.72)_22%,rgba(13,13,14,0.58)_58%,rgba(13,13,14,0.88))]" />
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ProfileWalletMenu />
      </div>

      <div className="pointer-events-none absolute left-4 top-4 z-30 flex gap-2">
        <Button
          asChild
          variant="outline"
          className="pointer-events-auto h-11 cursor-pointer gap-2 px-6"
        >
          <Link to="/">Back</Link>
        </Button>
        <Button
          asChild
          variant="brand"
          className="pointer-events-auto h-11 cursor-pointer gap-2 px-6"
        >
          <Link to="/leaderboard">Leaderboard</Link>
        </Button>
      </div>

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "w-full max-w-md space-y-4 rounded-2xl p-8",
            MEADOW_PROFILE_GLASS,
          )}
        >
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/55">
            Profile not found
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            No profile named <span className="font-mono">{identifier}</span>
          </h1>
          <p className="text-sm text-white/70">
            No onchain profile with this name exists. It may have been reset, or
            you may have mistyped the URL.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild size="lg" variant="brand">
              <Link to="/leaderboard">Browse profiles</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function NoWalletConnectPrompt({ walletBusy }: { walletBusy: boolean }) {
  const { openConnectModal } = useConnectModal()
  return (
    <main className="fixed inset-0 bg-[#0D0D0E] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(255,87,183,0.18),transparent_0,transparent_34%),radial-gradient(circle_at_82%_24%,rgba(255,116,208,0.16),transparent_0,transparent_30%),radial-gradient(circle_at_50%_85%,rgba(255,87,183,0.12),transparent_0,transparent_28%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(13,13,14,0.9),rgba(13,13,14,0.72)_22%,rgba(13,13,14,0.58)_58%,rgba(13,13,14,0.88))]" />
      </div>

      <div className="absolute left-4 top-4 z-10">
        <Button
          asChild
          variant="outline"
          className="pointer-events-auto h-11 gap-2 px-6"
        >
          <Link to="/">Back</Link>
        </Button>
      </div>

      <div className="absolute right-4 top-4 z-20">
        <ProfileWalletMenu />
      </div>

      <div className="relative z-10 flex min-h-full flex-col items-center justify-center p-6 text-center">
        <div
          className={cn(
            "w-full max-w-md space-y-5 rounded-2xl p-8",
            MEADOW_PROFILE_GLASS,
          )}
        >
          <div className="space-y-2">
            <p className="text-[0.65rem] font-medium uppercase tracking-[0.22em] text-white/55">
              Not connected
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Your profile
            </h1>
          </div>
          <p className="text-sm leading-6 text-white/70">
            Connect your wallet to see your profile, or visit the leaderboard
            to browse other users. If you don&apos;t have a username yet,
            your wallet address will be used.
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              disabled={walletBusy || !openConnectModal}
              size="lg"
              variant="brand"
              onClick={() => openConnectModal?.()}
            >
              {walletBusy ? "Connecting…" : "Connect wallet"}
            </Button>
            <Button
              asChild
              className="w-full"
              size="lg"
              variant="outline"
            >
              <Link to="/leaderboard">Browse leaderboard</Link>
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}

function ProfileLoadingFallback() {
  return (
    <main className="fixed inset-0 flex items-center justify-center bg-[#0D0D0E] text-white/60">
      <p className="text-sm">Loading profile…</p>
    </main>
  )
}
