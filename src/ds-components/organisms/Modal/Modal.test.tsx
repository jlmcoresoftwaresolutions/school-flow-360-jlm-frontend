import { fireEvent, render, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { Modal, type ModalProps } from "./Modal"

const renderModal = (overrides: Partial<ModalProps> = {}) => {
  const onClose = vi.fn()

  render(
    <Modal closeLabel="Fechar" onClose={onClose} open title="Editar unidade" {...overrides}>
      <p>Conteúdo</p>
    </Modal>,
  )

  return { onClose }
}

describe("Modal", () => {
  it("renders nothing while closed", () => {
    renderModal({ open: false })

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
  })

  it("renders a modal dialog named by its title", () => {
    renderModal()

    const dialog = screen.getByRole("dialog", { name: "Editar unidade" })

    expect(dialog).toHaveAttribute("aria-modal", "true")
    expect(screen.getByRole("heading", { level: 2, name: "Editar unidade" })).toBeInTheDocument()
  })

  it("renders in a portal on document.body, outside the render container", () => {
    const { container } = render(
      <Modal onClose={vi.fn()} open title="Título">
        Conteúdo
      </Modal>,
    )

    expect(container).toBeEmptyDOMElement()
    expect(document.body).toContainElement(screen.getByRole("dialog"))
  })

  it("renders the children and the footer", () => {
    renderModal({ footer: <button type="button">Salvar</button> })

    expect(screen.getByText("Conteúdo")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument()
  })

  it("renders no footer bar without the footer prop", () => {
    renderModal()

    expect(screen.getByRole("dialog").children).toHaveLength(2)
  })

  it("renders the X button only when closeLabel is given, and it calls onClose", () => {
    const { onClose } = renderModal()

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("omits the X button without closeLabel", () => {
    renderModal({ closeLabel: undefined })

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("calls onClose on Escape", () => {
    const { onClose } = renderModal()

    fireEvent.keyDown(document, { key: "Escape" })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("ignores Escape while closed", () => {
    const { onClose } = renderModal({ open: false })

    fireEvent.keyDown(document, { key: "Escape" })

    expect(onClose).not.toHaveBeenCalled()
  })

  it("calls onClose when the backdrop is pressed, but not when the dialog itself is", () => {
    const { onClose } = renderModal()
    const dialog = screen.getByRole("dialog")

    fireEvent.mouseDown(dialog)

    expect(onClose).not.toHaveBeenCalled()

    fireEvent.mouseDown(dialog.parentElement as HTMLElement)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("keeps the backdrop from closing it when closeOnBackdropClick is false", () => {
    const { onClose } = renderModal({ closeOnBackdropClick: false })

    fireEvent.mouseDown(screen.getByRole("dialog").parentElement as HTMLElement)

    expect(onClose).not.toHaveBeenCalled()
  })

  it("moves focus to the first focusable element when it opens", () => {
    renderModal()

    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus()
  })

  it("focuses the dialog itself when nothing inside is focusable", () => {
    renderModal({ closeLabel: undefined })

    expect(screen.getByRole("dialog")).toHaveFocus()
  })

  it("wraps Tab from the last focusable element to the first", () => {
    renderModal({ footer: <button type="button">Salvar</button> })

    screen.getByRole("button", { name: "Salvar" }).focus()
    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab" })

    expect(screen.getByRole("button", { name: "Fechar" })).toHaveFocus()
  })

  it("wraps Shift+Tab from the first focusable element to the last", () => {
    renderModal({ footer: <button type="button">Salvar</button> })

    fireEvent.keyDown(document.activeElement as HTMLElement, { key: "Tab", shiftKey: true })

    expect(screen.getByRole("button", { name: "Salvar" })).toHaveFocus()
  })

  it("locks the page scroll while open and restores it on close", () => {
    document.body.style.overflow = "auto"
    const { unmount } = render(
      <Modal onClose={vi.fn()} open title="Título">
        Conteúdo
      </Modal>,
    )

    expect(document.body).toHaveStyle({ overflow: "hidden" })

    unmount()

    expect(document.body).toHaveStyle({ overflow: "auto" })

    document.body.style.overflow = ""
  })

  it("returns focus to the element that was focused before it opened", () => {
    const Example = () => {
      const [open, setOpen] = useState(false)

      return (
        <>
          <button onClick={() => setOpen(true)} type="button">
            Abrir
          </button>

          <Modal closeLabel="Fechar" onClose={() => setOpen(false)} open={open} title="Título">
            Conteúdo
          </Modal>
        </>
      )
    }

    render(<Example />)

    const opener = screen.getByRole("button", { name: "Abrir" })
    opener.focus()
    fireEvent.click(opener)

    expect(screen.getByRole("dialog")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Fechar" }))

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it("forwards className and style to the dialog", () => {
    renderModal({ className: "custom", style: { margin: "4px" } })

    expect(screen.getByRole("dialog")).toHaveClass("custom")
    expect(screen.getByRole("dialog")).toHaveStyle({ margin: "4px" })
  })
})
