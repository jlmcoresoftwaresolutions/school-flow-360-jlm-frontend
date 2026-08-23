import type { Meta, StoryObj } from "@storybook/react-vite"

import { semanticColors, type SemanticColorsType } from "@/foundation"

import { Text } from "./Text"

const colorKeys = Object.keys(semanticColors) as (keyof SemanticColorsType)[]

const meta: Meta<typeof Text> = {
  args: {
    children: "Um pequeno jabuti xereta viu dez cegonhas felizes",
  },
  argTypes: {
    align: {
      control: "select",
      description: "Text alignment applied to the element.",
      options: ["left", "center", "right", "justify"],
    },
    bold: {
      control: "boolean",
      description:
        'Shorthand for fontWeight="bold". Takes precedence over semibold and fontWeight; overridden by superbold.',
    },
    capitalize: {
      control: "boolean",
      description: "Applies text-transform: capitalize. Overridden by uppercase and lowercase.",
    },
    color: {
      control: "select",
      description: "Semantic color applied to the text, from the semantic color scale. Defaults to default.",
      options: colorKeys,
    },
    fontSize: {
      control: "select",
      description: "Font size token applied to the text. Defaults to md.",
      options: ["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"],
    },
    fontWeight: {
      control: "select",
      description: "Explicit font weight. Ignored when bold, semibold, or superbold is set.",
      options: ["regular", "medium", "semibold", "bold", "superbold"],
    },
    lowercase: {
      control: "boolean",
      description: "Applies text-transform: lowercase. Takes precedence over capitalize; overridden by uppercase.",
    },
    semibold: {
      control: "boolean",
      description:
        'Shorthand for fontWeight="semibold". Takes precedence over fontWeight; overridden by bold and superbold.',
    },
    superbold: {
      control: "boolean",
      description: 'Shorthand for fontWeight="superbold". Takes precedence over bold, semibold, and fontWeight.',
    },
    uppercase: {
      control: "boolean",
      description: "Applies text-transform: uppercase. Takes precedence over lowercase and capitalize.",
    },
  },
  component: Text,
  tags: ["autodocs"],
  title: "Atoms/Text",
}

export default meta

type Story = StoryObj<typeof Text>

// Default rendering with no variant props set
export const Default: Story = {}

// Polymorphic "as" prop rendering Text as an h1, combined with a larger fontSize/fontWeight
export const Heading: Story = {
  args: {
    as: "h1",
    fontSize: "3xl",
    fontWeight: "bold",
  },
}

// The bold convenience prop, a shorthand for fontWeight="bold"
export const Bold: Story = {
  args: {
    bold: true,
    children: "Texto em negrito via a prop bold",
  },
}

// The semibold convenience prop, a shorthand for fontWeight="semibold"
export const Semibold: Story = {
  args: {
    children: "Texto semibold via a prop semibold",
    semibold: true,
  },
}

// The superbold convenience prop, a shorthand for fontWeight="superbold"
export const Superbold: Story = {
  args: {
    children: "Texto superbold via a prop superbold",
    superbold: true,
  },
}

// The uppercase, lowercase, and capitalize convenience props, each a shorthand for text-transform
export const TextTransforms: Story = {
  render: () => (
    <>
      <Text uppercase>Texto em uppercase</Text>
      <Text lowercase>TEXTO EM LOWERCASE</Text>
      <Text capitalize>texto em capitalize</Text>
    </>
  ),
}

// The style escape hatch applying one-off inline CSS on top of the variant props
export const WithInlineStyle: Story = {
  args: {
    children: "Texto com uma substituição de estilo inline pontual",
    style: { textDecoration: "underline", textTransform: "uppercase" },
  },
}

// The polymorphic "as" prop rendering Text as an anchor, forwarding native anchor attributes like href/target
export const AsLink: Story = {
  args: {
    as: "a",
    children: "Texto renderizado como um link",
    color: "brand",
    href: "https://example.com",
    target: "_blank",
  },
}

// The tooltip prop showing a cursor-following tooltip on hover
export const WithTooltip: Story = {
  args: {
    children: "Passe o mouse para ver a tooltip",
    tooltip: "Dica útil que segue o cursor",
  },
}

// The display sizes above 4xl, meant for hero-scale headings
export const LargeSizes: Story = {
  render: () => (
    <>
      <Text as="h1" fontSize="5xl">
        5xl
      </Text>
      <Text as="h1" fontSize="6xl">
        6xl
      </Text>
      <Text as="h1" fontSize="7xl">
        7xl
      </Text>
    </>
  ),
}

// Every semantic color variant rendered side by side
export const Colors: Story = {
  render: () => (
    <>
      <Text color="default">default</Text>
      <Text color="brand">brand</Text>
      <Text color="danger">danger</Text>
      <Text color="info">info</Text>
      <Text color="muted">muted</Text>
      <Text color="secondary">secondary</Text>
      <Text color="success">success</Text>
      <Text color="warning">warning</Text>
    </>
  ),
}
