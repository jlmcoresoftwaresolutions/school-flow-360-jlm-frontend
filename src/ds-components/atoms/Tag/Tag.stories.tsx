import type { Meta, StoryObj } from "@storybook/react-vite"

import { spacing } from "../../../foundation"
import { Icon } from "../Icon"
import { Tag } from "./Tag"

const meta: Meta<typeof Tag> = {
  args: {
    children: "Novo",
  },
  argTypes: {
    color: {
      control: "select",
      description: "Semantic color applied to the tag, from the semantic color scale. Defaults to default.",
      options: ["default", "secondary", "muted", "inverse", "brand", "success", "warning", "danger", "info"],
    },
    elevated: {
      control: "boolean",
      description: "Adds a drop shadow around the tag. Defaults to true.",
    },
    endIcon: {
      control: false,
      description: "Icon element rendered after the tag's label.",
    },
    fontSize: {
      control: "select",
      description: "Font size token applied to the tag's label. Defaults to sm.",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"],
    },
    fontWeight: {
      control: "select",
      description: "Font weight token applied to the tag's label. Defaults to medium.",
      options: ["regular", "medium", "semibold", "bold", "superbold"],
    },
    padding: {
      control: "select",
      description: "Padding around the tag's content. Defaults to sm, the smallest level.",
      options: ["sm", "md", "lg"],
    },
    startIcon: {
      control: false,
      description: "Icon element rendered before the tag's label.",
    },
    textColor: {
      control: "color",
      description: "Overrides the text color that color/variant would otherwise resolve to.",
    },
    tooltip: {
      control: "text",
      description: "Text shown in a cursor-following tooltip on hover.",
    },
    translucent: {
      control: "select",
      description: "Frosted-glass effect tinted with the tag's own color, overriding variant. true is medium.",
      options: [false, true, "low", "medium", "high"],
    },
    variant: {
      control: "select",
      description: "Visual style of the tag. Defaults to solid.",
      options: ["solid", "outlined", "soft"],
    },
  },
  component: Tag,
  tags: ["autodocs"],
  title: "Atoms/Tag",
}

export default meta

type Story = StoryObj<typeof Tag>

// Default rendering, using the default color
export const Default: Story = {}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = {
  args: {
    tooltip: "Informação extra sobre esta tag",
  },
}

// The elevated prop set to false, removing the default drop shadow around the tag
export const Flat: Story = {
  args: {
    elevated: false,
  },
}

// The fontSize and fontWeight props overriding the tag's default typography tokens
export const WithFontSizeAndFontWeight: Story = {
  args: {
    children: "Destaque",
    fontSize: "lg",
    fontWeight: "bold",
  },
}

// Every padding level rendered side by side, from sm (the default, smallest) to lg
export const Paddings: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
      <Tag padding="sm">sm</Tag>
      <Tag padding="md">md</Tag>
      <Tag padding="lg">lg</Tag>
    </div>
  ),
}

// The textColor prop overriding the text color that color/variant would otherwise resolve to
export const WithTextColor: Story = {
  args: {
    children: "Destaque",
    color: "success",
    textColor: "#8B4513",
    variant: "soft",
  },
}

// The startIcon prop rendering an icon before the tag's label
export const WithStartIcon: Story = {
  args: {
    children: "Verificado",
    startIcon: <Icon color="inverse" name="check" size={16} />,
  },
}

// The endIcon prop rendering an icon after the tag's label
export const WithEndIcon: Story = {
  args: {
    children: "Ver mais",
    endIcon: <Icon color="inverse" name="chevron-right" size={16} />,
  },
}

// The translucent prop applying a frosted-glass effect tinted with each color, over a colored
// background to show the effect - overrides variant entirely
export const Translucent: Story = {
  render: () => (
    <div
      style={{
        alignItems: "center",
        background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)",
        display: "flex",
        gap: spacing[8],
        padding: spacing[32],
      }}
    >
      <Tag color="brand" translucent>
        brand
      </Tag>
      <Tag color="danger" translucent>
        danger
      </Tag>
      <Tag color="success" translucent>
        success
      </Tag>
      <Tag color="inverse" translucent>
        inverse
      </Tag>
    </div>
  ),
}

// Every semantic color variant rendered side by side
export const Colors: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
      <Tag color="brand">brand</Tag>
      <Tag color="danger">danger</Tag>
      <Tag color="default">default</Tag>
      <Tag color="info">info</Tag>
      <Tag color="inverse">inverse</Tag>
      <Tag color="muted">muted</Tag>
      <Tag color="secondary">secondary</Tag>
      <Tag color="success">success</Tag>
      <Tag color="warning">warning</Tag>
    </div>
  ),
}

// The outlined variant, a transparent background with a colored border and text, for every color
export const Outlined: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
      <Tag color="brand" variant="outlined">
        brand
      </Tag>
      <Tag color="danger" variant="outlined">
        danger
      </Tag>
      <Tag color="default" variant="outlined">
        default
      </Tag>
      <Tag color="info" variant="outlined">
        info
      </Tag>
      <Tag color="inverse" variant="outlined">
        inverse
      </Tag>
      <Tag color="muted" variant="outlined">
        muted
      </Tag>
      <Tag color="secondary" variant="outlined">
        secondary
      </Tag>
      <Tag color="success" variant="outlined">
        success
      </Tag>
      <Tag color="warning" variant="outlined">
        warning
      </Tag>
    </div>
  ),
}

// The soft variant, a light tint background with a matching-color border and darker text, for every color
export const Soft: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
      <Tag color="brand" variant="soft">
        brand
      </Tag>
      <Tag color="danger" variant="soft">
        danger
      </Tag>
      <Tag color="default" variant="soft">
        default
      </Tag>
      <Tag color="info" variant="soft">
        info
      </Tag>
      <Tag color="inverse" variant="soft">
        inverse
      </Tag>
      <Tag color="muted" variant="soft">
        muted
      </Tag>
      <Tag color="secondary" variant="soft">
        secondary
      </Tag>
      <Tag color="success" variant="soft">
        success
      </Tag>
      <Tag color="warning" variant="soft">
        warning
      </Tag>
    </div>
  ),
}
