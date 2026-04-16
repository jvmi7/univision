import { useEffect, useMemo, useState } from "react"
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
import {
  isValidUsername,
  profileRegistryAbi,
} from "@/lib/abis/profile-registry"
import {
  LOCAL_CHAIN,
  profileRegistryAddress,
} from "@/lib/local-chain-config"

const USERNAME_MAX = 20

export type ClaimNameDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after the transaction is included. Receives the registered name. */
  onSuccess?: (registeredName: string) => void
}

export function ClaimNameDialog({
  open,
  onOpenChange,
  onSuccess,
}: ClaimNameDialogProps) {
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()

  const [name, setName] = useState("")
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

  const wrongChain = chainId !== LOCAL_CHAIN.id
  const valid = useMemo(() => isValidUsername(name.trim()), [name])

  useEffect(() => {
    if (!open) {
      setName("")
      setSubmitError(null)
      resetWrite()
    }
  }, [open, resetWrite])

  useEffect(() => {
    if (receiptSuccess) {
      // Trim here because `name` is what was typed; onchain validation already
      // passed against the trimmed form in `onSubmit`.
      onSuccess?.(name.trim())
      onOpenChange(false)
    }
    // `name` intentionally omitted — we snapshot it at receipt time via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    if (!valid) {
      setSubmitError(
        `Use 1–${USERNAME_MAX} lowercase letters and digits only (a–z, 0–9).`,
      )
      return
    }
    writeContract({
      abi: profileRegistryAbi,
      address: profileRegistryAddress,
      functionName: "registerName",
      args: [name.trim()],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const ctaLabel = wrongChain
    ? "Switch to Anvil Local"
    : writePending
      ? "Confirm in wallet…"
      : receiptPending
        ? "Registering…"
        : "Claim username"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-white/15">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl">
            Claim your username
          </DialogTitle>
          <DialogDescription>
            Usernames are permanent and unique onchain. Lowercase letters and
            digits only (a–z, 0–9), up to {USERNAME_MAX} characters. Once
            claimed, the name is tied to your wallet forever.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-4">
          <label
            htmlFor="claim-name"
            className="block text-[0.65rem] font-medium uppercase tracking-[0.18em] text-white/55"
          >
            Username
          </label>
          <input
            id="claim-name"
            autoComplete="off"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            className={cn(
              "w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm text-white outline-none transition-[border-color,box-shadow]",
              "focus-visible:border-[#FF57B7]/55 focus-visible:ring-2 focus-visible:ring-[#FF57B7]/25",
            )}
            placeholder="satoshi"
            value={name}
            onChange={(event) => {
              // Auto-lowercase so the UI matches the contract's accepted range.
              setName(event.target.value.toLowerCase())
              setSubmitError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && valid && !writePending) {
                event.preventDefault()
                onSubmit()
              }
            }}
          />
          <p className="text-xs text-white/55">
            {name.length} / {USERNAME_MAX} characters
            {name.length > 0 && !valid
              ? " — only lowercase a–z and 0–9"
              : null}
          </p>

          {submitError ? (
            <p className="text-sm text-destructive">{submitError}</p>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button
              className="border-[#FF57B7]/40 bg-[#FF57B7]/12 text-white hover:!bg-[#FF74D0]/18"
              type="button"
              variant="brand"
              disabled={(!valid || writePending || receiptPending) && !wrongChain}
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
