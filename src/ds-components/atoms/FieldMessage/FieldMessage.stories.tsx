import type { Meta, StoryObj } from "@storybook/react-vite"

import { FieldMessage } from "./FieldMessage"

const meta: Meta<typeof FieldMessage> = {
  args: {
    helperText: "Use o nome que aparece nos documentos oficiais.",
    id: "campo-mensagem",
  },
  argTypes: {
    error: {
      control: "text",
      description:
        "Error message. When set, it replaces the helper text and is painted in a dark red that meets WCAG AA contrast.",
    },
    helperText: {
      control: "text",
      description: "Supporting text shown while there is no error.",
    },
    id: {
      control: "text",
      description: "Id of the message element, for the field's aria-describedby to point at.",
    },
  },
  component: FieldMessage,
  tags: ["autodocs"],
  title: "Atoms/FieldMessage",
}

export default meta

type Story = StoryObj<typeof FieldMessage>

// Default rendering: the helper text in a dark gray that meets WCAG AA contrast
export const Default: Story = {}

// The error prop replacing the helper text, in dark red
export const WithError: Story = {
  args: {
    error: "Informe o nome da escola.",
  },
}
