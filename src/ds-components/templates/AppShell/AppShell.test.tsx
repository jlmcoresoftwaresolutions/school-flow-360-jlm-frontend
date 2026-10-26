import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import { i18n } from "@/i18n"

import { AppShell } from "./AppShell"

const renderAppShell = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route element={<div>Outra página</div>} path="/outra" />
          <Route element={<div>Página Minha Escola</div>} path="/administracao/minha-escola" />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe("AppShell", () => {
  it("renders the sidebar brand", () => {
    renderAppShell("/outra")

    expect(screen.getByText("SchoolFlow360º")).toBeInTheDocument()
  })

  it("renders the routed content through the Outlet", () => {
    renderAppShell("/outra")

    expect(screen.getByText("Outra página")).toBeInTheDocument()
  })

  it("renders every menu entry, with only Início being a plain item with no page yet", () => {
    renderAppShell("/outra")

    const groups = [
      "Acadêmico",
      "Financeiro",
      "Comunicação",
      "Relatórios",
      "Administração",
      "Usuários",
      "Configurações",
      "Logs de Acesso",
      "Ajuda",
    ]

    // Scoped to the sidebar: the topbar has its own "Ajuda" button.
    const sidebar = within(screen.getByRole("complementary"))

    expect(sidebar.getByRole("button", { name: "Início" })).toBeDisabled()

    groups.forEach((name) => {
      expect(sidebar.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("expands a group to reveal disabled placeholder children for pages that don't exist yet", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }))

    expect(screen.getByRole("button", { name: "Mensalidades" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cobranças" })).toBeDisabled()
  })

  it("lists Minha Escola as the only enabled child under Administração", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))

    expect(screen.getByRole("button", { name: "Minha Escola" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Unidades" })).toBeDisabled()
  })

  it("keeps the Administração group collapsed when the current route is not one of its pages", () => {
    renderAppShell("/outra")

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "Minha Escola" })).not.toBeInTheDocument()
  })

  it("opens the Administração group and marks Minha Escola as the current page on its route", () => {
    renderAppShell("/administracao/minha-escola")

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
  })

  it("navigates to Minha Escola after expanding the group and clicking its item", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))
    fireEvent.click(screen.getByRole("button", { name: "Minha Escola" }))

    expect(screen.getByText("Página Minha Escola")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
  })

  it("renders the topbar with notifications and help disabled, as those features don't exist yet", () => {
    renderAppShell("/outra")

    const topbar = within(screen.getByRole("banner"))

    expect(topbar.getByRole("button", { name: "Notificações" })).toBeDisabled()
    expect(topbar.getByRole("button", { name: "Ajuda" })).toBeDisabled()
  })

  it("shows the breadcrumb for Minha Escola, with the current page marked", () => {
    renderAppShell("/administracao/minha-escola")

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })

    expect(within(breadcrumb).getByText("Administração")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Minha Escola")).toHaveAttribute("aria-current", "page")
  })

  it("shows no breadcrumb on a route that has no trail", () => {
    renderAppShell("/outra")

    expect(screen.queryByRole("navigation", { name: "Você está em" })).not.toBeInTheDocument()
  })

  it("puts a language switcher in the topbar", () => {
    renderAppShell("/outra")

    expect(within(screen.getByRole("banner")).getByRole("button", { name: "Alterar idioma" })).toBeInTheDocument()
  })

  describe("in another language", () => {
    afterEach(async () => {
      await act(() => i18n.changeLanguage("pt-BR"))
    })

    it("translates the menu, the breadcrumb and the topbar", async () => {
      renderAppShell("/administracao/minha-escola")

      await act(() => i18n.changeLanguage("en"))

      expect(await screen.findByRole("button", { name: "Administration" })).toBeInTheDocument()
      expect(within(screen.getByRole("navigation", { name: "You are here" })).getByText("My School")).toHaveAttribute(
        "aria-current",
        "page",
      )
      expect(within(screen.getByRole("banner")).getByRole("button", { name: "Notifications" })).toBeDisabled()
    })
  })
})
