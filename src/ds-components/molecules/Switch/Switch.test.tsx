import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { spacing } from "@/foundation"

import { Switch } from "./Switch"

describe("Switch", () => {
  it("renders a switch input", () => {
    render(<Switch label="Notificações por e-mail" />)

    expect(screen.getByRole("switch")).toBeInTheDocument()
  })

  it("renders the label associated with the switch", () => {
    render(<Switch label="Notificações por e-mail" />)

    const input = screen.getByLabelText("Notificações por e-mail")

    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
  })

  it("is off by default", () => {
    render(<Switch label="Notificações por e-mail" />)

    expect(screen.getByRole("switch")).not.toBeChecked()
  })

  it("respects the defaultChecked prop", () => {
    render(<Switch defaultChecked label="Notificações por e-mail" />)

    expect(screen.getByRole("switch")).toBeChecked()
  })

  it("renders helperText below the switch", () => {
    render(<Switch helperText="Ativa o módulo financeiro." label="Financeiro" />)

    expect(screen.getByText("Ativa o módulo financeiro.")).toBeInTheDocument()
  })

  it("does not render helperText when it is not provided", () => {
    render(<Switch label="Financeiro" />)

    expect(screen.queryByText("Ativa o módulo financeiro.")).not.toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Switch className="custom" label="Financeiro" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Switch label="Financeiro" style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>()

    render(<Switch label="Financeiro" ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it("toggles when clicked and forwards onChange", () => {
    const handleChange = vi.fn()

    render(<Switch checked={false} label="Financeiro" onChange={handleChange} />)

    fireEvent.click(screen.getByRole("switch"))

    expect(handleChange).toHaveBeenCalledWith(expect.anything(), true)
  })

  it("respects the checked prop for controlled usage", () => {
    render(<Switch checked label="Financeiro" onChange={vi.fn()} />)

    expect(screen.getByRole("switch")).toBeChecked()
  })

  it("respects the disabled prop", () => {
    render(<Switch disabled label="Financeiro" />)

    expect(screen.getByRole("switch")).toBeDisabled()
  })
})
