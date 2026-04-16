import { useConnectModal } from "@rainbow-me/rainbowkit"
import { Settings, X } from "lucide-react"
import { useState } from "react"
import { parseEther } from "viem"
import {
  useAccount,
  useChainId,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi"

import { fakeUniFaucetAbi, localNftMintToAbi } from "@/lib/abis/local-dev"
import { anvilCreditNativeEth } from "@/lib/anvil-fund-eth"
import {
  fakeUniAddress,
  isLocalChainDevPanelEnabled,
  LOCAL_CHAIN,
  localNftAddress,
} from "@/lib/local-chain-config"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const panelClass = cn(
  "rounded-2xl border border-white/25 bg-white/[0.06] px-4 py-3 text-left text-xs shadow-none backdrop-blur-2xl",
  "dark:border-white/15 dark:bg-black/[0.12]",
)

const fabClass = cn(
  "flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/25 bg-white/[0.12] text-foreground shadow-lg backdrop-blur-xl",
  "transition-colors hover:bg-white/[0.18] dark:border-white/15 dark:bg-black/[0.25] dark:hover:bg-black/[0.35]",
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40",
)

export function LocalChainDevPanel({ className }: { className?: string }) {
  const [expanded, setExpanded] = useState(false)
  const [fundPending, setFundPending] = useState(false)
  const [fundError, setFundError] = useState<string | null>(null)
  const [fundOkAt, setFundOkAt] = useState<number | null>(null)
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { switchChain, isPending: switchPending } = useSwitchChain()
  const { openConnectModal } = useConnectModal()

  const {
    data: hash,
    writeContract,
    isPending: writePending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract()

  const { isLoading: confirmLoading, isSuccess: confirmSuccess } =
    useWaitForTransactionReceipt({ hash })

  const onWrongChain = chainId !== LOCAL_CHAIN.id
  const busy = writePending || confirmLoading || switchPending || fundPending

  if (!isLocalChainDevPanelEnabled()) {
    return null
  }

  const onSwitchLocal = () => {
    switchChain?.({ chainId: LOCAL_CHAIN.id })
  }

  const onFaucet = () => {
    if (!fakeUniAddress) {
      return
    }
    resetWrite()
    writeContract({
      address: fakeUniAddress,
      abi: fakeUniFaucetAbi,
      functionName: "faucet",
      args: [parseEther("1000")],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const onMintNft = () => {
    if (!localNftAddress || !address) {
      return
    }
    resetWrite()
    writeContract({
      address: localNftAddress,
      abi: localNftMintToAbi,
      functionName: "mint",
      args: [address],
      chainId: LOCAL_CHAIN.id,
    })
  }

  const onGetEth = async () => {
    if (!address) {
      return
    }
    setFundError(null)
    setFundOkAt(null)
    setFundPending(true)
    try {
      await anvilCreditNativeEth(LOCAL_CHAIN, address, parseEther("10"))
      setFundOkAt(Date.now())
    } catch (e) {
      setFundError(e instanceof Error ? e.message : String(e))
    } finally {
      setFundPending(false)
    }
  }

  return (
    <div
      className={cn(
        "pointer-events-auto relative flex flex-col items-start",
        className,
      )}
    >
      {expanded ? (
        <div
          className={cn(
            panelClass,
            "absolute bottom-12 left-0 z-10 w-[min(20rem,calc(100vw-2rem))] space-y-3 shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Local chain (31337)
            </p>
            <button
              type="button"
              className="rounded-lg p-1 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
              aria-label="Collapse local chain dev panel"
              onClick={() => setExpanded(false)}
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <p className="text-[0.7rem] leading-relaxed text-muted-foreground">
            Get ETH credits your connected address with +10 ETH on Anvil (JSON-RPC{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 dark:bg-white/10">
              anvil_setBalance
            </code>
            , like{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 dark:bg-white/10">
              cast send … --value 10ether
            </code>
            ). Node at <code className="rounded bg-black/20 px-1 py-0.5">127.0.0.1:8545</code>.
            Optional{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 dark:bg-white/10">
              VITE_FAKE_UNI_ADDRESS
            </code>{" "}
            /{" "}
            <code className="rounded bg-black/20 px-1 py-0.5 dark:bg-white/10">
              VITE_LOCAL_NFT_ADDRESS
            </code>{" "}
            in <code className="rounded bg-black/20 px-1 py-0.5">.env</code> for token and NFT
            helpers.
          </p>

          {!isConnected ? (
            <Button
              className="w-full"
              disabled={!openConnectModal}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => openConnectModal?.()}
            >
              Connect wallet
            </Button>
          ) : onWrongChain ? (
            <Button
              className="w-full"
              disabled={busy || !switchChain}
              size="sm"
              type="button"
              variant="outline"
              onClick={onSwitchLocal}
            >
              {switchPending ? "Switching…" : "Switch to Anvil Local"}
            </Button>
          ) : (
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                disabled={busy || !address}
                size="sm"
                type="button"
                variant="outline"
                onClick={onGetEth}
              >
                {fundPending ? "Crediting ETH…" : "Get ETH (+10 on Anvil)"}
              </Button>
              {fakeUniAddress ? (
                <Button
                  className="w-full"
                  disabled={busy}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={onFaucet}
                >
                  {writePending || confirmLoading
                    ? "Confirm in wallet…"
                    : "fUNI: faucet(1000 ether units)"}
                </Button>
              ) : null}
              {localNftAddress ? (
                <Button
                  className="w-full"
                  disabled={busy || !address}
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={onMintNft}
                >
                  {writePending || confirmLoading
                    ? "Confirm in wallet…"
                    : "NFT: mint(self)"}
                </Button>
              ) : null}
            </div>
          )}

          {fundError ? (
            <p className="text-[0.65rem] leading-snug text-red-400/90">{fundError}</p>
          ) : null}
          {fundOkAt ? (
            <p className="text-[0.65rem] text-emerald-400/90">
              Credited +10 ETH. Refresh the wallet balance if it does not update
              immediately.
            </p>
          ) : null}
          {writeError ? (
            <p className="text-[0.65rem] leading-snug text-red-400/90">
              {"message" in writeError ? writeError.message : String(writeError)}
            </p>
          ) : null}
          {hash ? (
            <p className="font-mono text-[0.65rem] text-muted-foreground break-all">
              {confirmSuccess ? "Confirmed: " : "Tx: "}
              {hash}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className={fabClass}
        aria-expanded={expanded}
        aria-label={
          expanded
            ? "Collapse local chain dev panel"
            : "Expand local chain dev panel"
        }
        onClick={() => setExpanded((open) => !open)}
      >
        <Settings className="size-[18px] opacity-90" aria-hidden />
      </button>
    </div>
  )
}
