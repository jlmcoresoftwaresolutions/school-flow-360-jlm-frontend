import type { Meta, StoryObj } from "@storybook/react-vite"

import {
  borderRadiusLevels,
  type BorderRadiusLevelsType,
  semanticColors,
  type SemanticColorsType,
  spacing,
} from "@/foundation"

import { Card } from "./Card"

const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]
const colorKeys = Object.keys(semanticColors) as (keyof SemanticColorsType)[]

const meta: Meta<typeof Card> = {
  args: { children: "O conteúdo do card fica aqui." },
  argTypes: {
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the card: subtle, low, medium, high or full. Defaults to medium.",
      options: borderRadiusLevelKeys,
    },
    color: {
      control: "select",
      description: "Background color applied to the card, from the semantic color scale. Defaults to inverse.",
      options: colorKeys,
    },
    elevated: { control: "boolean", description: "Adds a drop shadow and removes the border. Defaults to true." },
    translucent: {
      control: "select",
      description: "Frosted-glass effect applied to the card's background, overriding color. true is medium.",
      options: [false, true, "low", "medium", "high"],
    },
  },
  component: Card,
  tags: ["autodocs"],
  title: "Atoms/Card",
}

export default meta

type Story = StoryObj<typeof Card>

// Default rendering with no variant props set
export const Default: Story = {}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <div
          key={borderRadiusLevelKey}
          style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: spacing[8] }}
        >
          <Card borderRadius={borderRadiusLevelKey} style={{ height: 80, width: 160 }} />
          <span>{borderRadiusLevelKey}</span>
        </div>
      ))}
    </div>
  ),
}

// Every semantic color token available for the color prop, applied to the card's background
export const Colors: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
      {colorKeys.map((colorKey) => (
        <div key={colorKey} style={{ alignItems: "center", display: "flex", flexDirection: "column", gap: spacing[8] }}>
          <Card color={colorKey} style={{ height: 80, width: 160 }} />
          <span>{colorKey}</span>
        </div>
      ))}
    </div>
  ),
}

// The elevated prop set to false, removing the default drop shadow and restoring the border
export const Flat: Story = { args: { elevated: false } }

// The translucent prop at its lowest opacity level, over a colored background to show the glass effect
export const TranslucentLow: Story = {
  args: { translucent: "low" },
  decorators: [
    (Story) => (
      <div style={{ background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)", padding: spacing[32] }}>
        <Story />
      </div>
    ),
  ],
}

// The translucent prop at its medium (default true) opacity level, over a colored background to show the glass effect
export const TranslucentMedium: Story = {
  args: { translucent: "medium" },
  decorators: [
    (Story) => (
      <div style={{ background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)", padding: spacing[32] }}>
        <Story />
      </div>
    ),
  ],
}

// The translucent prop at its highest opacity level, over a colored background to show the glass effect
export const TranslucentHigh: Story = {
  args: { translucent: "high" },
  decorators: [
    (Story) => (
      <div style={{ background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)", padding: spacing[32] }}>
        <Story />
      </div>
    ),
  ],
}

// elevated set to false alongside translucent, leaving only the glass edge glow with no drop shadow
export const TranslucentWithoutElevation: Story = {
  args: { elevated: false, translucent: "medium" },
  decorators: [
    (Story) => (
      <div style={{ background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)", padding: spacing[32] }}>
        <Story />
      </div>
    ),
  ],
}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = { args: { tooltip: "Informação extra sobre este card" } }
