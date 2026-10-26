import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "../../atoms"
import { StateMessage } from "./StateMessage"

const meta: Meta<typeof StateMessage> = {
  args: {
    description: "Cadastre a primeira unidade para começar a usar o sistema.",
    title: "Nenhuma unidade cadastrada",
  },
  argTypes: {
    action: {
      control: false,
      description: "Element rendered below the text, usually a Button (retry, go back, create).",
    },
    description: {
      control: "text",
      description: "Secondary text rendered below the title.",
    },
    icon: {
      control: "select",
      description: "Overrides the icon that the variant would otherwise pick.",
      options: ["file-outline", "search-outline", "warning-outline", "lock-outline", "users-outline"],
    },
    title: {
      control: "text",
      description: "Main message of the state.",
    },
    variant: {
      control: "select",
      description:
        "Kind of state: empty (nothing to show yet), error (a failed load, announced as an alert) or restricted (no access). Defaults to empty.",
      options: ["empty", "error", "restricted"],
    },
  },
  component: StateMessage,
  tags: ["autodocs"],
  title: "Molecules/StateMessage",
}

export default meta

type Story = StoryObj<typeof StateMessage>

// Default rendering, the empty variant with a description and no action
export const Default: Story = {}

// The empty variant with an action to create the first item
export const EmptyWithAction: Story = {
  args: {
    action: <Button>Nova unidade</Button>,
  },
}

// The error variant, announced as an alert, with a retry action
export const LoadError: Story = {
  args: {
    action: <Button>Tentar novamente</Button>,
    description: "Verifique sua conexão e tente de novo.",
    title: "Não foi possível carregar as unidades",
    variant: "error",
  },
}

// The restricted variant, shown when the user has no permission to see the content
export const Restricted: Story = {
  args: {
    action: <Button variant="link">Voltar para o início</Button>,
    description: "Você não tem permissão para acessar esta área.",
    title: "Acesso restrito",
    variant: "restricted",
  },
}

// The icon prop overriding the variant's default icon, here for a search with no results
export const CustomIcon: Story = {
  args: {
    description: "Tente outro termo ou remova os filtros.",
    icon: "search-outline",
    title: "Nenhum resultado encontrado",
  },
}
