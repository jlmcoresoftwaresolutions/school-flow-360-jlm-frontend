import type { Meta, StoryObj } from "@storybook/react-vite"
import { MemoryRouter, Route, Routes } from "react-router-dom"

import { Text } from "@/ds-components/atoms"

import { AppShell } from "./AppShell"

const meta: Meta<typeof AppShell> = {
  args: {
    organizationName: "Colégio Horizonte",
    unitName: "Unidade Aldeota",
  },
  argTypes: {
    organizationName: {
      control: "text",
      description: "Nome exibido no rodapé da sidebar, identificando a organização corrente.",
    },
    unitName: {
      control: "text",
      description: "Nome exibido no rodapé da sidebar, identificando a unidade corrente dentro da organização.",
    },
  },
  component: AppShell,
  tags: ["autodocs"],
  title: "Templates/AppShell",
}

export default meta

type Story = StoryObj<typeof AppShell>

// Default rendering: sidebar + a placeholder routed page shown through the Outlet
export const Default: Story = {
  render: (args) => (
    <MemoryRouter initialEntries={["/administracao/minha-escola"]}>
      <Routes>
        <Route element={<AppShell {...args} />}>
          <Route
            element={
              <Text as="p" fontSize="xl" bold>
                Conteúdo da página roteada
              </Text>
            }
            path="/administracao/minha-escola"
          />
        </Route>
      </Routes>
    </MemoryRouter>
  ),
}

// A route with no matching nav item leaves every Sidebar item inactive
export const UnknownRoute: Story = {
  render: (args) => (
    <MemoryRouter initialEntries={["/rota-desconhecida"]}>
      <Routes>
        <Route element={<AppShell {...args} />}>
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
