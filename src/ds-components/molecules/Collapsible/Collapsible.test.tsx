import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { spacing } from "@/foundation"

import { Collapsible, type CollapsibleProps } from "./Collapsible"

const renderCollapsible = (overrides: Partial<CollapsibleProps> = {}) =>
  render(
    <Collapsible {...overrides}>
      <Collapsible.Trigger>Mostrar detalhes</Collapsible.Trigger>
      <Collapsible.Content>
        <p>Detalhes</p>
      </Collapsible.Content>
    </Collapsible>,
  )

describe("Collapsible", () => {
  it("starts closed: the content is hidden but stays in the document", () => {
    renderCollapsible()

    expect(screen.getByText("Detalhes")).not.toBeVisible()
    expect(screen.getByRole("button", { name: "Mostrar detalhes" })).toHaveAttribute("aria-expanded", "false")
  })

  it("starts open with defaultOpen", () => {
    renderCollapsible({ defaultOpen: true })

    expect(screen.getByText("Detalhes")).toBeVisible()
    expect(screen.getByRole("button", { name: "Mostrar detalhes" })).toHaveAttribute("aria-expanded", "true")
  })

  it("toggles the content with the trigger", () => {
    renderCollapsible()

    const trigger = screen.getByRole("button", { name: "Mostrar detalhes" })

    fireEvent.click(trigger)

    expect(screen.getByText("Detalhes")).toBeVisible()
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    fireEvent.click(trigger)

    expect(screen.getByText("Detalhes")).not.toBeVisible()
    expect(trigger).toHaveAttribute("aria-expanded", "false")
  })

  it("points the trigger's aria-controls at the content", () => {
    renderCollapsible()

    const controlled = screen.getByRole("button", { name: "Mostrar detalhes" }).getAttribute("aria-controls")

    expect(controlled).toBeTruthy()
    expect(screen.getByText("Detalhes").parentElement?.parentElement).toHaveAttribute("id", controlled as string)
  })

  it("lets the label depend on the state when the children are a function", () => {
    render(
      <Collapsible>
        <Collapsible.Trigger>{({ open }) => (open ? "Ocultar" : "Expandir")}</Collapsible.Trigger>
        <Collapsible.Content>Conteúdo</Collapsible.Content>
      </Collapsible>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Expandir" }))

    expect(screen.getByRole("button", { name: "Ocultar" })).toBeInTheDocument()
  })

  it("reports the next state through onOpenChange", () => {
    const onOpenChange = vi.fn()
    renderCollapsible({ onOpenChange })

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalhes" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
  })

  it("is controlled by open: it only changes when the owner says so", () => {
    const onOpenChange = vi.fn()
    const { rerender } = render(
      <Collapsible onOpenChange={onOpenChange} open={false}>
        <Collapsible.Trigger>Mostrar detalhes</Collapsible.Trigger>
        <Collapsible.Content>Detalhes</Collapsible.Content>
      </Collapsible>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalhes" }))

    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.getByText("Detalhes")).not.toBeVisible()

    rerender(
      <Collapsible onOpenChange={onOpenChange} open>
        <Collapsible.Trigger>Mostrar detalhes</Collapsible.Trigger>
        <Collapsible.Content>Detalhes</Collapsible.Content>
      </Collapsible>,
    )

    expect(screen.getByText("Detalhes")).toBeVisible()
  })

  it("keeps the content mounted while closed, so what it holds keeps its state", () => {
    render(
      <Collapsible defaultOpen>
        <Collapsible.Trigger>Filtros</Collapsible.Trigger>
        <Collapsible.Content>
          <input aria-label="Nome" />
        </Collapsible.Content>
      </Collapsible>,
    )

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Maria" } })
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }))
    fireEvent.click(screen.getByRole("button", { name: "Filtros" }))

    expect(screen.getByLabelText("Nome")).toHaveValue("Maria")
  })

  it("forwards className, style and attributes to the root, and className to the content", () => {
    const { container } = render(
      <Collapsible className="custom" data-testid="root" style={{ marginTop: spacing[8] }}>
        <Collapsible.Content className="inner">Conteúdo</Collapsible.Content>
      </Collapsible>,
    )

    expect(container.firstChild).toHaveClass("custom")
    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
    expect(screen.getByTestId("root")).toBeInTheDocument()
    expect(screen.getByText("Conteúdo").parentElement).toHaveClass("inner")
  })

  it("makes the closed content inert and leaves it clickable again when it opens", () => {
    renderCollapsible()

    const outer = screen.getByText("Detalhes").parentElement?.parentElement as HTMLElement

    expect(outer).toHaveAttribute("inert")

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalhes" }))

    expect(outer).not.toHaveAttribute("inert")
  })

  it("clips the content while it slides and leaves it unclipped once it is open and settled", () => {
    renderCollapsible({ defaultOpen: true })

    const inner = screen.getByText("Detalhes").parentElement as HTMLElement
    const outer = inner.parentElement as HTMLElement

    expect(inner).toHaveStyle({ overflow: "visible" })

    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalhes" }))

    expect(inner).toHaveStyle({ overflow: "hidden" })

    fireEvent.transitionEnd(outer)
    fireEvent.click(screen.getByRole("button", { name: "Mostrar detalhes" }))

    expect(inner).toHaveStyle({ overflow: "hidden" })

    fireEvent.transitionEnd(outer)

    expect(inner).toHaveStyle({ overflow: "visible" })
  })

  it("throws when the trigger is used outside a Collapsible", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})

    expect(() => render(<Collapsible.Trigger>Sozinho</Collapsible.Trigger>)).toThrow(/inside a Collapsible/)

    consoleError.mockRestore()
  })
})
