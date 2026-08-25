import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { spacing } from "@/foundation"

import { Checkbox } from "./Checkbox"

const ControlledExample = () => {
  const [checked, setChecked] = useState(false)

  return (
    <Checkbox
      checked={checked}
      label="Autorizo o uso de imagem"
      onChange={(_event, nextChecked) => setChecked(nextChecked)}
    />
  )
}

const meta: Meta<typeof Checkbox> = {
  args: { label: "Autorizo o uso de imagem" },
  argTypes: {
    disabled: { control: "boolean", description: "Disables the checkbox, forwarded to the MUI Checkbox" },
    helperText: { control: "text", description: "Text rendered below the checkbox to provide extra context" },
    label: { control: "text", description: "Label rendered next to the checkbox, linked via htmlFor/id" },
    size: {
      control: "select",
      description: "Size of the checkbox icon: small, medium or large. Defaults to large.",
      options: ["small", "medium", "large"],
    },
  },
  component: Checkbox,
  tags: ["autodocs"],
  title: "Molecules/Checkbox",
}

export default meta

type Story = StoryObj<typeof Checkbox>

// Default rendering, unchecked
export const Default: Story = {}

// Checked by default via defaultChecked, uncontrolled
export const Checked: Story = {
  args: { defaultChecked: true },
}

// The helperText prop rendering supporting text below the checkbox
export const WithHelperText: Story = {
  args: { helperText: "Necessário para publicar fotos em comunicados." },
}

// The size prop set to small, more compact than the default large size
export const Small: Story = {
  args: { size: "small" },
}

// The size prop set to medium, a step up from small but still more compact than the default large size
export const Medium: Story = {
  args: { size: "medium" },
}

// All three sizes rendered side by side
export const Sizes: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[16] }}>
      <Checkbox label="Small" size="small" />
      <Checkbox label="Medium" size="medium" />
      <Checkbox label="Large" size="large" />
    </div>
  ),
}

// The disabled prop, forwarded straight through to the MUI Checkbox
export const Disabled: Story = {
  args: { disabled: true },
}

// The disabled prop combined with defaultChecked
export const DisabledChecked: Story = {
  args: { defaultChecked: true, disabled: true },
}

// A fully controlled checkbox, driving the checked/onChange props from useState
export const Controlled: Story = {
  render: () => <ControlledExample />,
}
