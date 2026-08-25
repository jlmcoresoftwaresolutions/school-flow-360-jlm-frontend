import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/ds-components/atoms"
import { spacing } from "@/foundation"

import { Toast } from "./Toast"
import { toast } from "./toastTrigger"

const positions = ["top-left", "top-center", "top-right", "bottom-left", "bottom-center", "bottom-right"] as const

const meta: Meta<typeof Toast> = {
  argTypes: {
    position: {
      control: "select",
      description: "Corner of the viewport the toasts stack from. Defaults to top-right.",
      options: positions,
    },
  },
  component: Toast,
  tags: ["autodocs"],
  title: "Components/Toast",
}

export default meta

type Story = StoryObj<typeof Toast>

// Default rendering: mounted with no toast fired yet, so nothing is visible until one of the
// buttons below is clicked - matches how it's actually used, mounted once at the app root and
// triggered from anywhere via the toast function
export const Default: Story = {
  render: (args) => (
    <>
      <div style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
        <Button onClick={() => toast.success("Aluno matriculado com sucesso!")}>Success</Button>
        <Button onClick={() => toast.info("A mensalidade vence em 3 dias.")}>Info</Button>
        <Button onClick={() => toast.warning("Turma próxima da capacidade máxima.")}>Warning</Button>
        <Button onClick={() => toast.error("Não foi possível salvar o boletim.")}>Error</Button>
        <Button onClick={() => toast("Notificação sem variante definida.")}>Default</Button>
      </div>
      <Toast {...args} />
    </>
  ),
}

// A single mounted Toast handles every position at once - each toast call below overrides its own
// position, which is how position is meant to vary at runtime rather than by remounting Toast
export const Positions: Story = {
  render: () => (
    <>
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
        {positions.map((position) => (
          <Button key={position} onClick={() => toast(`Posição ${position}`, { position, toastId: position })}>
            {position}
          </Button>
        ))}
      </div>
      <Toast />
    </>
  ),
}
