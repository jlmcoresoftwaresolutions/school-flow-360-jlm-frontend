import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { useUnsavedChanges } from "@/components/UnsavedChangesGuard"
import { i18n } from "@/i18n"
import type { UserContext } from "@/models"

import { AppShell } from "./AppShell"

// The shell reads the school's published identity; here nothing was published, and no request leaves.
vi.mock("@/services/branding", () => ({ getPublishedBranding: vi.fn().mockRejectedValue(new Error("Not published")) }))

// A page with a form that has unsaved changes.
const EditingPage = () => {
  useUnsavedChanges(true)

  return <div>Página em edição</div>
}

const signedInAs = (fullName: string | null, roles: UserContext["roles"]): UserContext => ({
  admin: roles.includes("ADMIN"),
  assignments: [],
  email: "joao.silva@escola.com.br",
  fullName,
  roles,
  userId: 1,
})

const admin = signedInAs("João Silva", ["ADMIN"])

// A data router (createMemoryRouter), like the app's own: the unsaved-changes guard needs one. Who
// signed in is the AppShell route's loader data, given as hydration data so the first render is
// immediate.
const renderAppShell = (initialEntry: string, user: UserContext | null = admin) =>
  render(
    <RouterProvider
      router={createMemoryRouter(
        [
          { element: <div>Saindo da conta</div>, path: "/sign-out" },
          {
            children: [
              { element: <div>Outra página</div>, path: "/outra" },
              { element: <div>Página Minha Organização</div>, path: "/administration/my-unit" },
              { element: <div>Página Início</div>, path: "/home" },
              { element: <div>Página Mensalidades</div>, path: "/finance/tuition" },
              { element: <div>Perfil do aluno</div>, path: "/administration/students/:studentId" },
              { element: <EditingPage />, path: "/editando" },
            ],
            element: <AppShell />,
            id: "shell",
            loader: () => user,
          },
        ],
        { hydrationData: { loaderData: { shell: user } }, initialEntries: [initialEntry] },
      )}
    />,
  )

// Signing out is in the menu the user block (in the topbar) opens.
const signOut = () => {
  fireEvent.click(within(screen.getByRole("banner")).getByRole("button", { name: /^João Silva/ }))
  fireEvent.click(screen.getByRole("menuitem", { name: "Sair" }))
}

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
    // Opening every group of the menu, which grows with each module, outlasts the default 5s on a busy run.
  }, 15000)

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
    expect(screen.queryByRole("button", { name: "Minha Organização" })).not.toBeInTheDocument()
  })

  it("opens the Administração group and marks Minha Organização as the current page on its route", () => {
    renderAppShell("/administration/my-unit")

    expect(screen.getByRole("button", { name: "Administração" })).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("button", { name: "Minha Organização" })).toHaveAttribute("aria-current", "page")
  })

  it("navigates to Minha Organização after expanding the group and clicking its item", () => {
    renderAppShell("/outra")

    fireEvent.click(screen.getByRole("button", { name: "Administração" }))
    fireEvent.click(screen.getByRole("button", { name: "Minha Organização" }))

    expect(screen.getByText("Página Minha Organização")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Minha Organização" })).toHaveAttribute("aria-current", "page")
  })

  it("renders the topbar with notifications and help disabled, as those features don't exist yet", () => {
    renderAppShell("/outra")

    const topbar = within(screen.getByRole("banner"))

    expect(topbar.getByRole("button", { name: "Notificações" })).toBeDisabled()
    expect(topbar.getByRole("button", { name: "Ajuda" })).toBeDisabled()
  })

  it("shows the signed-in user with their role, and a menu with only signing out", () => {
    renderAppShell("/outra")

    const banner = within(screen.getByRole("banner"))
    expect(banner.getByText("João Silva")).toBeInTheDocument()
    expect(banner.getByText("Administrador")).toBeInTheDocument()
    expect(banner.queryByRole("button", { name: "Sair" })).not.toBeInTheDocument()

    fireEvent.click(banner.getByRole("button", { name: /^João Silva/ }))

    const menu = screen.getByRole("menu", { name: "Menu do usuário" })
    expect(
      within(menu)
        .getAllByRole("menuitem")
        .map((item) => item.textContent),
    ).toEqual(["Meu perfil", "Sair"])
  })

  it("shows several roles of one person, widest first", () => {
    renderAppShell("/outra", signedInAs("Maria Souza", ["PROFESSOR", "COORDENACAO"]))

    const banner = within(screen.getByRole("banner"))
    expect(banner.getByText("Maria Souza")).toBeInTheDocument()
    expect(banner.getByText("Coordenação, Professor")).toBeInTheDocument()
  })

  it("shows the e-mail when the user has no name, and a generic label when nobody is known", () => {
    const { unmount } = renderAppShell("/outra", signedInAs(null, ["SECRETARIA"]))

    expect(within(screen.getByRole("banner")).getByText("joao.silva@escola.com.br")).toBeInTheDocument()
    unmount()

    renderAppShell("/outra", null)

    expect(within(screen.getByRole("banner")).getByText("Minha conta")).toBeInTheDocument()
  })

  it("leaves out of the menu the pages a role doesn't open, and the groups left empty", () => {
    renderAppShell("/outra", signedInAs("Maria Souza", ["PROFESSOR"]))

    const sidebar = within(screen.getByRole("complementary"))
    expect(sidebar.queryByRole("button", { name: "Administração" })).not.toBeInTheDocument()
    expect(sidebar.queryByRole("button", { name: "Usuários" })).not.toBeInTheDocument()

    fireEvent.click(sidebar.getByRole("button", { name: "Logs de Acesso" }))
    expect(sidebar.getByRole("button", { name: "Acessos recentes" })).toBeInTheDocument()
    expect(sidebar.queryByRole("button", { name: "Auditoria" })).not.toBeInTheDocument()
  })

  it("shows a Secretaria Minha Organização (to read) and the users' pages, but not the audit", () => {
    renderAppShell("/outra", signedInAs("Maria Souza", ["SECRETARIA"]))

    const sidebar = within(screen.getByRole("complementary"))
    fireEvent.click(sidebar.getByRole("button", { name: "Administração" }))
    expect(sidebar.getByRole("button", { name: "Minha Organização" })).toBeInTheDocument()

    fireEvent.click(sidebar.getByRole("button", { name: "Logs de Acesso" }))
    expect(sidebar.queryByRole("button", { name: "Auditoria" })).not.toBeInTheDocument()

    fireEvent.click(sidebar.getByRole("button", { name: "Usuários" }))
    expect(sidebar.getByRole("button", { name: "Lista de usuários" })).toBeInTheDocument()
    expect(sidebar.getByRole("button", { name: "Convites" })).toBeInTheDocument()
  })

  it("signs out through the sign-out route, so it goes through the unsaved-changes warning", async () => {
    renderAppShell("/outra")

    signOut()

    expect(await screen.findByText("Saindo da conta")).toBeInTheDocument()
  })

  it("asks before leaving a page with unsaved changes, and stays when told to", async () => {
    renderAppShell("/editando")

    signOut()

    const dialog = await screen.findByRole("dialog", { name: "Descartar alterações?" })
    fireEvent.click(within(dialog).getByRole("button", { name: "Continuar editando" }))

    expect(await screen.findByText("Página em edição")).toBeInTheDocument()
    expect(screen.queryByText("Saindo da conta")).not.toBeInTheDocument()
  })

  it("shows the breadcrumb for Minha Organização, with the current page marked", () => {
    renderAppShell("/administration/my-unit")

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })

    expect(within(breadcrumb).getByText("Administração")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Minha Organização")).toHaveAttribute("aria-current", "page")
  })

  it("keeps the menu entry and breadcrumb of the page a record belongs to", () => {
    renderAppShell("/administration/students/12")

    const breadcrumb = screen.getByRole("navigation", { name: "Você está em" })

    expect(screen.getByText("Perfil do aluno")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Administração")).toBeInTheDocument()
    expect(within(breadcrumb).getByText("Alunos")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alunos" })).toHaveAttribute("aria-current", "page")
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
      expect(
        within(screen.getByRole("navigation", { name: "You are here" })).getByText("My Organization"),
      ).toHaveAttribute("aria-current", "page")
      expect(within(screen.getByRole("banner")).getByRole("button", { name: "Notifications" })).toBeDisabled()
    })
  })
})
