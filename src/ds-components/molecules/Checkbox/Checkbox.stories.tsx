import type { Meta, StoryObj } from "@storybook/react-vite"

import { Checkbox } from "./Checkbox"

const meta: Meta<typeof Checkbox> = {
  args: { label: "Autorizo o uso de imagem" },
  argTypes: {
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the checkbox input" },
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

// Checked by default via the native defaultChecked attribute
export const Checked: Story = {
  args: { defaultChecked: true },
}

// The helperText prop rendering supporting text below the checkbox
export const WithHelperText: Story = {
  args: { helperText: "Necessário para publicar fotos em comunicados." },
}

// The native disabled attribute, forwarded straight through to the checkbox input
export const Disabled: Story = {
  args: { disabled: true },
}

// The native disabled attribute combined with defaultChecked
export const DisabledChecked: Story = {
  args: { defaultChecked: true, disabled: true },
}
