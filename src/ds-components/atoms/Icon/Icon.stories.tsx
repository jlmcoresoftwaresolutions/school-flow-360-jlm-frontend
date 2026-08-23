import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing, type SpacingType, typography } from "@/foundation"

import { Icon } from "./Icon"
import type { IconName } from "./iconMap"
import { iconMap } from "./iconMap"

const allIconNames = Object.keys(iconMap) as IconName[]
const spacingKeys = Object.keys(spacing).map(Number) as (keyof SpacingType)[]

const meta: Meta<typeof Icon> = {
  args: { name: "home" },
  argTypes: {
    color: {
      control: "select",
      description: "Semantic color applied to the icon. Defaults to default.",
      options: ["brand", "danger", "default", "info", "inverse", "muted", "secondary", "success", "warning"],
    },
    name: {
      control: "select",
      description: "Icon to render, from the icon set registered in iconMap.",
      options: allIconNames,
    },
    size: {
      control: "select",
      description: "Size (width and height) applied to the icon, from the spacing token scale. Defaults to 20.",
      options: spacingKeys,
    },
  },
  component: Icon,
  tags: ["autodocs"],
  title: "Atoms/Icon",
}

export default meta

type Story = StoryObj<typeof Icon>

// Default rendering with no variant props set
export const Default: Story = {}

// Every spacing-token-derived size available for the size prop
export const Sizes: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[16] }}>
      <Icon name="home" size={12} />
      <Icon name="home" size={16} />
      <Icon name="home" size={20} />
      <Icon name="home" size={24} />
      <Icon name="home" size={32} />
      <Icon name="home" size={40} />
    </div>
  ),
}

// Every semantic color variant available for the color prop
export const Colors: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[16] }}>
      <Icon color="brand" name="bell" />
      <Icon color="danger" name="bell" />
      <Icon color="default" name="bell" />
      <Icon color="info" name="bell" />
      <Icon color="muted" name="bell" />
      <Icon color="secondary" name="bell" />
      <Icon color="success" name="bell" />
      <Icon color="warning" name="bell" />
    </div>
  ),
}

// Every icon registered in the iconMap, each labeled with its name prop value
export const AllIcons: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[24] }}>
      {allIconNames.map((name) => (
        <div key={name} style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Icon name={name} size={24} />
          <span style={{ fontSize: `${typography.fontSize.sm}px` }}>{name}</span>
        </div>
      ))}
    </div>
  ),
}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = { args: { name: "info", tooltip: "Mais informações" } }
