import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { useConnectModal, useChainModal } from "@rainbow-me/rainbowkit"
import { Check, ChevronDown, Copy, Link2, LogOut, Network, Unplug, Wallet } from "lucide-react"
import { useState } from "react"
import { useAccount, useDisconnect } from "wagmi"

import { useLinkedUnityWallets } from "@/hooks/use-linked-unity-wallets"
import { useDocumentTheme } from "@/hooks/use-document-theme"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

/** `0x` + head + ellipsis + tail (middle omitted). */
function shortenAddressMiddle(address: string) {
  const a = address.trim()
  if (a.length <= 14) {
    return a
  }

  return `${a.slice(0, 6)}…${a.slice(-4)}`
}

const menuContentClass = cn(
  "min-w-[20rem] overflow-hidden rounded-2xl border border-white/25 bg-white/[0.07] p-2 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.16)] backdrop-blur-2xl [isolation:isolate] dark:border-white/15 dark:bg-black/[0.14] dark:shadow-[0_20px_56px_rgba(0,0,0,0.42)]",
  "z-[200] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=bottom]:slide-out-to-top-2",
  "data-[side=top]:slide-in-from-bottom-2 data-[side=top]:slide-out-to-bottom-2",
  "data-[side=left]:slide-in-from-right-2 data-[side=left]:slide-out-to-right-2",
  "data-[side=right]:slide-in-from-left-2 data-[side=right]:slide-out-to-left-2",
)

const itemClass =
  "flex cursor-pointer select-none items-center gap-2 rounded-xl px-2.5 py-2 text-xs outline-none transition-colors data-highlighted:bg-white/14 data-[state=open]:bg-white/10 dark:data-highlighted:bg-white/[0.08] dark:data-[state=open]:bg-white/[0.06]"

const labelClass = "text-[0.65rem] font-medium uppercase tracking-[0.18em] text-muted-foreground"

export function ProfileWalletMenu({ className }: { className?: string }) {
  const resolved = useDocumentTheme()
  const isDark = resolved === "dark"
  const { address, isConnected, status } = useAccount()
  const { disconnect } = useDisconnect()
  const { openConnectModal } = useConnectModal()
  const { openChainModal } = useChainModal()
  const { linkedWallets, addLinkedWallet, removeLinkedWallet } =
    useLinkedUnityWallets(address)

  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const [linkInput, setLinkInput] = useState("")
  const [linkError, setLinkError] = useState<string | null>(null)
  const [addressCopied, setAddressCopied] = useState(false)

  const triggerSurface = cn(
    "pointer-events-auto h-8 gap-1.5 border-white/25 bg-background/55 px-3 text-xs font-medium shadow-lg backdrop-blur-md hover:bg-background/75 dark:border-white/15 dark:bg-background/40",
    isDark ? "text-white/90" : "text-slate-900/90",
  )

  const onCopyAddress = async () => {
    if (!address) {
      return
    }

    try {
      await navigator.clipboard.writeText(address)
      setAddressCopied(true)
      window.setTimeout(() => setAddressCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  const onSubmitLink = () => {
    setLinkError(null)
    try {
      addLinkedWallet(linkInput)
      setLinkInput("")
      setLinkDialogOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add wallet."
      setLinkError(message)
    }
  }

  const busy = status === "connecting" || status === "reconnecting"

  if (!isConnected || !address) {
    return (
      <div className={cn(className)}>
        <Button
          className={triggerSurface}
          disabled={busy || !openConnectModal}
          size="sm"
          type="button"
          variant="outline"
          onClick={() => openConnectModal?.()}
        >
          <Wallet className="size-3.5 opacity-80" />
          {busy ? "Connecting…" : "Connect"}
        </Button>
      </div>
    )
  }

  return (
    <div className={cn(className)}>
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button
              className={cn(triggerSurface, "pr-2")}
              size="sm"
              type="button"
              variant="outline"
            >
              <span className="font-mono tracking-tight">{shortenAddressMiddle(address)}</span>
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenu.Trigger>

          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className={menuContentClass}
              sideOffset={8}
            >
              <div className={cn("px-2.5 py-2", labelClass)}>Connected</div>
              <DropdownMenu.Item
                className={cn(
                  itemClass,
                  "mx-0.5 mb-1",
                  addressCopied &&
                    (isDark ? "text-emerald-200 data-highlighted:text-emerald-100" : "text-emerald-800 data-highlighted:text-emerald-900"),
                )}
                onSelect={(event) => {
                  event.preventDefault()
                  void onCopyAddress()
                }}
              >
                {addressCopied ? (
                  <Check className="size-3.5 shrink-0 opacity-80" strokeWidth={2.25} />
                ) : (
                  <Copy className="size-3.5 shrink-0 opacity-80" />
                )}
                {addressCopied ? "Copied" : "Copy address"}
              </DropdownMenu.Item>

              {openChainModal ? (
                <DropdownMenu.Item className={itemClass} onSelect={() => openChainModal()}>
                  <Network className="size-3.5 shrink-0 opacity-80" />
                  Switch network
                </DropdownMenu.Item>
              ) : null}

              <DropdownMenu.Item
                className={cn(itemClass, openChainModal ? "mt-2" : null)}
                onSelect={() => setLinkDialogOpen(true)}
              >
                <Link2 className="size-3.5 opacity-80" />
                Link another wallet
              </DropdownMenu.Item>

              {linkedWallets.length > 0 ? (
                <>
                  <DropdownMenu.Separator className="my-1.5 h-px bg-white/12 dark:bg-white/[0.08]" />
                  <div className={cn("px-2.5 pt-1 pb-1", labelClass)}>Linked to this pet</div>
                  {linkedWallets.map((linked) => (
                    <DropdownMenu.Item
                      key={linked}
                      className={cn(itemClass, "justify-between gap-3")}
                      onSelect={(event) => {
                        event.preventDefault()
                        removeLinkedWallet(linked)
                      }}
                    >
                      <span className="font-mono text-[0.7rem]">{shortenAddressMiddle(linked)}</span>
                      <span className="text-[0.65rem] text-muted-foreground">Remove</span>
                    </DropdownMenu.Item>
                  ))}
                </>
              ) : null}

              <DropdownMenu.Separator className="my-1.5 h-px bg-white/12 dark:bg-white/[0.08]" />

              <DropdownMenu.Item
                className={cn(itemClass, "text-destructive focus:text-destructive")}
                onSelect={() => disconnect()}
              >
                <LogOut className="size-3.5 opacity-80" />
                Disconnect
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <DialogContent className="max-w-md border-white/15">
          <DialogHeader>
            <DialogTitle className="text-2xl md:text-3xl">Link another wallet</DialogTitle>
            <DialogDescription>
              Link additional wallets to your Unity Pet profile. You will need to confirm on both wallets.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            <label className={cn("block text-xs", labelClass)} htmlFor="unity-link-wallet">
              Wallet address
            </label>
            <input
              id="unity-link-wallet"
              autoComplete="off"
              className={cn(
                "w-full rounded-none border border-white/15 bg-black/30 px-3 py-2 font-mono text-sm outline-none ring-0 transition-[border-color,box-shadow] focus-visible:border-[#FC72FF]/55 focus-visible:ring-2 focus-visible:ring-[#FC72FF]/25",
                isDark ? "text-white/90 placeholder:text-white/35" : "text-foreground",
              )}
              placeholder="0x…"
              spellCheck={false}
              value={linkInput}
              onChange={(event) => {
                setLinkInput(event.target.value)
                setLinkError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onSubmitLink()
                }
              }}
            />
            {linkError ? <p className="text-sm text-destructive">{linkError}</p> : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                className="border-[#FC72FF]/40 bg-[#FC72FF]/12 text-white hover:!bg-[#FF8AF4]/18"
                type="button"
                variant="brand"
                onClick={onSubmitLink}
              >
                <Link2 className="size-3.5" />
                Add wallet
              </Button>
              <Button
                className="border-white/20 bg-transparent"
                type="button"
                variant="outline"
                onClick={() => setLinkDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <Unplug className="mt-0.5 size-3.5 shrink-0 opacity-80" />
              Linking here does not move funds or grant permissions; it only records the address
              for your profile UI.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
