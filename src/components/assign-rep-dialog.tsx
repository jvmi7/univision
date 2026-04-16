import { useConnectModal } from "@rainbow-me/rainbowkit"
import { useEffect, useMemo, useRef, useState } from "react"
import { formatUnits } from "viem"
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { repEmitterAbi } from "@/lib/abis/rep-emitter"
import { LOCAL_CHAIN, repEmitterAddress } from "@/lib/local-chain-config"
import {
  REP_CATEGORY_NAMES,
  type RepCategoryName,
} from "@/lib/profile-api"

const CATEGORY_LABELS: Record<RepCategoryName, string> = {
  research: "Researcher",
  builder: "Builder",
  trader: "Trader",
  liquidity: "Liquidity Provider",
  governance: "Governance Participant",
  community: "Community Member",
}

export type AssignRepSuccess = {
  category: RepCategoryName
  amount: number
  txHash?: `0x${string}`
}

export type AssignRepDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetWallet: `0x${string}`
  targetDisplayName: string
  /** Viewer's current Aura as an 18-decimal string (from the API). */
  viewerAura?: string
  /**
   * Fires after the REP tx is included. Includes the submitted category +
   * amount so callers can stage an optimistic UI update.
   */
  onSuccess?: (info: AssignRepSuccess) => void
}

export function AssignRepDialog({
  open,
  onOpenChange,
  targetWallet,
  targetDisplayName,
  viewerAura,
  onSuccess,
}: AssignRepDialogProps) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { openConnectModal } = useConnectModal()

  const [category, setCategory] = useState<RepCategoryName>("builder")
  const [amountInput, setAmountInput] = useState("1")
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Snapshot of what was submitted, read once in the receipt-success effect
  // so that later edits to the inputs don't leak into the reported values.
  const submittedRef = useRef<AssignRepSuccess | null>(null)

  const {
    writeContract,
    data: txHash,
    isPending: writePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const {
    isLoading: receiptPending,
    isSuccess: receiptSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash })

  const isSelf =
    address && targetWallet.toLowerCase() === address.toLowerCase()

  const parsedAmount = useMemo(() => {
    const trimmed = amountInput.trim()
    if (trimmed === "" || trimmed === "-") return null
    const n = Number(trimmed)
    if (!Number.isFinite(n) || !Number.isInteger(n) || n === 0) return null
    return n
  }, [amountInput])

  const viewerAuraHuman = useMemo(() => {
    if (!viewerAura) return null
    try {
      return Number(formatUnits(BigInt(viewerAura), 18))
    } catch {
      return null
    }
  }, [viewerAura])

  useEffect(() => {
    if (!open) {
      setSubmitError(null)
      setAmountInput("1")
      setCategory("builder")
      submittedRef.current = null
      resetWrite()
    }
  }, [open, resetWrite])

  useEffect(() => {
    if (receiptSuccess && submittedRef.current) {
      onSuccess?.({ ...submittedRef.current, txHash })
      submittedRef.current = null
      onOpenChange(false)
    }
  }, [receiptSuccess, onSuccess, onOpenChange, txHash])

  useEffect(() => {
    if (writeError) {
      setSubmitError(writeError.message.split("\n")[0] ?? "Transaction failed.")
    }
  }, [writeError])

  const wrongChain = isConnected && chainId !== LOCAL_CHAIN.id
  const canSubmit =
    isConnected &&
    !wrongChain &&
    !isSelf &&
    parsedAmount !== null &&
    Boolean(repEmitterAddress) &&
    !writePending &&
    !receiptPending

  const onSubmit = () => {
    setSubmitError(null)
    if (!isConnected) {
      openConnectModal?.()
      return
    }
    if (wrongChain) {
      switchChain?.({ chainId: LOCAL_CHAIN.id })
      setSubmitError("Switch to Anvil Local, then tap Assign REP again.")
      return
    }
    if (!repEmitterAddress) {
      setSubmitError("RepEmitter address is not configured.")
      return
    }
    if (parsedAmount === null) {
      setSubmitError("Enter a non-zero whole number.")
      return
    }
    const categoryId = REP_CATEGORY_NAMES.indexOf(category)
    submittedRef.current = { category, amount: parsedAmount }
    writeContract({
      abi: repEmitterAbi,
      address: repEmitterAddress,
      functionName: "giveRep",
      args: [targetWallet, categoryId, BigInt(parsedAmount)],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const ctaLabel = !isConnected
    ? "Connect wallet"
    : wrongChain
      ? "Switch to Anvil Local"
      : writePending
        ? "Confirm in wallet…"
        : receiptPending
          ? "Submitting onchain…"
          : "Assign REP"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/15">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl">Assign REP</DialogTitle>
          <DialogDescription>
            Send a REP signal to <span className="font-medium text-white">{targetDisplayName}</span>.
            Positive values grant REP, negative values offset a prior grant. The
            indexer enforces that your cumulative REP given stays under your
            current Aura.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <label
              className="block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55"
              htmlFor="assign-rep-category"
            >
              Category
            </label>
            <select
              id="assign-rep-category"
              className="w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none transition-[border-color,box-shadow] focus-visible:border-[#FF57B7]/55 focus-visible:ring-2 focus-visible:ring-[#FF57B7]/25"
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as RepCategoryName)
              }
            >
              {REP_CATEGORY_NAMES.map((key) => (
                <option key={key} value={key}>
                  {CATEGORY_LABELS[key]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label
              className="block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55"
              htmlFor="assign-rep-amount"
            >
              Amount (whole units — negative allowed)
            </label>
            <input
              id="assign-rep-amount"
              autoComplete="off"
              spellCheck={false}
              className={cn(
                "w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none transition-[border-color,box-shadow]",
                "focus-visible:border-[#FF57B7]/55 focus-visible:ring-2 focus-visible:ring-[#FF57B7]/25",
              )}
              inputMode="numeric"
              placeholder="1"
              value={amountInput}
              onChange={(event) => {
                setAmountInput(event.target.value)
                setSubmitError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canSubmit) {
                  event.preventDefault()
                  onSubmit()
                }
              }}
            />
            {viewerAuraHuman !== null ? (
              <p className="text-xs text-white/55">
                Your current Aura:{" "}
                <span className="font-semibold text-white">
                  {viewerAuraHuman.toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </span>
                . Cumulative |REP given| must stay below this.
              </p>
            ) : null}
          </div>

          {isSelf ? (
            <p className="text-sm text-destructive">
              You cannot assign REP to yourself.
            </p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}
          {receiptSuccess ? (
            <p className="text-sm text-emerald-300">
              Submitted. The indexer will credit it within a minute or two.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              className="border-[#FF57B7]/40 bg-[#FF57B7]/12 text-white hover:!bg-[#FF74D0]/18"
              type="button"
              variant="brand"
              disabled={!isConnected ? false : !canSubmit}
              onClick={onSubmit}
            >
              {ctaLabel}
            </Button>
            <Button
              className="border-white/20 bg-transparent"
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}

function RecentOutgoingRep({ events }: { events: RepEvent[] | undefined }) {
  if (!events || events.length === 0) return null

  const rejectedCount = events.filter((event) => !event.counted).length

  return (
    <div className="space-y-2 rounded-lg border border-white/10 bg-black/20 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55">
          Your recent REP events
        </p>
        {rejectedCount > 0 ? (
          <p className="text-[0.65rem] uppercase tracking-[0.16em] text-amber-300/90">
            {rejectedCount} rejected
          </p>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {events.slice(0, 5).map((event) => {
          const accepted = event.counted
          const amountSigned = Number(event.amount)
          return (
            <li
              key={event.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md border px-2.5 py-1.5 text-xs",
                accepted
                  ? "border-emerald-400/20 bg-emerald-500/5 text-emerald-100/90"
                  : "border-amber-400/25 bg-amber-500/10 text-amber-100/90",
              )}
            >
              <span className="min-w-0 truncate">
                <span className="font-mono text-white/85">
                  {amountSigned >= 0 ? "+" : ""}
                  {event.amount}
                </span>{" "}
                <span className="uppercase tracking-[0.14em] text-white/55">
                  {event.categoryName}
                </span>{" "}
                <span className="text-white/45">→</span>{" "}
                <span className="font-mono text-white/70">
                  {shortenAddress(event.toAddress)}
                </span>
              </span>
              <span className="shrink-0 whitespace-nowrap text-[0.65rem] uppercase tracking-[0.14em]">
                {accepted
                  ? "counted"
                  : event.rejectionReason
                    ? `rejected · ${event.rejectionReason}`
                    : "rejected"}
              </span>
            </li>
          )
        })}
      </ul>
      {rejectedCount > 0 ? (
        <p className="text-[0.65rem] leading-snug text-white/55">
          Rejected events don&apos;t update recipient totals. Most common
          reason: your cumulative |REP given| exceeded your Aura budget at
          that epoch. Hold fUNI longer, or wait for Aura to accrue.
        </p>
      ) : null}
    </div>
  )
}
