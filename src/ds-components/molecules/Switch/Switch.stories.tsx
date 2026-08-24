import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { colors, spacing } from "@/foundation"

import { Switch } from "./Switch"

const ControlledExample = () => {
  const [checked, setChecked] = useState(false)

  return (
    <Switch
      checked={checked}
      label="Cobrança de mensalidades ativa"
      onChange={(_event, nextChecked) => setChecked(nextChecked)}
    />
  )
}

const meta: Meta<typeof Switch> = {
  args: { label: "Cobrança de mensalidades ativa" },
  argTypes: {
    disabled: { control: "boolean", description: "Disables the switch, forwarded to the MUI Switch" },
    helperText: { control: "text", description: "Text rendered below the switch to provide extra context" },
    label: { control: "text", description: "Label rendered next to the switch track" },
    size: {
      control: "select",
      description: "Size of the switch track/thumb, forwarded to the MUI Switch. Defaults to medium.",
      options: ["small", "medium"],
    },
  },
  component: Switch,
  decorators: [
    (Story) => (
      <div style={{ background: colors.neutral[100], padding: spacing[24] }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  title: "Molecules/Switch",
}

export default meta

type Story = StoryObj<typeof Switch>

// Default rendering, off
export const Default: Story = {}

// On by default via defaultChecked, uncontrolled
export const Checked: Story = {
  args: { defaultChecked: true },
}

// The helperText prop rendering supporting text below the switch
export const WithHelperText: Story = {
  args: { helperText: "Ativa o módulo financeiro para esta rede." },
}

// The size prop set to small, more compact than the default medium size
export const Small: Story = {
  args: { size: "small" },
}

// The disabled prop, forwarded straight through to the MUI Switch
export const Disabled: Story = {
  args: { disabled: true },
}

// The disabled prop combined with defaultChecked
export const DisabledChecked: Story = {
  args: { defaultChecked: true, disabled: true },
}

// A fully controlled switch, driving the checked/onChange props from useState
export const Controlled: Story = {
  render: () => <ControlledExample />,
}
