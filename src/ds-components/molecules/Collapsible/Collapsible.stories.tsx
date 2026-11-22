import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Text } from "../../atoms"
import { Collapsible } from "./Collapsible"

const meta: Meta<typeof Collapsible> = {
  argTypes: {
    children: {
      control: false,
      description: "Collapsible.Trigger and Collapsible.Content, which may sit apart from each other inside the root.",
    },
    defaultOpen: {
      control: "boolean",
      description: "Whether it starts open when uncontrolled. Defaults to false (closed).",
    },
    onOpenChange: {
      control: false,
      description: "Called with the next open state when the trigger is pressed, controlled or not.",
    },
    open: {
      control: "boolean",
      description: "Makes it controlled: the open state is this value, and only changes when the owner changes it.",
    },
  },
  component: Collapsible,
  render: (args) => (
    <Collapsible {...args}>
      <Collapsible.Trigger>Mostrar detalhes</Collapsible.Trigger>
      <Collapsible.Content>
        <Text as="p">Aqui ficam os detalhes que aparecem e somem com o botão.</Text>
      </Collapsible.Content>
    </Collapsible>
  ),
  tags: ["autodocs"],
  title: "Molecules/Collapsible",
}

export default meta

type Story = StoryObj<typeof Collapsible>

// Default rendering: starts closed, and the trigger opens and closes the content
export const Default: Story = {}

// The defaultOpen prop, starting with the content visible
export const OpenByDefault: Story = {
  args: { defaultOpen: true },
}

// The trigger's children as a function of the open state, so the label follows it
export const ChangingLabel: Story = {
  render: () => (
    <Collapsible defaultOpen>
      <Collapsible.Trigger>{({ open }) => (open ? "Ocultar filtros" : "Expandir filtros")}</Collapsible.Trigger>
      <Collapsible.Content>
        <Text as="p">Os filtros ficam aqui.</Text>
      </Collapsible.Content>
    </Collapsible>
  ),
}

// The open and onOpenChange props, with the owner holding the state
export const Controlled: Story = {
  render: () => {
    const ControlledDemo = () => {
      const [open, setOpen] = useState(true)

      return (
        <Collapsible onOpenChange={setOpen} open={open}>
          <Collapsible.Trigger>{open ? "Ocultar" : "Mostrar"}</Collapsible.Trigger>
          <Collapsible.Content>
            <Text as="p">Conteúdo controlado pelo componente pai.</Text>
          </Collapsible.Content>
        </Collapsible>
      )
    }

    return <ControlledDemo />
  },
}

// The trigger and the content apart from each other, as in a header above a body
export const TriggerApartFromContent: Story = {
  render: () => (
    <Collapsible defaultOpen style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <Text as="h3" fontSize="md" semibold>
          Filtros
        </Text>
        <Collapsible.Trigger>{({ open }) => (open ? "Ocultar" : "Expandir")}</Collapsible.Trigger>
      </div>
      <Collapsible.Content>
        <Text as="p">O conteúdo fica abaixo do cabeçalho, longe do botão.</Text>
      </Collapsible.Content>
    </Collapsible>
  ),
}
