/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  /**
   * Full URL for mainnet `eth_*` calls: your API `POST …/api/rpc` (forwards to `RPC_PROXY_URL` / Merkle on the server).
   * Example: `http://localhost:3001/api/rpc`. In Vite dev, same-origin `/api/rpc` is used by default unless this is set.
   */
  readonly VITE_RPC_PROXY_URL?: string
  /** Vite dev/preview: target for proxying `/api/rpc` (default `http://127.0.0.1:3001`). */
  readonly VITE_DEV_API_RPC_TARGET?: string
  /**
   * Optional: bypass the API proxy and set an L1 JSON-RPC URL directly (browser CORS must allow your origin).
   * Leave unset so mainnet always uses the API proxy pattern.
   */
  readonly VITE_MAINNET_RPC_URL?: string
  /** Include Anvil / Hardhat (31337) in wagmi + RainbowKit outside `vite` dev server. */
  readonly VITE_ENABLE_ANVIL_CHAIN?: string
  /** `0x…` ERC-721-style `mint(address)` for local NFT demos. */
  readonly VITE_LOCAL_NFT_ADDRESS?: string
  /** `0x…` ProfileRegistry — profile mint calls `registerName(string)`. */
  readonly VITE_PROFILE_REGISTRY_ADDRESS?: string
}
