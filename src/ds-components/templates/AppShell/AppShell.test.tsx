import { fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { AppShell } from "./AppShell"

const renderAppShell = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppShell organizationName="Colégio Horizonte" unitName="Unidade Aldeota" />}>
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

  it("renders the organization and unit names in the sidebar footer", () => {
    renderAppShell("/outra")

    expect(screen.getByText("Colégio Horizonte")).toBeInTheDocument()
    expect(screen.getByText("Unidade Aldeota")).toBeInTheDocument()
  })

  it("renders the routed content through the Outlet", () => {
    renderAppShell("/outra")

    expect(screen.getByText("Outra página")).toBeInTheDocument()
  })

  it("marks the Minha Escola nav item active when the current route matches it", () => {
    renderAppShell("/administracao/minha-escola")

    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
  })

  it("leaves the Minha Escola nav item inactive on a different route", () => {
    renderAppShell("/outra")

    expect(screen.getByRole("button", { name: "Minha Escola" })).not.toHaveAttribute("aria-current")
  })

  it("navigates to Minha Escola when its nav item is clicked", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Minha Escola" }))

    expect(screen.getByText("Página Minha Escola")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Minha Escola" })).toHaveAttribute("aria-current", "page")
  })
})
