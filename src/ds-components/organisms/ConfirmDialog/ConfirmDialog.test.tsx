import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { colors } from "@/foundation"

import { ConfirmDialog, type ConfirmDialogProps } from "./ConfirmDialog"

const renderDialog = (overrides: Partial<ConfirmDialogProps> = {}) => {
  const onClose = vi.fn()
  const onConfirm = vi.fn()

  render(
    <ConfirmDialog
      cancelLabel="Cancelar"
      closeLabel="Fechar"
      confirmLabel="Inativar"
      onClose={onClose}
      onConfirm={onConfirm}
      open
      title="Inativar unidade?"
      {...overrides}
    />,
  )

  return { onClose, onConfirm }
}

describe("ConfirmDialog", () => {
  it("renders a dialog named by its title with both buttons", () => {
    renderDialog()

    expect(screen.getByRole("dialog", { name: "Inativar unidade?" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Inativar" })).toBeInTheDocument()
  })

  it("renders nothing while closed", () => {
    renderDialog({ open: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders the description and the children", () => {
    renderDialog({ children: <p>Campo de motivo</p>, description: "O histórico é preservado." })

    expect(screen.getByText("O histórico é preservado.")).toBeInTheDocument()
    expect(screen.getByText("Campo de motivo")).toBeInTheDocument()
  })

  it("calls onConfirm, and only onConfirm, when the confirm button is pressed", () => {
    const { onClose, onConfirm } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Inativar" }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("calls onClose when the cancel button is pressed", () => {
    const { onClose, onConfirm } = renderDialog()

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it("calls onClose on Escape and on the X button", () => {
    const { onClose } = renderDialog()

    fireEvent.keyDown(document, { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it("paints the confirm button with the brand color by default", () => {
    renderDialog()

    expect(screen.getByRole("button", { name: "Inativar" })).toHaveStyle({ backgroundColor: colors.primary[500] })
  })

  it("paints the confirm button red in the danger tone", () => {
    renderDialog({ tone: "danger" })

    expect(screen.getByRole("button", { name: "Inativar" })).toHaveStyle({ backgroundColor: colors.danger[500] })
  })

  it("disables both buttons while loading", () => {
    renderDialog({ loading: true })

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Inativar" })).toBeDisabled()
  })

  it("can't be dismissed while loading", () => {
    const { onClose } = renderDialog({ loading: true })

    fireEvent.keyDown(document, { key: "Escape" })
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement)

    expect(onClose).not.toHaveBeenCalled()
  })
})
