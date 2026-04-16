import { defineChain } from "viem"

/** Same-origin path proxied by `vite.config.ts` → `127.0.0.1:8545` (Anvil has no CORS headers). */
export const ANVIL_BROWSER_RPC_PATH = "/anvil-rpc" as const

/**
 * JSON-RPC base URL for wagmi/viem in the browser.
 * Prefer the Vite dev/preview proxy so `eth_call` is not blocked by CORS to loopback.
 */
export function getAnvilBrowserJsonRpcBaseUrl(): string {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8545"
  }
  const { protocol, host, hostname } = window.location
  const onPrivateLan =
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)
  const useSameOriginProxy =
    import.meta.env.DEV ||
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname.endsWith(".localhost") ||
    onPrivateLan
  if (useSameOriginProxy) {
    return `${protocol}//${host}${ANVIL_BROWSER_RPC_PATH}`
  }
  return "http://127.0.0.1:8545"
}

/** Anvil / Hardhat node default: chain id 31337, JSON-RPC via Vite proxy in browser dev. */
export const anvilLocalhost = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: [getAnvilBrowserJsonRpcBaseUrl()] },
  },
})
