import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll } from "vitest"

import { i18n } from "@/i18n"

// Components that translate their copy (AppShell, the pages) read the i18next instance set up in
// @/i18n, which the app only imports from main.tsx - importing it here gives every test that same
// instance. jsdom reports an English browser, so the language is pinned to pt-BR, the app's
// fallback and the language the assertions are written in; a test that switches it restores it.
beforeAll(async () => {
  await i18n.changeLanguage("pt-BR")
})

afterEach(() => {
  cleanup()
})
