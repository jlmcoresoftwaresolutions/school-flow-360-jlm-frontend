import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { Text } from "@/ds-components/atoms"

import { AppShell } from "./AppShell"

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
  render: () => (
    <MemoryRouter initialEntries={["/administration/my-school"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            element={
              <Text as="p" fontSize="xl" bold>
                Conteúdo da página roteada
              </Text>
            }
            path="/administration/my-school"
          />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
}

// A route with no matching nav item leaves every Sidebar item inactive and the Administração group collapsed
export const UnknownRoute: Story = {
  render: () => (
    <MemoryRouter initialEntries={["/rota-desconhecida"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            element={
              <Text as="p" fontSize="xl" bold>
                Página sem item correspondente na sidebar
              </Text>
            }
            path="/rota-desconhecida"
          />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
}
