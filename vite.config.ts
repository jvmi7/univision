import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

const anvilRpcProxy = {
  "/anvil-rpc": {
    target: "http://127.0.0.1:8545",
    changeOrigin: true,
    rewrite: () => "/",
  },
} as const

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  /** Browser → same-origin `/api/rpc` → API (avoids CORS to another port in dev). */
  const apiRpcProxyTarget =
    env.VITE_DEV_API_RPC_TARGET?.trim() || "http://127.0.0.1:3001"

  /** Browser → same-origin `/api/*` (profiles, leaderboards, rpc, …) → API server. */
  const apiProxy = {
    "/api": {
      target: apiRpcProxyTarget,
      changeOrigin: true,
    },
  } as const

  const devProxy = { ...anvilRpcProxy, ...apiProxy }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: devProxy,
    },
    preview: {
      proxy: devProxy,
    },
  }
})
