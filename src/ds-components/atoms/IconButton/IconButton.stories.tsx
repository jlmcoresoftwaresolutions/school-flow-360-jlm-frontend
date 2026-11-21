import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "@/foundation"

import { IconButton } from "./IconButton"

const meta: Meta<typeof IconButton> = {
  args: {
    icon: "trash-outline",
    label: "Remover",
  },
  argTypes: {
    className: {
      control: false,
      description: "Class name forwarded to the button.",
    },
    color: {
      control: "select",
      description: "The icon's color and its hover background: default (gray), brand or danger. Defaults to default.",
      options: ["default", "brand", "danger"],
    },
    disabled: {
      control: "boolean",
      description: "Disables the button.",
    },
    icon: {
      control: "text",
      description: "Name of the icon shown, from the icon set registered in iconMap.",
    },
    label: {
      control: "text",
      description: "Accessible name of the button, since it shows no text. Also the tooltip, unless tooltip is given.",
    },
    size: {
      control: "select",
      description:
        "Side of the square button and size of its icon: small (28px, 20px icon), medium (40px, 20px icon) or large (48px, 24px icon). Defaults to medium.",
      options: ["small", "medium", "large"],
    },
    style: {
      control: "object",
      description: "Inline styles forwarded to the button.",
    },
    tooltip: {
      control: "text",
      description: "Text shown on hover and focus. Defaults to label; an empty string shows none.",
    },
  },
  component: IconButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Atoms/IconButton",
}

export default meta

type Story = StoryObj<typeof IconButton>

// Default rendering: a gray icon-only button, with its label as the tooltip
export const Default: Story = {}

// The color prop: default, brand and danger
export const Colors: Story = {
  render: (args) => (
    <div style={{ display: "flex", gap: spacing[8] }}>
      <IconButton {...args} icon="pen-outline" label="Editar" />
      <IconButton {...args} color="brand" icon="plus" label="Adicionar" />
      <IconButton {...args} color="danger" icon="trash-outline" label="Remover" />
    </div>
  ),
}

// The size prop: small, medium and large
export const Sizes: Story = {
  render: (args) => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
      <IconButton {...args} size="small" />
      <IconButton {...args} size="medium" />
      <IconButton {...args} size="large" />
    </div>
  ),
}

// A disabled button, dimmed and not clickable
export const Disabled: Story = {
  args: { disabled: true },
}

// A tooltip different from the accessible name
export const WithCustomTooltip: Story = {
  args: { label: "Remover o papel 2", tooltip: "Remover" },
}
