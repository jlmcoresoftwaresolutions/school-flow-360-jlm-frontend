import type { Meta, StoryObj } from "@storybook/react-vite"

import schoolFlowIcon from "@/assets/images/school-flow.svg"
import {
  borderRadiusLevels,
  type BorderRadiusLevelsType,
  shadows,
  type ShadowsType,
  spacing,
  type SpacingType,
} from "@/foundation"

import { Image } from "./Image"

const spacingKeys = Object.keys(spacing).map(Number) as (keyof SpacingType)[]
const shadowKeys = Object.keys(shadows) as (keyof ShadowsType)[]
const borderRadiusLevelKeys = Object.keys(borderRadiusLevels) as (keyof BorderRadiusLevelsType)[]

const meta: Meta<typeof Image> = {
  args: {
    alt: "Ícone do SchoolFlow360",
    src: schoolFlowIcon,
  },
  argTypes: {
    borderRadius: {
      control: "select",
      description: "Border radius level applied to the image: subtle, low, medium, high or full. Defaults to medium.",
      options: borderRadiusLevelKeys,
    },
    boxShadow: {
      control: "select",
      description: "Box shadow token applied to the image, from the shadows token scale. Defaults to xl.",
      options: shadowKeys,
    },
    size: {
      control: "select",
      description: "Size (width and height) applied to the image, from the spacing token scale. Defaults to 48.",
      options: spacingKeys,
    },
    tooltip: {
      control: "text",
      description: "Text shown in a cursor-following tooltip on hover.",
    },
  },
  component: Image,
  tags: ["autodocs"],
  title: "Atoms/Image",
}

export default meta

type Story = StoryObj<typeof Image>

// Default rendering, using the default 48px size, xl box shadow and medium border radius
export const Default: Story = {}

// Every spacing-token-derived size available for the size prop
export const Sizes: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[24] }}>
      <Image alt="Ícone do SchoolFlow360" size={32} src={schoolFlowIcon} />
      <Image alt="Ícone do SchoolFlow360" size={48} src={schoolFlowIcon} />
      <Image alt="Ícone do SchoolFlow360" size={64} src={schoolFlowIcon} />
      <Image alt="Ícone do SchoolFlow360" size={96} src={schoolFlowIcon} />
    </div>
  ),
}

// Every shadow token available for the boxShadow prop
export const BoxShadows: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[24] }}>
      {shadowKeys.map((shadow) => (
        <Image key={shadow} alt="Ícone do SchoolFlow360" boxShadow={shadow} src={schoolFlowIcon} />
      ))}
    </div>
  ),
}

// Every border radius level available for the borderRadius prop
export const BorderRadiuses: Story = {
  render: () => (
    <div style={{ alignItems: "center", display: "flex", gap: spacing[24] }}>
      {borderRadiusLevelKeys.map((borderRadiusLevelKey) => (
        <Image
          key={borderRadiusLevelKey}
          alt="Ícone do SchoolFlow360"
          borderRadius={borderRadiusLevelKey}
          src={schoolFlowIcon}
        />
      ))}
    </div>
  ),
}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = {
  args: {
    tooltip: "Logotipo oficial",
  },
}
