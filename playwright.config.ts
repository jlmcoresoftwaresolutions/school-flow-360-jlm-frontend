import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // The GitHub runner has 4 CPUs: three browsers at a time, one CPU left for the server and the runner.
  workers: process.env.CI ? 3 : undefined,
  reporter: "html",
  // Navigations include loading the target page's lazy chunk; the default 5s is tight for that on a
  // busy machine.
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:5174",
    // The app detects the browser language; the specs are written against the pt-BR copy.
    locale: "pt-BR",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // The suite runs against a build, not the dev server: every test opens a fresh browser, and the dev
  // server would send it hundreds of separate modules, compiling each page on its first visit. The build
  // uses the development mode, for .env.development (the fixed development school and /api on the same
  // origin, which the specs mock), and goes to its own folder, apart from the production dist/.
  webServer: {
    command:
      "bunx vite build --mode development --outDir dist-e2e --emptyOutDir --logLevel warn && bunx vite preview --mode development --outDir dist-e2e --port 5174 --strictPort",
    url: "http://localhost:5174",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
