import { render, screen } from "@testing-library/react"
import { useTranslation } from "react-i18next"
import { afterEach, describe, expect, it } from "vitest"

import { i18n, supportedLanguages } from "./i18n"

const TranslatedSignIn = () => {
  const { t } = useTranslation()

  return <>{t("login.signIn")}</>
}

describe("i18n", () => {
  afterEach(async () => {
    await i18n.changeLanguage("pt-BR")
  })

  it("falls back to pt-BR when a translation is missing for the active language", () => {
    expect(i18n.options.fallbackLng).toEqual(["pt-BR"])
  })

  it("detects the language from the browser only, without remembering it", () => {
    expect(i18n.options.detection).toMatchObject({ caches: [], order: ["navigator"] })
  })

  it("exposes Portuguese (Brazil and Portugal), English, Spanish and French as the supported languages", () => {
    expect(supportedLanguages).toEqual(["pt-BR", "pt-PT", "en", "es", "fr"])
  })

  // What the browser reports (navigator.languages) -> the catalog the app picks.
  it.each([
    ["pt-BR", "pt-BR"],
    ["pt-PT", "pt-PT"],
    ["pt", "pt-BR"],
    ["pt-AO", "pt-BR"],
    ["en-US", "en"],
    ["en-GB", "en"],
    ["es-ES", "es"],
    ["es-MX", "es"],
    ["fr-FR", "fr"],
    ["fr-CA", "fr"],
  ])("picks %s as %s", (browserLanguage, expected) => {
    expect(i18n.services.languageUtils.getBestMatchFromCodes([browserLanguage])).toBe(expected)
  })

  it("translates the same key in every supported language", async () => {
    const signIn: Record<string, string> = {}

    for (const language of supportedLanguages) {
      await i18n.changeLanguage(language)
      signIn[language] = i18n.t("login.signIn")
    }

    expect(signIn).toEqual({
      en: "Sign in",
      es: "Iniciar sesión",
      fr: "Se connecter",
      "pt-BR": "Entrar",
      "pt-PT": "Iniciar sessão",
    })
  })

  // findByText, not getByText: react-i18next can render once before a changeLanguage call settles
  // and again once it does, so the translated text isn't necessarily there on the very first render.
  it("translates a key in pt-BR", async () => {
    await i18n.changeLanguage("pt-BR")
    render(<TranslatedSignIn />)

    expect(await screen.findByText("Entrar")).toBeInTheDocument()
  })

  it("translates the same key differently once the language changes", async () => {
    await i18n.changeLanguage("en")
    render(<TranslatedSignIn />)

    expect(await screen.findByText("Sign in")).toBeInTheDocument()
  })
})
