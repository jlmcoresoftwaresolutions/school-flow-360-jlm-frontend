import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "@/foundation"

import { Badge } from "./Badge"

const meta: Meta<typeof Badge> = {
  args: {
    children: "Ativa",
  },
  argTypes: {
    dot: {
      control: "boolean",
      description: "Shows the small colored dot before the label. Defaults to true.",
    },
    tone: {
      control: "select",
      description:
        "Color tone of the badge. Purely visual: the label, not the tone, carries the meaning. Defaults to neutral.",
      options: ["neutral", "success", "info", "warning", "danger"],
    },
    tooltip: {
      control: "text",
      description: "Text shown in a cursor-following tooltip on hover.",
    },
  },
  component: Badge,
  tags: ["autodocs"],
  title: "Atoms/Badge",
}

export default meta

type Story = StoryObj<typeof Badge>

// Default rendering, using the neutral tone with its dot
export const Default: Story = {}

// Every tone side by side, the way a status column in a table would use them
export const Tones: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[12] }}>
      <Badge tone="success">Ativa</Badge>
      <Badge tone="neutral">Inativa</Badge>
      <Badge tone="info">Em configuração</Badge>
      <Badge tone="warning">Pendente</Badge>
      <Badge tone="danger">Com restrição</Badge>
    </div>
  ),
}

// The dot prop set to false, leaving only the label
export const WithoutDot: Story = {
  args: {
    dot: false,
    tone: "success",
  },
}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = {
  args: {
    tone: "info",
    tooltip: "Aguardando a configuração inicial",
  },
}
