import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { createMemoryRouter, Link, Outlet, RouterProvider } from "react-router-dom"

import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { spacing } from "@/foundation"

import { UnsavedChangesGuard } from "./UnsavedChangesGuard"
import { useUnsavedChanges } from "./useUnsavedChanges"

const ExampleForm = () => {
  const [value, setValue] = useState("")

  useUnsavedChanges(value !== "")

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
      <Input
        helperText="Digite algo e depois tente ir para outra página."
        onChange={(event) => setValue(event.target.value)}
        title="Nome da escola"
        value={value}
      />
      <Button as={Link} to="/outra" variant="link">
        Ir para outra página
      </Button>
    </div>
  )
}

const OtherPage = () => (
  <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
    <Text>Você saiu do formulário.</Text>
    <Button as={Link} to="/form" variant="link">
      Voltar ao formulário
    </Button>
  </div>
)

// The guard needs a data router, so the story builds a small one around a form.
const GuardedFormExample = () => {
  const [router] = useState(() =>
    createMemoryRouter(
      [
        {
          children: [
            { element: <ExampleForm />, path: "/form" },
            { element: <OtherPage />, path: "/outra" },
          ],
          element: (
            <UnsavedChangesGuard>
              <Outlet />
            </UnsavedChangesGuard>
          ),
        },
      ],
      { initialEntries: ["/form"] },
    ),
  )

  return <RouterProvider router={router} />
}

const meta: Meta<typeof UnsavedChangesGuard> = {
  argTypes: {
    children: {
      control: false,
      description:
        "The pages it guards. A form inside reports unsaved changes with useUnsavedChanges(hasChanges); while any does, leaving the page asks first.",
    },
  },
  component: UnsavedChangesGuard,
  tags: ["autodocs"],
  title: "Components/UnsavedChangesGuard",
}

export default meta

type Story = StoryObj<typeof UnsavedChangesGuard>

// A form with unsaved changes: following the link opens the centered warning instead of leaving
export const Default: Story = {
  render: () => <GuardedFormExample />,
}
