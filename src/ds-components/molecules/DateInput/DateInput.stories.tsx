import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { borderRadiusLevels, type BorderRadiusLevelsType, spacing } from "@/foundation"

import { DateInput } from "./DateInput"

const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]

const ControlledExample = () => {
  const [value, setValue] = useState<Date | null>(null)

  return <DateInput onChange={setValue} title="Data de matrícula" value={value} />
}

const meta: Meta<typeof DateInput> = {
  args: { placeholder: "dd/mm/aaaa" },
  argTypes: {
    borderRadius: {
      control: "select",
      description:
        "Border radius level applied to the input and the calendar: subtle, low, medium, high or full. Defaults to low.",
      options: borderRadiusLevelKeys,
    },
    dateFormat: {
      control: "text",
      description: "date-fns format string used to display the selected date. Defaults to dd/MM/yyyy.",
    },
    defaultValue: {
      control: "date",
      description:
        "Initial date for uncontrolled usage. Ignored once the value prop is passed, which makes the component controlled.",
    },
    disabled: { control: "boolean", description: "Disables the input and prevents the calendar from opening" },
    elevated: { control: "boolean", description: "Adds a drop shadow around the input. Defaults to true." },
    helperText: { control: "text", description: "Text rendered below the input to provide extra context" },
    maxDate: { control: "date", description: "Latest selectable date; later days are rendered as disabled" },
    minDate: { control: "date", description: "Earliest selectable date; earlier days are rendered as disabled" },
    placeholder: { control: "text", description: "Placeholder shown before a date is chosen" },
    title: { control: "text", description: "Label rendered above the input" },
  },
  component: DateInput,
  tags: ["autodocs"],
  title: "Molecules/DateInput",
}

export default meta

type Story = StoryObj<typeof DateInput>

// Default rendering with no title or helperText set: uncontrolled, so picking a day fills the field
export const Default: Story = {}

// The title prop rendering a label above the input, linked via htmlFor/id
export const WithTitle: Story = {
  args: { title: "Data de nascimento" },
}

// The helperText prop rendering supporting text below the input
export const WithHelperText: Story = {
  args: { helperText: "Use o formato dd/mm/aaaa.", title: "Data de nascimento" },
}

// The defaultValue prop seeding the field for uncontrolled usage, still free to change afterwards
export const WithDefaultValue: Story = {
  args: { defaultValue: new Date(2026, 7, 15), title: "Data de nascimento" },
}

// The value prop pinning the field, which only moves when the caller updates it through onChange
export const WithValue: Story = {
  args: { title: "Data de nascimento", value: new Date(2026, 7, 15) },
}

// A clear button appears next to the calendar icon whenever a date is selected, resetting the
// field back to null/undefined; it disappears again once the field is empty
export const Clearable: Story = {
  args: { defaultValue: new Date(2026, 7, 15), title: "Data de nascimento" },
}

// The dateFormat prop switching the displayed format to an ISO-style date
export const CustomDateFormat: Story = {
  args: { dateFormat: "yyyy-MM-dd", defaultValue: new Date(2026, 7, 15), title: "Data de nascimento" },
}

// The minDate/maxDate props restricting selection to a window, greying out every day outside it
export const DateRange: Story = {
  args: {
    defaultValue: new Date(2026, 7, 15),
    helperText: "Apenas datas do segundo semestre de 2026.",
    maxDate: new Date(2026, 11, 31),
    minDate: new Date(2026, 6, 1),
    title: "Data de matrícula",
  },
}

// The elevated prop set to false, removing the default drop shadow around the input
export const Flat: Story = {
  args: { elevated: false, title: "Data de nascimento" },
}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <DateInput key={borderRadiusLevelKey} borderRadius={borderRadiusLevelKey} placeholder={borderRadiusLevelKey} />
      ))}
    </div>
  ),
}

// The disabled prop, blocking both typing and the calendar popup
export const Disabled: Story = {
  args: { disabled: true, title: "Data de nascimento", value: new Date(2026, 7, 15) },
}

// A fully controlled date input, driving the value/onChange props from useState
export const Controlled: Story = {
  render: () => <ControlledExample />,
}
