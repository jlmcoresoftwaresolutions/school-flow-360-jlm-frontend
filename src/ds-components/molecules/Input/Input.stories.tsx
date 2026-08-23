import type { Meta, StoryObj } from "@storybook/react-vite"
import { useForm } from "react-hook-form"

import { borderRadiusLevels, type BorderRadiusLevelsType, spacing } from "@/foundation"

import { Input } from "./Input"

const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]

const ReactHookFormExample = () => {
  const { register } = useForm<{ email: string }>()

  return <Input helperText="Registrado via register do react-hook-form" title="E-mail" {...register("email")} />
}

const meta: Meta<typeof Input> = {
  args: { placeholder: "Digite algo..." },
  argTypes: {
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the input: subtle, low, medium, high or full. Defaults to medium.",
      options: borderRadiusLevelKeys,
    },
    disabled: { control: "boolean", description: "Native disabled attribute, forwarded to the input element" },
    elevated: { control: "boolean", description: "Adds a drop shadow around the input. Defaults to true." },
    helperText: { control: "text", description: "Text rendered below the input to provide extra context" },
    mask: {
      control: "select",
      description:
        "Formats the value as a CEP, CPF, CNPJ, credit card, currency (BRL), expiry date or phone number while typing. Takes precedence over numeric.",
      options: [undefined, "cep", "cpf", "cnpj", "creditCard", "currency", "expiry", "phone"],
    },
    numeric: {
      control: "boolean",
      description: "Restricts input to digits only, and hints a numeric keyboard on mobile",
    },
    title: { control: "text", description: "Label rendered above the input" },
  },
  component: Input,
  tags: ["autodocs"],
  title: "Molecules/Input",
}

export default meta

type Story = StoryObj<typeof Input>

// Default rendering with no title or helperText set
export const Default: Story = {}

// The title prop rendering a label above the input, linked via htmlFor/id
export const WithTitle: Story = {
  args: { title: "E-mail" },
}

// The helperText prop rendering supporting text below the input
export const WithHelperText: Story = {
  args: { helperText: "Nunca compartilharemos seu e-mail com ninguém." },
}

// title and helperText combined
export const WithTitleAndHelperText: Story = {
  args: { helperText: "Nunca compartilharemos seu e-mail com ninguém.", title: "E-mail" },
}

// The elevated prop set to false, removing the default drop shadow around the input
export const Flat: Story = {
  args: { elevated: false, title: "E-mail" },
}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: spacing[16] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <Input key={borderRadiusLevelKey} borderRadius={borderRadiusLevelKey} placeholder={borderRadiusLevelKey} />
      ))}
    </div>
  ),
}

// The native disabled attribute, forwarded straight through to the input element
export const Disabled: Story = {
  args: { disabled: true, title: "E-mail", value: "desabilitado@exemplo.com" },
}

// Uncontrolled by React, wired up entirely through react-hook-form's register (relies on the forwardRef wiring)
export const WithReactHookForm: Story = {
  render: () => <ReactHookFormExample />,
}

// The numeric prop strips any non-digit character as the user types or pastes
export const Numeric: Story = {
  args: { numeric: true, placeholder: "0", title: "Quantidade" },
}

// The mask prop formatting digits as a CEP (00000-000) while typing
export const MaskCep: Story = {
  args: { mask: "cep", placeholder: "00000-000", title: "CEP" },
}

// The mask prop formatting digits as a CPF (000.000.000-00) while typing
export const MaskCpf: Story = {
  args: { mask: "cpf", placeholder: "000.000.000-00", title: "CPF" },
}

// The mask prop formatting digits as a CNPJ (00.000.000/0000-00) while typing
export const MaskCnpj: Story = {
  args: { mask: "cnpj", placeholder: "00.000.000/0000-00", title: "CNPJ" },
}

// The mask prop formatting digits as a phone number, switching between landline and mobile splits
export const MaskPhone: Story = {
  args: { mask: "phone", placeholder: "(00) 00000-0000", title: "Telefone" },
}

// The mask prop formatting digits as a 16-digit credit card number in groups of 4
export const MaskCreditCard: Story = {
  args: { mask: "creditCard", placeholder: "0000 0000 0000 0000", title: "Número do cartão" },
}

// The mask prop formatting digits as BRL currency (R$ 0,00), growing from the right as cents
export const MaskCurrency: Story = {
  args: { mask: "currency", placeholder: "R$ 0,00", title: "Valor" },
}

// The mask prop formatting digits as a card expiry date (MM/AA) while typing
export const MaskExpiry: Story = {
  args: { mask: "expiry", placeholder: "MM/AA", title: "Validade" },
}

// No dedicated mask for CVV: it's just digits with a fixed length, already covered by numeric + the native maxLength attribute
export const Cvv: Story = {
  args: { helperText: "3 dígitos, no verso do cartão", maxLength: 3, numeric: true, title: "CVV" },
}
