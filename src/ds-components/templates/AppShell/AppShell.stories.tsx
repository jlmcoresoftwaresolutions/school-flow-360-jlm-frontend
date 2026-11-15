import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"

import { Text } from "@/ds-components/atoms"
import type { UserContext } from "@/models"

import { AppShell } from "./AppShell"

const signedInAs = (fullName: string, roles: UserContext["roles"]): UserContext => ({
  admin: roles.includes("ADMIN"),
  assignments: [],
  email: "usuario@escola.com.br",
  fullName,
  roles,
  userId: 1,
})

type AppShellExampleProps = {
  initialPath: string
  pageText: string
  user?: UserContext
}

// AppShell needs a data router (its unsaved-changes guard uses useBlocker), so the stories build a
// small one; any path renders the same placeholder page, so the menu can be clicked through. Who signed
// in is the layout route's loader data, as in the app.
const AppShellExample = (props: AppShellExampleProps) => {
  const { initialPath, pageText, user = signedInAs("João Silva", ["ADMIN"]) } = props

  const [router] = useState(() =>
    createMemoryRouter(
      [
        {
          children: [
            {
              element: (
                <Text as="p" fontSize="xl" bold>
                  {pageText}
                </Text>
              ),
              path: "*",
            },
          ],
          element: <AppShell />,
          id: "shell",
          loader: () => user,
        },
      ],
      { hydrationData: { loaderData: { shell: user } }, initialEntries: [initialPath] },
    ),
  )

  return <RouterProvider router={router} />
}

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
  title: "Templates/AppShell",
}

export default meta

type Story = StoryObj<typeof AppShell>

// Default rendering: sidebar, topbar with the page breadcrumb, and a placeholder routed page shown through the Outlet
export const Default: Story = {
  render: () => <AppShellExample initialPath="/administration/my-unit" pageText="Conteúdo da página roteada" />,
}

// A route with no matching nav item leaves every Sidebar item inactive and every group collapsed
export const UnknownRoute: Story = {
  render: () => (
    <AppShellExample initialPath="/rota-desconhecida" pageText="Página sem item correspondente na sidebar" />
  ),
}

// A Professor: the topbar shows the role, and the menu leaves out the organization's and the users' pages
export const AsProfessor: Story = {
  render: () => (
    <AppShellExample
      initialPath="/home"
      pageText="Conteúdo da página roteada"
      user={signedInAs("Maria Souza", ["PROFESSOR"])}
    />
  ),
}

// Someone with two roles: both are shown in the topbar, widest first
export const WithSeveralRoles: Story = {
  render: () => (
    <AppShellExample
      initialPath="/home"
      pageText="Conteúdo da página roteada"
      user={signedInAs("Carlos Lima", ["PROFESSOR", "COORDENACAO"])}
    />
  ),
}
