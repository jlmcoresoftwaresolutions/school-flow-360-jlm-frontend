import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "@/foundation"

import { Icon } from "../../atoms"
import { Table } from "../../organisms"
import { ActionMenu } from "./ActionMenu"

const meta: Meta<typeof ActionMenu> = {
  args: {
    items: [
      { icon: "eye-outline", key: "visualizar", label: "Visualizar" },
      { icon: "pen-outline", key: "editar", label: "Editar" },
      { icon: "trash-outline", key: "inativar", label: "Inativar", tone: "danger" },
    ],
    triggerLabel: "Ações da unidade",
  },
  argTypes: {
    align: {
      control: "select",
      description: "Which edge of the trigger the menu lines up with. Defaults to end (right edge).",
      options: ["end", "start"],
    },
    disabled: {
      control: "boolean",
      description: "Disables the trigger button.",
    },
    items: {
      control: "object",
      description:
        "The actions: key, label and optionally icon, tone (danger paints it red), disabled, onClick and checked. Selecting one runs its onClick and closes the menu. An item with checked set (true or false) becomes a menuitemradio, for picking one option out of several.",
    },
    trigger: {
      control: false,
      description:
        "Content shown on the trigger instead of the icon (e.g. a user's avatar and name). The button is then named by that content, and triggerLabel names only the menu.",
    },
    triggerIcon: {
      control: "text",
      description: "Name of the icon shown on the trigger. Defaults to dots-vertical (a kebab).",
    },
    triggerLabel: {
      control: "text",
      description: "Accessible name of the trigger button (and of the menu), since the trigger shows only an icon.",
    },
  },
  component: ActionMenu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Molecules/ActionMenu",
}

export default meta

type Story = StoryObj<typeof ActionMenu>

// Default rendering, a kebab button opening a menu with a destructive item in red
export const Default: Story = {}

// The align prop set to start, lining the menu up with the trigger's left edge
export const AlignedToStart: Story = {
  args: {
    align: "start",
  },
}

// A disabled item, dimmed and skipped by the arrow keys
export const WithDisabledItem: Story = {
  args: {
    items: [
      { key: "visualizar", label: "Visualizar" },
      { disabled: true, key: "editar", label: "Editar" },
      { key: "inativar", label: "Inativar", tone: "danger" },
    ],
  },
}

// The menu inside a table's actions column, where it opens over the table instead of being clipped
export const InTableRow: Story = {
  render: (args) => (
    <Table
      value={[
        { cidade: "Belo Horizonte", id: "1", nome: "Unidade Centro" },
        { cidade: "Contagem", id: "2", nome: "Unidade Norte" },
      ]}
    >
      <Table.Column field="nome" header="Unidade" />
      <Table.Column field="cidade" header="Cidade" />
      <Table.Column align="right" body={() => <ActionMenu {...args} />} field="id" header="Ações" />
    </Table>
  ),
}

// The trigger prop showing custom content on the button instead of an icon
export const WithCustomTrigger: Story = {
  args: {
    items: [{ icon: "logout-outline", key: "sair", label: "Sair" }],
    trigger: (
      <span style={{ alignItems: "center", display: "inline-flex", gap: spacing[8] }}>
        Maria da Silva
        <Icon color="secondary" name="chevron-down" size={16} />
      </span>
    ),
    triggerLabel: "Menu do usuário",
  },
}

// The triggerIcon prop and checked items turning the menu into a single-choice picker, e.g. a sort order
export const SingleChoice: Story = {
  args: {
    items: [
      { checked: true, key: "nome", label: "Ordenar por nome" },
      { checked: false, key: "cidade", label: "Ordenar por cidade" },
    ],
    triggerIcon: "dots-horizontal",
    triggerLabel: "Ordenação",
  },
}
