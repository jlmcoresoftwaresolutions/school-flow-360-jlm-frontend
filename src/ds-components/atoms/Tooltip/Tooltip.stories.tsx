import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tooltip } from "./Tooltip"
import { useTooltip } from "./useTooltip"

type HoverAreaProps = {
  followCursor?: boolean
}

// A target for the hook-driven stories: hover (or tab to) it to see the tooltip.
const HoverArea = (props: HoverAreaProps) => {
  const { followCursor } = props

  const { tooltipElement, tooltipHandlers } = useTooltip("Dica útil", {
    anchor: followCursor ? "cursor" : "element",
  })

  return (
    <>
      <button
        style={{ height: followCursor ? "160px" : undefined, width: followCursor ? "320px" : undefined }}
        type="button"
        {...tooltipHandlers}
      >
        {followCursor ? "Mova o mouse sobre esta área" : "Passe o mouse ou use Tab"}
      </button>
      {tooltipElement}
    </>
  )
}

const meta: Meta<typeof Tooltip> = {
  args: {
    children: "Dica útil",
    x: 0,
    y: 0,
  },
  argTypes: {
    anchorRect: {
      control: "object",
      description:
        "Viewport box (top/right/bottom/left) of the element the balloon is anchored to: centered below it, above when there is no room, kept on screen. Takes precedence over x/y.",
    },
    x: { control: "number", description: "Cursor x (viewport px) for a balloon that follows the mouse" },
    y: { control: "number", description: "Cursor y (viewport px) for a balloon that follows the mouse" },
  },
  component: Tooltip,
  tags: ["autodocs"],
  title: "Atoms/Tooltip",
}

export default meta

type Story = StoryObj<typeof Tooltip>

// The Tooltip balloon rendered at a fixed x/y position with its default content
export const Default: Story = {}

// The default behavior of the tooltip prop: anchored below its element, also shown on keyboard focus
export const AnchoredToElement: Story = {
  render: () => <HoverArea />,
}

// useTooltip's anchor "cursor" option: the balloon follows the mouse, kept for when that is needed
export const FollowingCursor: Story = {
  render: () => <HoverArea followCursor />,
}
