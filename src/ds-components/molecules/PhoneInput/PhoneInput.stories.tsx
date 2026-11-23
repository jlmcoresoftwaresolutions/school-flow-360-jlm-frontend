import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { PhoneInput, type PhoneInputProps } from "./PhoneInput"

// A controlled field, as a form uses it.
const ControlledExample = (props: Partial<PhoneInputProps>) => {
  const { value: initialValue = "", ...rest } = props

  const [value, setValue] = useState(initialValue)

  return <PhoneInput title="Telefone" {...rest} onChange={setValue} value={value} />
}

const meta: Meta<typeof PhoneInput> = {
  args: { title: "Telefone", value: "" },
  argTypes: {
    countryLabel: {
      control: "text",
      description:
        'Accessible name of the country selector. Defaults to "Código do país (DDI)"; a page passes the translated one.',
    },
    defaultCountry: {
      control: "text",
      description:
        "ISO 3166-1 alpha-2 code of the country selected while the number is empty. Without it, the country of whoever uses the field, from the browser's languages (BR when they point to none).",
    },
    disabled: { control: "boolean", description: "Disables the country selector and the number" },
    error: {
      control: "text",
      description: "Error message shown below the field in red, replacing helperText. Also turns both borders red.",
    },
    helperText: { control: "text", description: "Text rendered below the field to provide extra context" },
    language: {
      control: "text",
      description: "Language the countries are named and sorted in (Intl.DisplayNames). Defaults to pt-BR.",
    },
    noOptionsMessage: {
      control: "text",
      description: 'Shown when a country search finds nothing. Defaults to "Nenhum país encontrado".',
    },
    onChange: {
      description: 'Called with the whole number in the international format ("+55 85 3333 1100"), or "" when empty.',
    },
    placeholder: {
      control: "text",
      description:
        "Placeholder of the number. Without it, an example number of the selected country, in that country's format.",
    },
    required: { control: "boolean", description: "Marks the number as required and adds a red asterisk to the title" },
    size: {
      control: "select",
      description: "Font size and padding level of the field: small or medium. Defaults to medium.",
      options: ["small", "medium"],
    },
    title: { control: "text", description: "Label rendered above the field, linked to the number" },
    value: { control: "text", description: "The whole number in the international format, as it is saved, or empty" },
  },
  component: PhoneInput,
  render: (args) => <ControlledExample {...args} />,
  tags: ["autodocs"],
  title: "Molecules/PhoneInput",
}

export default meta

type Story = StoryObj<typeof PhoneInput>

// An empty field starting with the browser's country, its flag and calling code closed, and one of its
// numbers as the placeholder; choosing another country clears the number
export const Default: Story = {}

// A saved number of another country, read back into its country and national part
export const WithValue: Story = {
  args: { value: "+351 912 345 678" },
}

// The defaultCountry prop selecting a country for an empty field, over the browser's
export const DefaultCountry: Story = {
  args: { defaultCountry: "PT" },
}

// The required prop adding the red asterisk to the title
export const Required: Story = {
  args: { required: true },
}

// The helperText prop explaining the field below it
export const WithHelperText: Story = {
  args: { helperText: "Escolha o país antes de digitar o número." },
}

// The error prop turning both borders red and replacing the helper text
export const WithError: Story = {
  args: { error: "Informe um telefone válido.", value: "+55 85 3333" },
}

// The disabled prop locking the selector and the number
export const Disabled: Story = {
  args: { disabled: true, value: "+55 85 3333 1100" },
}

// The small size, for denser forms
export const Small: Story = {
  args: { size: "small" },
}

// The placeholder prop replacing the selected country's example number
export const WithPlaceholder: Story = {
  args: { placeholder: "Digite o telefone" },
}
