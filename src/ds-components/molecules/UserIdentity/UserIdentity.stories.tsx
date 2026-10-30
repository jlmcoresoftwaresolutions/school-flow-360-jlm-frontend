import type { Meta, StoryObj } from "@storybook/react-vite"

import { UserIdentity } from "./UserIdentity"

// A self-contained placeholder photo, so the story doesn't depend on an external image host.
const photo = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#4f46e5"/><circle cx="40" cy="32" r="14" fill="#c7d2fe"/><rect x="14" y="52" width="52" height="40" rx="20" fill="#c7d2fe"/></svg>',
)}`

const meta: Meta<typeof UserIdentity> = {
  args: {
    name: "Maria da Silva",
    role: "Diretora",
  },
  argTypes: {
    avatarSrc: {
      control: "text",
      description: "URL of the photo. Without one, the avatar shows the name's initials.",
    },
    className: {
      control: false,
      description: "Class name forwarded to the root element.",
    },
    fullName: {
      control: "boolean",
      description:
        "Shows the whole name. By default only the first and last names are shown (the whole one as the hover title), so a long name doesn't stretch the element.",
    },
    hideTextOnNarrowScreens: {
      control: "boolean",
      description:
        "Below the md breakpoint, shows only the avatar; the name and role stay available to screen readers.",
    },
    name: {
      control: "text",
      description: "The person's name, shown beside the avatar (and the source of its initials).",
    },
    role: {
      control: "text",
      description: "Optional role or position, shown below the name.",
    },
    style: {
      control: "object",
      description: "Inline styles forwarded to the root element.",
    },
  },
  component: UserIdentity,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Molecules/UserIdentity",
}

export default meta

type Story = StoryObj<typeof UserIdentity>

// Default rendering: initials, name and role
export const Default: Story = {}

// The avatarSrc prop showing the photo instead of the initials
export const WithPhoto: Story = {
  args: { avatarSrc: photo },
}

// Without the optional role, only the name beside the avatar
export const WithoutRole: Story = {
  args: { role: undefined },
}

// A long name shortened to its first and last names by default
export const LongName: Story = {
  args: { name: "Maria Aparecida dos Santos Oliveira" },
}

// The fullName prop showing a long name in full
export const FullName: Story = {
  args: { fullName: true, name: "Maria Aparecida dos Santos Oliveira" },
}

// The hideTextOnNarrowScreens prop: shrink the viewport below md to see only the avatar
export const HideTextOnNarrowScreens: Story = {
  args: { hideTextOnNarrowScreens: true },
}
