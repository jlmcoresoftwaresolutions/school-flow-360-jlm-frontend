import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

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
