import type { Meta, StoryObj } from "@storybook/react-vite"

import { Badge } from "../../atoms"
import { DescriptionList } from "./DescriptionList"

const meta: Meta<typeof DescriptionList> = {
  args: {
    items: [
      { key: "nome", label: "Nome institucional", value: "Associação Educacional Horizonte" },
      { key: "modelo", label: "Modelo de operação", value: "Privada" },
      { key: "email", label: "E-mail institucional", value: "contato@horizonte.edu.br" },
      { key: "telefone", label: "Telefone", value: "(85) 3333-1100" },
    ],
  },
  argTypes: {
    className: {
      control: false,
      description: "Class name forwarded to the <dl>.",
    },
    columns: {
      control: "select",
      description: "Columns from the md breakpoint up (a narrow screen always shows one). Defaults to 2.",
      options: [1, 2, 3],
    },
    emptyValue: {
      control: "text",
      description: 'Shown, in a muted italic, for an item without a value. Defaults to "Não informado".',
    },
    items: {
      control: "object",
      description:
        "The pairs: key, label and value (any content, e.g. a Badge), and optionally fullWidth to take the whole row.",
    },
    style: {
      control: "object",
      description: "Inline styles forwarded to the <dl>.",
    },
  },
  component: DescriptionList,
  tags: ["autodocs"],
  title: "Molecules/DescriptionList",
}

export default meta

type Story = StoryObj<typeof DescriptionList>

// Default rendering: label/value pairs in two columns
export const Default: Story = {}

// The columns prop set to 3
export const ThreeColumns: Story = {
  args: { columns: 3 },
}

// A full-width item (an address) and a value that is a component (a Badge)
export const WithFullWidthAndComponent: Story = {
  args: {
    items: [
      { key: "nome", label: "Nome", value: "Unidade Aldeota" },
      { key: "situacao", label: "Situação", value: <Badge tone="success">Ativa</Badge> },
      {
        fullWidth: true,
        key: "endereco",
        label: "Endereço",
        value: "Avenida Santos Dumont, 1500 - Aldeota, Fortaleza/CE - 60150-161",
      },
    ],
  },
}

// Items without a value, shown as "Não informado" instead of a blank
export const WithEmptyValues: Story = {
  args: {
    items: [
      { key: "email", label: "E-mail", value: "" },
      { key: "telefone", label: "Telefone", value: "(85) 3333-1100" },
      { key: "observacao", label: "Observação interna" },
    ],
  },
}
