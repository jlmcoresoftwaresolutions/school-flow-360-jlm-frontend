import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tooltip } from "./Tooltip"

const meta: Meta<typeof Tooltip> = {
  args: {
    children: "Dica útil",
    x: 0,
    y: 0,
  },
  component: Tooltip,
  tags: ["autodocs"],
  title: "Atoms/Tooltip",
}

export default meta

type Story = StoryObj<typeof Tooltip>

// The Tooltip balloon rendered at a fixed x/y position with its default content
export const Default: Story = {}
