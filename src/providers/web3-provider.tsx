import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit"
import { type ReactNode, useMemo } from "react"
import { WagmiProvider } from "wagmi"

import { useDocumentTheme } from "@/hooks/use-document-theme"
import { BRAND_PINK } from "@/lib/constants"
import { wagmiConfig } from "@/lib/wagmi"

const accent = BRAND_PINK
const accentForeground = "#0a0a0b"

export function Web3Provider({ children }: { children: ReactNode }) {
  const resolved = useDocumentTheme()

  const theme = useMemo(
    () =>
      resolved === "dark"
        ? darkTheme({
            accentColor: accent,
            accentColorForeground: accentForeground,
            borderRadius: "none",
            fontStack: "system",
          })
        : lightTheme({
            accentColor: accent,
            accentColorForeground: accentForeground,
            borderRadius: "none",
            fontStack: "system",
          }),
    [resolved],
  )

  return (
    <WagmiProvider config={wagmiConfig}>
      <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>
    </WagmiProvider>
  )
}
