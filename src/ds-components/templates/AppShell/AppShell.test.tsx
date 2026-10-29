import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import { useUnsavedChanges } from "@/components"
import { i18n } from "@/i18n"

import { AppShell } from "./AppShell"

// A page with a form that has unsaved changes.
const EditingPage = () => {
  useUnsavedChanges(true)

  return <div>Página em edição</div>
}

// A data router (createMemoryRouter), like the app's own: the unsaved-changes guard needs one.
const renderAppShell = (initialEntry: string) =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { element: <div>Saindo da conta</div>, path: "/sign-out" },
          {
            children: [
              { element: <div>Outra página</div>, path: "/outra" },
              { element: <div>Página Minha Escola</div>, path: "/administration/my-school" },
              { element: <EditingPage />, path: "/editando" },
            ],
            element: <AppShell />,
          },
        ],
        { initialEntries: [initialEntry] },
      )}
    />,
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
    renderAppShell("/administration/my-school")

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

  it("signs out through the sign-out route, so it goes through the unsaved-changes warning", async () => {
    renderAppShell("/outra")

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Sair" }))

    expect(await screen.findByText("Saindo da conta")).toBeInTheDocument()
  })

  it("asks before leaving a page with unsaved changes, and stays when told to", async () => {
    renderAppShell("/editando")

    fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: "Sair" }))

    const dialog = await screen.findByRole("dialog", { name: "Descartar alterações?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Continuar editando" }))

    expect(await screen.findByText("Página em edição")).toBeInTheDocument()
    expect(screen.queryByText("Saindo da conta")).not.toBeInTheDocument()
  })

  it("shows the breadcrumb for Minha Escola, with the current page marked", () => {
    renderAppShell("/administration/my-school")

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })

    expect(within(breadcrumb).getByText("Administração")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Minha Escola")).toHaveAttribute("aria-current", "page")
  })

  it("shows no breadcrumb on a route that has no trail", () => {
    renderAppShell("/outra")

    expect(screen.queryByRole("navigation", { name: "Você está em" })).not.toBeInTheDocument()
  })

  // The language comes from the browser (see i18n.ts); changeLanguage stands in for an English one.
  describe("in a browser set to another language", () => {
    afterEach(async () => {
      await act(() => i18n.changeLanguage("pt-BR"))
    })

    it("translates the menu, the breadcrumb and the topbar", async () => {
      renderAppShell("/administration/my-school")

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
