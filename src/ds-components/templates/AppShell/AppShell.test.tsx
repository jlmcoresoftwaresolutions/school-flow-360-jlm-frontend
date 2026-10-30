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
              { element: <div>Página Minha Unidade</div>, path: "/administration/my-unit" },
              { element: <div>Página Início</div>, path: "/home" },
              { element: <div>Página Mensalidades</div>, path: "/finance/tuition" },
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

  it("renders every menu entry, with Início as a plain item and the rest as groups", () => {
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

    expect(sidebar.getByRole("button", { name: "Início" })).toBeEnabled()

    groups.forEach((name) => {
      expect(sidebar.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false")
    })
  })

  it("enables every child of every group, as each one has its own page", () => {
    renderAppShell("/outra")

    // Plain DOM queries for the disabled check: role queries over the whole menu, nine times, are slow.
    const sidebarElement = screen.getByRole("complementary")
    const sidebar = within(sidebarElement)
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

    groups.forEach((name) => {
      fireEvent.click(sidebar.getByRole("button", { name }))

      expect(sidebarElement.querySelectorAll("button:disabled")).toHaveLength(0)
    })
  })

  it("navigates to Início, marking it as the current page with its breadcrumb", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Início" }))

    expect(screen.getByText("Página Início")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Início" })).toHaveAttribute("aria-current", "page")
    expect(within(screen.getByRole("navigation", { name: "Você está em" })).getByText("Início")).toHaveAttribute(
      "aria-current",
      "page",
    )
  })

  it("navigates to a page of another group, showing its group and page in the breadcrumb", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Financeiro" }))
    fireEvent.click(screen.getByRole("button", { name: "Mensalidades" }))

    expect(screen.getByText("Página Mensalidades")).toBeInTheDocument()

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })
    expect(within(breadcrumb).getByText("Financeiro")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Mensalidades")).toHaveAttribute("aria-current", "page")
  })

  it("keeps the Administração group collapsed when the current route is not one of its pages", () => {
    renderAppShell("/outra")

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByRole("button", { name: "Minha Unidade" })).not.toBeInTheDocument()
  })

  it("opens the Administração group and marks Minha Unidade as the current page on its route", () => {
    renderAppShell("/administration/my-unit")

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Unidade" })).toHaveAttribute("aria-current", "page")
  })

  it("navigates to Minha Unidade after expanding the group and clicking its item", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))
    fireEvent.click(screen.getByRole("button", { name: "Minha Unidade" }))

    expect(screen.getByText("Página Minha Unidade")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Minha Unidade" })).toHaveAttribute("aria-current", "page")
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

  it("shows the breadcrumb for Minha Unidade, with the current page marked", () => {
    renderAppShell("/administration/my-unit")

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })

    expect(within(breadcrumb).getByText("Administração")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Minha Unidade")).toHaveAttribute("aria-current", "page")
  })

  it("shows the icon of the page's menu entry before the first breadcrumb entry only", () => {
    renderAppShell("/finance/tuition")

    const [first, last] = within(screen.getByRole("navigation", { name: "Você está em" })).getAllByRole("listitem")
    const groupIcon = within(screen.getByRole("complementary"))
      .getByRole("button", { name: "Financeiro" })
      .querySelector("svg")

    // Same drawing (paths), at the breadcrumb's smaller size.
    expect(first.querySelector("svg")?.innerHTML).toBe(groupIcon?.innerHTML)
    expect(last.querySelector("svg")).not.toBeInTheDocument()
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
      renderAppShell("/administration/my-unit")

      await act(() => i18n.changeLanguage("en"))

      expect(await screen.findByRole("button", { name: "Administration" })).toBeInTheDocument()
      expect(within(screen.getByRole("navigation", { name: "You are here" })).getByText("My Unit")).toHaveAttribute(
        "aria-current",
        "page",
      )
      expect(within(screen.getByRole("banner")).getByRole("button", { name: "Notifications" })).toBeDisabled()
    })
  })
})
