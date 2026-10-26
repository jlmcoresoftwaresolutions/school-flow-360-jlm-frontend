import type { Meta, StoryObj } from "@storybook/react-vite"

import { FieldLabel } from "./FieldLabel"

const meta: Meta<typeof FieldLabel> = {
  args: {
    children: "Nome da escola",
    htmlFor: "nome-da-escola",
  },
  argTypes: {
    children: {
      control: "text",
      description: "The label text.",
    },
    htmlFor: {
      control: "text",
      description: "Id of the field this label names.",
    },
    required: {
      control: "boolean",
      description: "Adds a decorative red asterisk. The field itself must carry required for screen readers.",
    },
  },
  component: FieldLabel,
  tags: ["autodocs"],
  title: "Atoms/FieldLabel",
}

export default meta

type Story = StoryObj<typeof FieldLabel>

// Default rendering: a plain label
export const Default: Story = {}

// The required prop adding the red asterisk
export const Required: Story = {
  args: {
    required: true,
  },
}
