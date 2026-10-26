import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

import { Button } from "../../atoms"
import { Textarea } from "../../molecules"
import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog"

// ConfirmDialog is controlled, so every story wraps it in a button that owns the open state.
const ConfirmDialogDemo = (props: Partial<ConfirmDialogProps>) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button color={props.tone === "danger" ? "danger" : "brand"} onClick={() => setOpen(true)}>
        Abrir confirmação
      </Button>

      <ConfirmDialog
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
        title="Confirmar ação?"
        {...props}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        open={open}
      />
    </>
  )
}

const meta: Meta<typeof ConfirmDialog> = {
  args: {
    closeLabel: "Fechar",
    description: "Esta ação pode ser revertida depois.",
  },
  argTypes: {
    cancelLabel: {
      control: "text",
      description: "Label of the cancel button, which calls onClose.",
    },
    children: {
      control: false,
      description: "Content rendered below the description, e.g. a field for the reason of the action.",
    },
    closeLabel: {
      control: "text",
      description: "Accessible name of the X button. The button is only rendered when this is given.",
    },
    confirmLabel: {
      control: "text",
      description: "Label of the confirm button, which calls onConfirm.",
    },
    description: {
      control: "text",
      description: "Text explaining what is being confirmed.",
    },
    loading: {
      control: "boolean",
      description: "Disables both buttons and blocks every way of closing while the action runs. Defaults to false.",
    },
    onClose: {
      control: false,
      description: "Called on cancel, Escape, the X and a backdrop click (not while loading).",
    },
    onConfirm: {
      control: false,
      description: "Called when the confirm button is pressed.",
    },
    open: {
      control: false,
      description: "Whether the dialog is shown. It is controlled: it never closes by itself.",
    },
    title: {
      control: "text",
      description: "Heading of the dialog, also its accessible name.",
    },
    tone: {
      control: "select",
      description: "danger paints the confirm button red, for destructive actions. Defaults to default.",
      options: ["default", "danger"],
    },
  },
  component: ConfirmDialog,
  parameters: { layout: "centered" },
  render: (args) => <ConfirmDialogDemo {...args} />,
  tags: ["autodocs"],
  title: "Organisms/ConfirmDialog",
}

export default meta

type Story = StoryObj<typeof ConfirmDialog>

// Default rendering, a neutral confirmation with cancel and confirm buttons
export const Default: Story = {}

// The danger tone for a destructive action such as inactivating a unit
export const Danger: Story = {
  args: {
    confirmLabel: "Inativar",
    description: "A unidade deixará de aparecer nas opções de novas operações, mas o histórico será preservado.",
    title: "Inativar unidade?",
    tone: "danger",
  },
}

// Children rendered below the description, here a reason field that the action requires
export const WithReasonField: Story = {
  args: {
    children: <Textarea placeholder="Descreva o motivo" title="Motivo" />,
    confirmLabel: "Inativar",
    title: "Inativar unidade?",
    tone: "danger",
  },
}

// The loading prop disabling both buttons and blocking dismissal while the action runs
export const Loading: Story = {
  args: {
    loading: true,
  },
  render: (args) => (
    <ConfirmDialog
      cancelLabel="Cancelar"
      confirmLabel="Confirmar"
      title="Confirmar ação?"
      {...(args as Partial<ConfirmDialogProps>)}
      onClose={() => {}}
      onConfirm={() => {}}
      open
    />
  ),
}
