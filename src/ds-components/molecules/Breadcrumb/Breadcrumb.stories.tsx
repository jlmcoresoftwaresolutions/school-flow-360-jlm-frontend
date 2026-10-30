import type { Meta, StoryObj } from "@storybook/react-vite"

import { Breadcrumb } from "./Breadcrumb"

const meta: Meta<typeof Breadcrumb> = {
  args: {
    items: [
      { key: "administracao", label: "Administração" },
      { href: "#my-school", key: "minha-escola", label: "Minha Escola" },
      { key: "unidades", label: "Unidades" },
    ],
    label: "Você está em",
  },
  argTypes: {
    items: {
      control: "object",
      description:
        "The trail, in order: key, label and optionally href (a link) or onClick (a button), and an icon shown before the label. The last item is the current page and is never interactive; an earlier item with neither is plain text.",
    },
    label: {
      control: "text",
      description: "Accessible name of the navigation landmark.",
    },
  },
  component: Breadcrumb,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Molecules/Breadcrumb",
}

export default meta

type Story = StoryObj<typeof Breadcrumb>

// Default rendering: a group with no page of its own, a link and the current page
export const Default: Story = {}

// An icon before the first entry, as the app shows the menu entry the page belongs to
export const WithIcon: Story = {
  args: {
    items: [
      { icon: "gear-outline", key: "administracao", label: "Administração" },
      { key: "minha-escola", label: "Minha Escola" },
    ],
  },
}

// Entries with an onClick (and no href) rendered as buttons, for a client-side router
export const WithButtons: Story = {
  args: {
    items: [
      { key: "inicio", label: "Início", onClick: () => undefined },
      { key: "administracao", label: "Administração", onClick: () => undefined },
      { key: "minha-escola", label: "Minha Escola" },
    ],
  },
}

// A single entry, which is just the current page with no separator
export const SingleItem: Story = {
  args: {
    items: [{ key: "inicio", label: "Início" }],
  },
}

// A long trail wrapping onto more lines instead of overflowing its container
export const LongTrail: Story = {
  args: {
    items: [
      { href: "#", key: "organizacao", label: "Organização" },
      { href: "#", key: "unidades", label: "Unidades" },
      { href: "#", key: "unidade-centro", label: "Unidade Centro" },
      { href: "#", key: "turmas", label: "Turmas" },
      { href: "#", key: "turma", label: "Turma 7º ano A — Período da manhã" },
      { key: "alunos", label: "Alunos matriculados" },
    ],
  },
  decorators: [
    (Story) => (
      <div style={{ maxWidth: "320px" }}>
        <Story />
      </div>
    ),
  ],
}
