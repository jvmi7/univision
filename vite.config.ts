import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const anvilRpcProxy = {
  "/anvil-rpc": {
    target: "http://127.0.0.1:8545",
    changeOrigin: true,
    rewrite: () => "/",
  },
} as const

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: anvilRpcProxy,
  },
  preview: {
    proxy: anvilRpcProxy,
  },
})
