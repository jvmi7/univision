import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { arbitrum, base, mainnet, optimism } from "wagmi/chains"

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? ""

if (!projectId && import.meta.env.DEV) {
  // WalletConnect-powered wallets need a project id from https://cloud.walletconnect.com
  console.warn(
    "[univision] Set VITE_WALLETCONNECT_PROJECT_ID in .env for full WalletConnect support.",
  )
}

export const wagmiConfig = getDefaultConfig({
  appName: "Univision",
  projectId,
  chains: [mainnet, base, arbitrum, optimism],
  ssr: false,
})
