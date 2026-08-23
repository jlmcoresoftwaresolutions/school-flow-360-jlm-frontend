import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { spacing } from "@/foundation"

import { Switch } from "./Switch"

describe("Switch", () => {
  it("renders a checkbox input", () => {
    render(<Switch label="Notificações por e-mail" />)

    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("renders the label associated with the switch", () => {
    render(<Switch label="Notificações por e-mail" />)

    const input = screen.getByLabelText("Notificações por e-mail")

    expect(input).toBeInTheDocument()
    expect(input.tagName).toBe("INPUT")
  })

  it("is off by default", () => {
    render(<Switch label="Notificações por e-mail" />)

    expect(screen.getByRole("checkbox")).not.toBeChecked()
  })

  it("respects the defaultChecked attribute", () => {
    render(<Switch defaultChecked label="Notificações por e-mail" />)

    expect(screen.getByRole("checkbox")).toBeChecked()
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

    render(<Switch label="Financeiro" onChange={handleChange} />)

    const input = screen.getByRole("checkbox")

    fireEvent.click(input)

    expect(input).toBeChecked()
    expect(handleChange).toHaveBeenCalled()
  })

  it("respects the disabled attribute", () => {
    render(<Switch disabled label="Financeiro" />)

    expect(screen.getByRole("checkbox")).toBeDisabled()
  })
})
