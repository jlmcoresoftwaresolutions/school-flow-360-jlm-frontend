import type { Meta, StoryObj } from "@storybook/react-vite"

import { Switch } from "./Switch"

const meta: Meta<typeof Switch> = {
  args: { label: "Cobrança de mensalidades ativa" },
  argTypes: {
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the switch input" },
    helperText: { control: "text", description: "Text rendered below the switch to provide extra context" },
    label: { control: "text", description: "Label rendered next to the switch track" },
  },
  component: Switch,
  tags: ["autodocs"],
  title: "Molecules/Switch",
}

export default meta

type Story = StoryObj<typeof Switch>

// Default rendering, off
export const Default: Story = {}

// On by default via the native defaultChecked attribute
export const Checked: Story = {
  args: { defaultChecked: true },
}

// The helperText prop rendering supporting text below the switch
export const WithHelperText: Story = {
  args: { helperText: "Ativa o módulo financeiro para esta rede." },
}

// The native disabled attribute, forwarded straight through to the switch input
export const Disabled: Story = {
  args: { disabled: true },
}

// The native disabled attribute combined with defaultChecked
export const DisabledChecked: Story = {
  args: { defaultChecked: true, disabled: true },
}
