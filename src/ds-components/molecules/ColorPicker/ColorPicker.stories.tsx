import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import type { ColorPickerProps } from "./ColorPicker"
import { ColorPicker } from "./ColorPicker"

// ColorPicker is fully controlled (no uncontrolled fallback like DateInput has) - every story wires
// its own useState so clicking the swatch or typing the hex field visibly updates in Storybook.
const ControlledColorPicker = (props: ColorPickerProps) => {
  const { value, ...rest } = props

  const [color, setColor] = useState(value)

  return <ColorPicker {...rest} onChange={setColor} value={color} />
}

const meta: Meta<typeof ColorPicker> = {
  args: {
    title: "Cor primária",
    value: "#4B87D6",
  },
  argTypes: {
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the swatch and hex input. Defaults to low.",
      options: ["subtle", "low", "medium", "high", "full"],
    },
    disabled: {
      control: "boolean",
      description: "Disables the swatch button and the hex input, and prevents opening the picker.",
    },
    elevated: {
      control: "boolean",
      description: "Adds a drop shadow to the hex input, matching Input's own elevated prop. Defaults to true.",
    },
    helperText: {
      control: "text",
      description: "Text shown below the control.",
    },
    onChange: {
      control: false,
      description: "Called with the new #RRGGBB value from either the swatch picker or the hex input.",
    },
    title: {
      control: "text",
      description: "Label rendered above the control.",
    },
    value: {
      control: "color",
      description: "Current color, as a #RRGGBB hex string.",
    },
  },
  component: ColorPicker,
  render: (args) => <ControlledColorPicker {...args} />,
  tags: ["autodocs"],
  title: "Molecules/ColorPicker",
}

export default meta

type Story = StoryObj<typeof ColorPicker>

// Default rendering: a swatch button + hex input, opening a gradient/hue picker popover on click
export const Default: Story = {}

// The helperText prop rendering supporting text below the control
export const WithHelperText: Story = {
  args: {
    helperText: "Aplicada aos portais e comunicações da organização.",
  },
}

// The disabled prop preventing the popover from opening and disabling the hex input
export const Disabled: Story = {
  args: {
    disabled: true,
  },
}

// The elevated prop set to false, removing the hex input's drop shadow
export const NotElevated: Story = {
  args: {
    elevated: false,
  },
}
