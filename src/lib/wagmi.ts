import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http, type Chain } from "viem"
import { arbitrum, base, mainnet, optimism } from "wagmi/chains"
import { anvilLocalhost } from "@/lib/chains"
import { isAnvilChainEnabledInConfig } from "@/lib/local-chain-config"

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? ""

if (!projectId && import.meta.env.DEV) {
  // WalletConnect-powered wallets need a project id from https://cloud.walletconnect.com
  console.warn(
    "[univision] Set VITE_WALLETCONNECT_PROJECT_ID in .env for full WalletConnect support.",
  )
}

/**
 * Ethereum mainnet JSON-RPC must not hit Merkle (or other upstreams) from the browser — CORS.
 * Always use your API `POST /api/rpc`; the API forwards to `RPC_PROXY_URL` (e.g. Merkle) server-side.
 *
 * Resolution order:
 * 1. `VITE_MAINNET_RPC_URL` — escape hatch (direct browser → RPC; avoid for Merkle).
 * 2. `VITE_RPC_PROXY_URL` — full URL to `POST …/api/rpc` (e.g. `http://localhost:3001/api/rpc`).
 * 3. `VITE_API_BASE_URL` + `/api/rpc` — deployed app with a known API origin.
 * 4. Local browser host: same-origin `/api/rpc` (Vite proxies to the API; see `vite.config.ts`).
 * 5. Fallback: `http://127.0.0.1:3001/api/rpc`.
 */
function isLocalAppHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost")
  )
}

function resolveMainnetHttpRpcUrl(): string {
  const directOverride = import.meta.env.VITE_MAINNET_RPC_URL?.trim()
  if (directOverride) {
    return directOverride
  }

  const explicitProxy = import.meta.env.VITE_RPC_PROXY_URL?.trim()
  if (explicitProxy) {
    return explicitProxy
  }

  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/$/, "")
  if (apiBase) {
    return `${apiBase}/api/rpc`
  }

  if (typeof window !== "undefined" && isLocalAppHost(window.location.hostname)) {
    const { protocol, host } = window.location
    return `${protocol}//${host}/api/rpc`
  }

  return "http://127.0.0.1:3001/api/rpc"
}

const chains: readonly Chain[] = isAnvilChainEnabledInConfig()
  ? [mainnet, base, arbitrum, optimism, anvilLocalhost]
  : [mainnet, base, arbitrum, optimism]

const transports = Object.fromEntries(
  chains.map((chain) => {
    const url =
      chain.id === mainnet.id
        ? resolveMainnetHttpRpcUrl()
        : chain.rpcUrls.default.http[0]
    return [chain.id, http(url)]
  }),
) as Record<number, ReturnType<typeof http>>

export const wagmiConfig = getDefaultConfig({
  appName: "Univision",
  projectId,
  chains,
  transports,
  /**
   * Must stay `true` for client-only apps: `ssr: false` makes wagmi’s `Hydrate` call
   * `onMount()`/`reconnect()` synchronously during render, which triggers setState in
   * descendants (e.g. `ProfileWalletMenu` via `useAccount`) and React warns.
   */
  ssr: true,
})
