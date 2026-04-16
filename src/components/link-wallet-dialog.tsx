import { useEffect, useMemo, useState } from "react"
import { getAddress, isAddress } from "viem"
import {
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
import { profileRegistryAbi } from "@/lib/abis/profile-registry"
import {
  LOCAL_CHAIN,
  profileRegistryAddress,
} from "@/lib/local-chain-config"

export type LinkWalletDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Primary wallet of the caller — used to block self-linking up front. */
  callerWallet: `0x${string}`
  onSuccess?: () => void
}

export function LinkWalletDialog({
  open,
  onOpenChange,
  callerWallet,
  onSuccess,
}: LinkWalletDialogProps) {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [input, setInput] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    writeContract,
    data: txHash,
    isPending: writePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: receiptPending, isSuccess: receiptSuccess } =
    useWaitForTransactionReceipt({ hash: txHash })

  const trimmed = input.trim()
  const parsedAddress = useMemo<`0x${string}` | null>(() => {
    if (!isAddress(trimmed)) return null
    try {
      return getAddress(trimmed) as `0x${string}`
    } catch {
      return null
    }
  }, [trimmed])

  const isSelf =
    parsedAddress !== null &&
    parsedAddress.toLowerCase() === callerWallet.toLowerCase()

  const wrongChain = chainId !== LOCAL_CHAIN.id

  useEffect(() => {
    if (!open) {
      setInput("")
      setSubmitError(null)
      resetWrite()
    }
  }, [open, resetWrite])

  useEffect(() => {
    if (receiptSuccess) {
      onSuccess?.()
      onOpenChange(false)
    }
  }, [receiptSuccess, onSuccess, onOpenChange])

  useEffect(() => {
    if (writeError) {
      setSubmitError(
        writeError.message.split("\n")[0] ?? "Transaction failed.",
      )
    }
  }, [writeError])

  const onSubmit = () => {
    setSubmitError(null)
    if (!profileRegistryAddress) {
      setSubmitError("ProfileRegistry address is not configured.")
      return
    }
    if (wrongChain) {
      switchChain?.({ chainId: LOCAL_CHAIN.id })
      setSubmitError("Switch to Anvil Local, then try again.")
      return
    }
    if (!parsedAddress) {
      setSubmitError("Enter a valid 0x… address.")
      return
    }
    if (isSelf) {
      setSubmitError("You can't link your primary wallet to itself.")
      return
    }
    writeContract({
      abi: profileRegistryAbi,
      address: profileRegistryAddress,
      functionName: "linkWallet",
      args: [parsedAddress],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const ctaLabel = wrongChain
    ? "Switch to Anvil Local"
    : writePending
      ? "Confirm in wallet…"
      : receiptPending
        ? "Linking…"
        : "Link wallet"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/15">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl">
            Link another wallet
          </DialogTitle>
          <DialogDescription>
            Attach a second wallet to your profile onchain. Each profile may
            have at most one linked wallet at a time — you can unlink later.
            The wallet you link must not already have its own username or be
            linked elsewhere.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <label
            htmlFor="link-wallet-input"
            className="block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55"
          >
            Wallet address
          </label>
          <input
            id="link-wallet-input"
            autoComplete="off"
            spellCheck={false}
            className={cn(
              "w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none transition-[border-color,box-shadow]",
              "focus-visible:border-[#FF57B7]/55 focus-visible:ring-2 focus-visible:ring-[#FF57B7]/25",
            )}
            placeholder="0x…"
            value={input}
            onChange={(event) => {
              setInput(event.target.value)
              setSubmitError(null)
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                parsedAddress &&
                !isSelf &&
                !writePending
              ) {
                event.preventDefault()
                onSubmit()
              }
            }}
          />
          {trimmed.length > 0 && !parsedAddress ? (
            <p className="text-xs text-destructive">Not a valid address.</p>
          ) : null}
          {isSelf ? (
            <p className="text-xs text-destructive">
              This is your primary wallet.
            </p>
          ) : null}
          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              className="border-[#FF57B7]/40 bg-[#FF57B7]/12 text-white hover:!bg-[#FF74D0]/18"
              type="button"
              variant="brand"
              disabled={
                (!parsedAddress || isSelf || writePending || receiptPending) &&
                !wrongChain
              }
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
