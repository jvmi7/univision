import { type Address, isAddress } from "viem"

import { anvilLocalhost } from "@/lib/chains"

function parseAddress(raw: string | undefined): Address | undefined {
  if (!raw?.trim()) {
    return undefined
  }
  const v = raw.trim() as `0x${string}`
  return isAddress(v) ? v : undefined
}

/** When true, `anvilLocalhost` is included in the wagmi chain list (also outside `import.meta.env.DEV`). */
export function isAnvilChainEnabledInConfig(): boolean {
  return (
    import.meta.env.DEV || import.meta.env.VITE_ENABLE_ANVIL_CHAIN === "true"
  )
}

export const LOCAL_CHAIN = anvilLocalhost

export const fakeUniAddress = parseAddress(
  "0x700b6A60ce7EaaEA56F065753d8dcB9653dbAD35"
)

export const localNftAddress = parseAddress(
  import.meta.env.VITE_LOCAL_NFT_ADDRESS,
)

export function isFakeUniConfigured(): boolean {
  return Boolean(fakeUniAddress)
}

export function isLocalNftConfigured(): boolean {
  return Boolean(localNftAddress)
}

/** Show the floating local-chain dev tools (faucet, NFT mint, Anvil ETH). */
export function isLocalChainDevPanelEnabled(): boolean {
  return (
    isAnvilChainEnabledInConfig() &&
    (Boolean(import.meta.env.DEV) ||
      isFakeUniConfigured() ||
      isLocalNftConfigured())
  )
}
