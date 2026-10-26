import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import { LanguageSwitcher } from "./LanguageSwitcher"

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: "Alterar idioma" }))

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    await i18n.changeLanguage("pt-BR")
  })

  it("renders a trigger named by label", () => {
    render(<LanguageSwitcher label="Alterar idioma" />)

    expect(screen.getByRole("button", { name: "Alterar idioma" })).toHaveAttribute("aria-haspopup", "menu")
  })

  it("lists every supported language by its own name, with the active one checked", () => {
    render(<LanguageSwitcher label="Alterar idioma" />)

    openMenu()

    expect(screen.getByRole("menuitemradio", { name: "Português (Brasil)" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "false")
  })

  it("switches the language when another one is picked", async () => {
    render(<LanguageSwitcher label="Alterar idioma" />)

    openMenu()
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }))

    await waitFor(() => expect(i18n.resolvedLanguage).toBe("en"))
  })

  it("keeps the html lang attribute in sync with the active language", async () => {
    render(<LanguageSwitcher label="Alterar idioma" />)

    openMenu()
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }))

    await waitFor(() => expect(document.documentElement).toHaveAttribute("lang", "en"))
  })

  it("forwards className and style to the trigger", () => {
    render(<LanguageSwitcher className="custom" label="Alterar idioma" style={{ margin: "4px" }} />)

    expect(screen.getByRole("button", { name: "Alterar idioma" })).toHaveClass("custom")
    expect(screen.getByRole("button", { name: "Alterar idioma" })).toHaveStyle({ margin: "4px" })
  })
})
