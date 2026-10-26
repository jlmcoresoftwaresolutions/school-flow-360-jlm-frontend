import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Button, Text } from "../../atoms"
import { Modal, type ModalProps } from "./Modal"

// Modal is controlled, so every story wraps it in a button that owns the open state.
const ModalDemo = (props: Partial<ModalProps>) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Abrir modal</Button>

      <Modal title="Editar unidade" {...props} onClose={() => setOpen(false)} open={open}>
        {props.children ?? <Text as="p">Altere os dados da unidade e salve para aplicar.</Text>}
      </Modal>
    </>
  )
}

const meta: Meta<typeof Modal> = {
  args: {
    closeLabel: "Fechar",
    title: "Editar unidade",
  },
  argTypes: {
    children: {
      control: false,
      description: "Content of the modal body, which scrolls when it is taller than the screen.",
    },
    closeLabel: {
      control: "text",
      description: "Accessible name of the X button. The button is only rendered when this is given.",
    },
    closeOnBackdropClick: {
      control: "boolean",
      description: "Whether a click on the dimmed backdrop calls onClose. Defaults to true.",
    },
    footer: {
      control: false,
      description: "Element rendered in the bottom bar, usually the action buttons. No bar without it.",
    },
    onClose: {
      control: false,
      description: "Called on Escape, on a backdrop click and on the X button. The owner decides to close.",
    },
    open: {
      control: false,
      description: "Whether the modal is shown. The modal is controlled: it never closes by itself.",
    },
    size: {
      control: "select",
      description: "Maximum width of the dialog. Defaults to md.",
      options: ["sm", "md", "lg"],
    },
    title: {
      control: "text",
      description: "Heading of the dialog, also its accessible name.",
    },
  },
  component: Modal,
  parameters: { layout: "centered" },
  render: (args) => <ModalDemo {...args} />,
  tags: ["autodocs"],
  title: "Organisms/Modal",
}

export default meta

type Story = StoryObj<typeof Modal>

// Default rendering, a titled dialog with an X button, opened from a button
export const Default: Story = {}

// The footer prop with the action buttons, separated from the body by a divider
export const WithFooter: Story = {
  args: {
    footer: (
      <>
        <Button color="secondary" variant="outlined">
          Cancelar
        </Button>
        <Button>Salvar alterações</Button>
      </>
    ),
  },
}

// The size prop set to lg for a wider dialog
export const Large: Story = {
  args: {
    size: "lg",
  },
}

// Body content taller than the screen, scrolling inside the dialog while the title and footer stay put
export const LongContent: Story = {
  args: {
    children: Array.from({ length: 20 }, (_, index) => (
      <Text as="p" key={index}>
        Parágrafo {index + 1}: conteúdo longo que faz o corpo do modal rolar sem mover o título nem o rodapé.
      </Text>
    )),
    footer: <Button>Entendi</Button>,
  },
}

// Without closeLabel the X button is not rendered, leaving Escape and the footer as the ways out
export const WithoutCloseButton: Story = {
  args: {
    closeLabel: undefined,
    footer: <Button>Entendi</Button>,
  },
}

// The closeOnBackdropClick prop set to false, so only Escape, the X and the buttons close it
export const BackdropClickDisabled: Story = {
  args: {
    closeOnBackdropClick: false,
  },
}
