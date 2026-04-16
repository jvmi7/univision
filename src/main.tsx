import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "@rainbow-me/rainbowkit/styles.css"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { QueryProvider } from "@/providers/query-provider"
import { Web3Provider } from "@/providers/web3-provider"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryProvider>
      <BrowserRouter>
        <ThemeProvider defaultTheme="dark">
          <Web3Provider>
            <App />
          </Web3Provider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryProvider>
  </StrictMode>,
)
