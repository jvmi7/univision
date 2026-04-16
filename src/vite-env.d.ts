/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_WALLETCONNECT_PROJECT_ID?: string
  /** Include Anvil / Hardhat (31337) in wagmi + RainbowKit outside `vite` dev server. */
  readonly VITE_ENABLE_ANVIL_CHAIN?: string
  /** `0x…` FakeUNI (or local ERC-20) with `faucet(uint256)`. */
  readonly VITE_FAKE_UNI_ADDRESS?: string
  /** `0x…` ERC-721-style `mint(address)` for local NFT demos. */
  readonly VITE_LOCAL_NFT_ADDRESS?: string
}
