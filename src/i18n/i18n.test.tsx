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

  it("exposes pt-BR and en as the supported languages", () => {
    expect(supportedLanguages).toEqual(["pt-BR", "en"])
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
