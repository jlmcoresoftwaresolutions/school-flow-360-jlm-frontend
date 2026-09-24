import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it } from "vitest"

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

    expect(screen.getByRole("button", { name: "Início" })).toBeDisabled()

    groups.forEach((name) => {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false")
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
})
