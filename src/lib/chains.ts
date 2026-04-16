import { defineChain } from "viem"

/** Anvil / Hardhat node default: chain id 31337, JSON-RPC on 127.0.0.1:8545. */
export const anvilLocalhost = defineChain({
  id: 31337,
  name: "Anvil Local",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
})
