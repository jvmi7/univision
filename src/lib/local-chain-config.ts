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

// Deterministic on a fresh Anvil node because LocalSetup.s.sol deploys these
// in fixed order from the same deployer (account #9). Override via env for
// Sepolia or any non-local deployment.
export const repEmitterAddress = parseAddress(
  import.meta.env.VITE_REP_EMITTER_ADDRESS ??
    "0xb19b36b1456e65e3a6d514d3f715f204bd59f431",
)

export const profileRegistryAddress = parseAddress(
  import.meta.env.VITE_PROFILE_REGISTRY_ADDRESS ??
    "0xa15bb66138824a1c7167f5e85b957d04dd34e468",
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
