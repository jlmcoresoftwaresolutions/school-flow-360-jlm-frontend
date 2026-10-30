import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { spacing } from "@/foundation"

import { Card, Text } from "../../atoms"
import { Tabs, type TabsProps } from "./Tabs"

// Tabs is controlled, so every story wraps it in a component that owns the selected key.
const TabsDemo = (props: TabsProps) => {
  const [value, setValue] = useState(props.value)

  return <Tabs {...props} onChange={setValue} value={value} />
}

const items: TabsProps["items"] = [
  {
    content: <Text as="p">Dados institucionais, contato e endereço da organização.</Text>,
    key: "visao-geral",
    label: "Visão Geral",
  },
  {
    content: <Text as="p">Logo, favicon e cores usados nas telas e documentos.</Text>,
    key: "identidade-visual",
    label: "Identidade Visual",
  },
  {
    content: <Text as="p">Lista de unidades da organização.</Text>,
    key: "unidades",
    label: "Unidades",
  },
]

const meta: Meta<typeof Tabs> = {
  args: {
    items,
    label: "Seções de Minha Unidade",
    value: "visao-geral",
  },
  argTypes: {
    attached: {
      control: "boolean",
      description:
        "Joins the bar to the content right below it (typically a Card, with no gap): no baseline, and the selected tab takes the card's look over its top edge, so tab and content read as one piece.",
    },
    items: {
      control: "object",
      description:
        "The tabs: key, label and optionally content (rendered below while selected), icon (shown before the label) and disabled. Order is the display order.",
    },
    label: {
      control: "text",
      description: "Accessible name of the tab bar.",
    },
    onChange: {
      control: false,
      description: "Called with the key of the tab the user picked, by click or keyboard.",
    },
    value: {
      control: "text",
      description: "Key of the selected tab. The component is controlled: it never selects by itself.",
    },
  },
  component: Tabs,
  render: (args) => <TabsDemo {...args} />,
  tags: ["autodocs"],
  title: "Molecules/Tabs",
}

export default meta

type Story = StoryObj<typeof Tabs>

// Default rendering, three tabs each with its own panel, switched by click or the arrow keys
export const Default: Story = {}

// The icon item prop, showing an icon before each label
export const WithIcons: Story = {
  args: {
    items: [
      { ...items[0], icon: "info-outline" },
      { ...items[1], icon: "palette-outline" },
      { ...items[2], icon: "location-outline" },
    ],
  },
}

// The attached prop joining the selected tab to the Card right below it
export const Attached: Story = {
  args: { attached: true, items: items.map((item) => ({ ...item, content: undefined })) },
  render: (args) => (
    <div>
      <TabsDemo {...args} />
      <Card style={{ padding: spacing[24] }}>
        <Text as="p">Conteúdo da aba selecionada, emendado nela.</Text>
      </Card>
    </div>
  ),
}

// Tabs without content, acting only as a selector for pages that swap the content themselves
export const SelectorOnly: Story = {
  args: {
    items: items.map((item) => ({ key: item.key, label: item.label })),
  },
}

// A disabled tab, skipped by the keyboard and not clickable
export const WithDisabledTab: Story = {
  args: {
    items: items.map((item) => (item.key === "unidades" ? { ...item, disabled: true } : item)),
  },
}

// More tabs than fit a narrow screen, scrolling sideways instead of wrapping
export const ManyTabs: Story = {
  args: {
    items: Array.from({ length: 10 }, (_, index) => ({ key: `aba-${index}`, label: `Seção número ${index + 1}` })),
    value: "aba-0",
  },
  decorators: [(Story) => <div style={{ maxWidth: "400px" }}>{Story()}</div>],
}
