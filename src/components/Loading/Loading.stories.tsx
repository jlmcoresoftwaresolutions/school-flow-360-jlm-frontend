import type { Meta, StoryObj } from "@storybook/react-vite"

import { Text } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { Loading } from "./Loading"

const meta: Meta<typeof Loading> = {
  argTypes: {
    label: { control: "text", description: "Accessible name announced to screen readers via aria-label" },
  },
  component: Loading,
  decorators: [
    (Story) => (
      <>
        <div
          style={{
            background: "linear-gradient(135deg, #3D5778 0%, #4B87D6 100%)",
            inset: 0,
            padding: spacing[24],
            position: "fixed",
          }}
        >
          <Text color="inverse">Conteúdo por trás do Loading, para demonstrar o fundo fosco</Text>
        </div>
        <Story />
      </>
    ),
  ],
  tags: ["autodocs"],
  title: "Components/Loading",
}

export default meta

type Story = StoryObj<typeof Loading>

// Default rendering: covers the full viewport with a centered spinner over a frosted backdrop
export const Default: Story = {}

// The label prop overriding the default "Carregando..." accessible name
export const CustomLabel: Story = {
  args: { label: "Enviando formulário..." },
}
