import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "@/foundation"

import { Skeleton } from "./Skeleton"

const meta: Meta<typeof Skeleton> = {
  argTypes: {
    height: {
      control: "text",
      description: "CSS height of the block. Defaults depend on the variant (text 16px, rect 64px, circle 40px).",
    },
    variant: {
      control: "select",
      description: "Shape of the placeholder. Defaults to text.",
      options: ["text", "rect", "circle"],
    },
    width: {
      control: "text",
      description: "CSS width of the block. Defaults to 100% (a circle defaults to 40px).",
    },
  },
  component: Skeleton,
  tags: ["autodocs"],
  title: "Atoms/Skeleton",
}

export default meta

type Story = StoryObj<typeof Skeleton>

// Default rendering, a single line of text placeholder
export const Default: Story = {}

// The rect variant, a block placeholder for cards and images
export const Rect: Story = {
  args: {
    variant: "rect",
  },
}

// The circle variant, where one given side sizes both so it stays round
export const Circle: Story = {
  args: {
    variant: "circle",
    width: spacing[64],
  },
}

// Blocks composed into a list row, with aria-busy on the loading region announcing the state once
export const ListRow: Story = {
  render: () => (
    <div
      aria-busy="true"
      style={{ alignItems: "center", display: "flex", gap: spacing[16], maxWidth: "400px", padding: spacing[16] }}
    >
      <Skeleton variant="circle" width={spacing[48]} />

      <div style={{ display: "flex", flex: 1, flexDirection: "column", gap: spacing[8] }}>
        <Skeleton width="60%" />
        <Skeleton height={spacing[12]} width="90%" />
      </div>
    </div>
  ),
}
