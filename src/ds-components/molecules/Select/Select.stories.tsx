import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { borderRadiusLevels, type BorderRadiusLevelsType, spacing } from "@/foundation"

import { Select, type SelectOption } from "./Select"

const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]

const turnoOptions: SelectOption[] = [
  { label: "Manhã", value: "manha" },
  { label: "Tarde", value: "tarde" },
  { label: "Noite", value: "noite" },
]

const ControlledExample = () => {
  const [value, setValue] = useState<SelectOption | null>(null)

  return <Select onChange={setValue} options={turnoOptions} title="Turno" value={value} />
}

const meta: Meta<typeof Select> = {
  args: { options: turnoOptions, placeholder: "Selecione..." },
  argTypes: {
    "aria-label": {
      control: "text",
      description: "Accessible name for a select without a visible title, e.g. inside a filter bar.",
    },
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the select: subtle, low, medium, high or full. Defaults to low.",
      options: borderRadiusLevelKeys,
    },
    elevated: { control: "boolean", description: "Adds a drop shadow around the select. Defaults to true." },
    error: {
      control: "text",
      description:
        "Error message shown below the select in red, replacing helperText. Also turns the border red and sets aria-invalid.",
    },
    helperText: { control: "text", description: "Text rendered below the select to provide extra context" },
    isDisabled: { control: "boolean", description: "Disables the select, forwarded to react-select" },
    options: { control: "object", description: "Array of { label, value } options rendered inside the select" },
    placeholder: { control: "text", description: "Placeholder shown before a value is chosen" },
    required: {
      control: "boolean",
      description:
        "Marks the select as required (native form validation and aria-required). Also adds a red asterisk to the title.",
    },
    title: { control: "text", description: "Label rendered above the select" },
  },
  component: Select,
  tags: ["autodocs"],
  title: "Molecules/Select",
}

export default meta

type Story = StoryObj<typeof Select>

// Default rendering with no visible title, named through aria-label instead
export const Default: Story = {
  args: { "aria-label": "Turno" },
}

// The title prop rendering a label above the select, linked via inputId/htmlFor
export const WithTitle: Story = {
  args: { title: "Turno" },
}

// The helperText prop rendering supporting text below the select
export const WithHelperText: Story = {
  args: { helperText: "Define o período das aulas.", title: "Turno" },
}

// The elevated prop set to false, removing the default drop shadow around the select
export const Flat: Story = {
  args: { elevated: false, title: "Turno" },
}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <Select
          aria-label={`Turno (${borderRadiusLevelKey})`}
          borderRadius={borderRadiusLevelKey}
          key={borderRadiusLevelKey}
          options={turnoOptions}
          placeholder={borderRadiusLevelKey}
        />
      ))}
    </div>
  ),
}

// The isDisabled prop, forwarded straight through to react-select
export const Disabled: Story = {
  args: { defaultValue: turnoOptions[0], isDisabled: true, title: "Turno" },
}

// A fully controlled select, driving the value/onChange props from useState
export const Controlled: Story = {
  render: () => <ControlledExample />,
}

// The error prop replacing helperText with a red message and turning the border red
export const WithError: Story = {
  args: { error: "Selecione o turno da turma.", helperText: "Define o período das aulas.", title: "Turno" },
}

// The required prop, which also adds a red asterisk to the title
export const Required: Story = {
  args: { required: true, title: "Turno" },
}
