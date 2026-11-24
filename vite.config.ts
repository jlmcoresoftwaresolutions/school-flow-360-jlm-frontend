import path from "node:path"

import react from "@vitejs/plugin-react"
import type { ProxyOptions } from "vite"
import { defineConfig, loadEnv } from "vite"
import { configDefaults } from "vitest/config"

// https://vite.dev/config/
export default defineConfig((configEnv) => {
  const { mode } = configEnv

  const env = loadEnv(mode, import.meta.dirname, "")

  // In development the app calls /api on its own origin (VITE_API_BASE_URL is empty in
  // .env.development) and this forwards it to the backend, so local work doesn't depend on the
  // backend's CORS. The browser's Origin header is dropped on the way: the backend would otherwise
  // reject localhost as a cross-origin caller. `vite preview` reuses the same proxy.
  const apiProxy: Record<string, ProxyOptions> = {
    "/api": {
      changeOrigin: true,
      configure: (proxy) => {
        proxy.on("proxyReq", (request) => request.removeHeader("origin"))
      },
      target: env.API_PROXY_TARGET,
    },
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    server: {
      open: true,
      proxy: apiProxy,
      // The pages are lazy routes, so the dev server would otherwise only compile each one the first
      // time it is opened - a pause on first navigation. Warming them up compiles them as soon as the
      // server starts. (The E2E suite runs against a build instead, see playwright.config.ts.)
      warmup: {
        clientFiles: ["./src/main.tsx", "./src/pages/*/index.ts", "./src/ds-components/templates/*/index.ts"],
      },
    },
    test: {
      environment: "jsdom",
      exclude: [...configDefaults.exclude, "e2e/**"],
      // Worker threads start faster than the default child processes; each test file is still isolated.
      pool: "threads",
      setupFiles: ["./src/test/setup.ts"],
    },
  }
})
