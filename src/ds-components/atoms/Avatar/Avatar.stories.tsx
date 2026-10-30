import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "@/foundation"

import { Avatar } from "./Avatar"

// A self-contained placeholder photo, so the story doesn't depend on an external image host.
const photo = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="80" height="80" fill="#4f46e5"/><circle cx="40" cy="32" r="14" fill="#c7d2fe"/><rect x="14" y="52" width="52" height="40" rx="20" fill="#c7d2fe"/></svg>',
)}`

const meta: Meta<typeof Avatar> = {
  args: {
    name: "Maria da Silva",
  },
  argTypes: {
    className: {
      control: false,
      description: "Class name forwarded to the avatar.",
    },
    decorative: {
      control: "boolean",
      description:
        "Hides the avatar from screen readers, for when the name is already shown beside it. Otherwise it is an image named by name.",
    },
    name: {
      control: "text",
      description: "The person's name: the avatar's accessible name, and the source of the initials without a photo.",
    },
    size: {
      control: "select",
      description: "Diameter: sm (32px), md (40px) or lg (48px). Defaults to md.",
      options: ["sm", "md", "lg"],
    },
    src: {
      control: "text",
      description: "URL of the photo. Without one, the avatar shows the name's initials.",
    },
    style: {
      control: "object",
      description: "Inline styles forwarded to the avatar.",
    },
  },
  component: Avatar,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  title: "Atoms/Avatar",
}

export default meta

type Story = StoryObj<typeof Avatar>

// Default rendering: without a photo, the initials of the name on a tinted circle
export const Default: Story = {}

// The src prop showing the photo instead of the initials
export const WithPhoto: Story = {
  args: { src: photo },
}

// The three sizes side by side, with and without a photo
export const Sizes: Story = {
  render: (args) => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[16] }}>
      <Avatar {...args} size="sm" />
      <Avatar {...args} size="md" />
      <Avatar {...args} size="lg" />
      <Avatar {...args} size="sm" src={photo} />
      <Avatar {...args} size="md" src={photo} />
      <Avatar {...args} size="lg" src={photo} />
    </div>
  ),
}
