import type { Meta, StoryObj } from "@storybook/react-vite"

import { PageHeader } from "./PageHeader"

const meta: Meta<typeof PageHeader> = {
  args: {
    description: "Visão geral da sua organização, com informações institucionais e configurações principais.",
    icon: "building-outline",
    title: "Minha Unidade",
  },
  argTypes: {
    className: {
      control: false,
      description: "Class name forwarded to the root header.",
    },
    description: {
      control: "text",
      description: "Optional text below the title, describing the page.",
    },
    icon: {
      control: "select",
      description: "Optional icon beside the title, from the icon set registered in iconMap.",
      options: ["building-outline", "home-outline", "school-outline", "money-outline", "users-outline"],
    },
    style: {
      control: "object",
      description: "Inline styles forwarded to the root header.",
    },
    title: {
      control: "text",
      description: "The page title, rendered as the page's <h1>.",
    },
  },
  component: PageHeader,
  tags: ["autodocs"],
  title: "Molecules/PageHeader",
}

export default meta

type Story = StoryObj<typeof PageHeader>

// Default rendering: icon, title and description, as at the top of Minha Unidade
export const Default: Story = {}

// Without the optional icon, the title and description start at the left edge
export const WithoutIcon: Story = {
  args: { icon: undefined },
}

// Only the required title, with neither icon nor description
export const TitleOnly: Story = {
  args: { description: undefined, icon: undefined },
}
