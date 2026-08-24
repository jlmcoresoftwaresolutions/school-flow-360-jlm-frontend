import type { Meta, StoryObj } from "@storybook/react-vite"

import { borderRadiusLevels, type BorderRadiusLevelsType, spacing } from "@/foundation"

import { Textarea } from "./Textarea"

const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]

const meta: Meta<typeof Textarea> = {
  args: { placeholder: "Digite algo..." },
  argTypes: {
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the textarea: subtle, low, medium, high or full. Defaults to low.",
      options: borderRadiusLevelKeys,
    },
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the textarea element" },
    elevated: { control: "boolean", description: "Adds a drop shadow around the textarea. Defaults to true." },
    helperText: { control: "text", description: "Text rendered below the textarea to provide extra context" },
    rows: { control: "number", description: "Native rows attribute, forwarded to the textarea element" },
    title: { control: "text", description: "Label rendered above the textarea" },
  },
  component: Textarea,
  tags: ["autodocs"],
  title: "Molecules/Textarea",
}

export default meta

type Story = StoryObj<typeof Textarea>

// Default rendering with no title or helperText set
export const Default: Story = {}

// The title prop rendering a label above the textarea, linked via htmlFor/id
export const WithTitle: Story = {
  args: { title: "Observações" },
}

// The helperText prop rendering supporting text below the textarea
export const WithHelperText: Story = {
  args: { helperText: "Visível apenas para a coordenação." },
}

// The rows prop controlling the initial visible height
export const Rows: Story = {
  args: { rows: 6, title: "Justificativa" },
}

// The elevated prop set to false, removing the default drop shadow around the textarea
export const Flat: Story = {
  args: { elevated: false, title: "Observações" },
}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <Textarea key={borderRadiusLevelKey} borderRadius={borderRadiusLevelKey} placeholder={borderRadiusLevelKey} />
      ))}
    </div>
  ),
}

// The native disabled attribute, forwarded straight through to the textarea element
export const Disabled: Story = {
  args: { disabled: true, title: "Observações", value: "Não é possível editar" },
}
