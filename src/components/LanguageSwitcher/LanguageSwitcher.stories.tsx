import type { Meta, StoryObj } from "@storybook/react-vite"

import { LanguageSwitcher } from "./LanguageSwitcher"

const meta: Meta<typeof LanguageSwitcher> = {
  args: {
    label: "Alterar idioma",
  },
  argTypes: {
    align: {
      control: "select",
      description: "Which edge of the trigger the menu lines up with. Defaults to end (right edge).",
      options: ["end", "start"],
    },
    label: {
      control: "text",
      description: "Accessible name of the icon-only trigger.",
    },
  },
  component: LanguageSwitcher,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Components/LanguageSwitcher",
}

export default meta

type Story = StoryObj<typeof LanguageSwitcher>

// Default rendering: a language icon opening the supported languages, each named in itself, the active one checked
export const Default: Story = {}
