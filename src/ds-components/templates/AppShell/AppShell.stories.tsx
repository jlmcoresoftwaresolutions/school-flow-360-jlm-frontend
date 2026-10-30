import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"

import { Text } from "@/ds-components/atoms"

import { AppShell } from "./AppShell"

type AppShellExampleProps = {
  initialPath: string
  pageText: string
}

// AppShell needs a data router (its unsaved-changes guard uses useBlocker), so the stories build a
// small one; any path renders the same placeholder page, so the menu can be clicked through.
const AppShellExample = (props: AppShellExampleProps) => {
  const { initialPath, pageText } = props

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
        },
      ],
      { initialEntries: [initialPath] },
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
  render: () => <AppShellExample initialPath="/administration/my-school" pageText="Conteúdo da página roteada" />,
}

// A route with no matching nav item leaves every Sidebar item inactive and every group collapsed
export const UnknownRoute: Story = {
  render: () => (
    <AppShellExample initialPath="/rota-desconhecida" pageText="Página sem item correspondente na sidebar" />
  ),
}
