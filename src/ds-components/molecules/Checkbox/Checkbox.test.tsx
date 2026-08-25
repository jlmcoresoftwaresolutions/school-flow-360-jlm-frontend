import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { spacing } from "@/foundation"

import { Checkbox } from "./Checkbox"

describe("Checkbox", () => {
  it("renders a checkbox input", () => {
    render(<Checkbox label="Aceito os termos" />)

    expect(screen.getByRole("checkbox")).toBeInTheDocument()
  })

  it("renders the label associated with the checkbox", () => {
    render(<Checkbox label="Aceito os termos" />)

    const checkbox = screen.getByLabelText("Aceito os termos")

    expect(checkbox).toBeInTheDocument()
    expect(checkbox.tagName).toBe("INPUT")
  })

  it("is unchecked by default", () => {
    render(<Checkbox label="Aceito os termos" />)

    expect(screen.getByRole("checkbox")).not.toBeChecked()
  })

  it("respects the defaultChecked prop", () => {
    render(<Checkbox defaultChecked label="Aceito os termos" />)

    expect(screen.getByRole("checkbox")).toBeChecked()
  })

  it("renders helperText below the checkbox", () => {
    render(<Checkbox helperText="Necessário para continuar." label="Aceito os termos" />)

    expect(screen.getByText("Necessário para continuar.")).toBeInTheDocument()
  })

  it("does not render helperText when it is not provided", () => {
    render(<Checkbox label="Aceito os termos" />)

    expect(screen.queryByText("Necessário para continuar.")).not.toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Checkbox className="custom" label="Aceito os termos" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Checkbox label="Aceito os termos" style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying input element", () => {
    const ref = createRef<HTMLInputElement>()

    render(<Checkbox label="Aceito os termos" ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLInputElement)
  })

  it("toggles when clicked and forwards onChange", () => {
    const handleChange = vi.fn()

    render(<Checkbox checked={false} label="Aceito os termos" onChange={handleChange} />)

    fireEvent.click(screen.getByRole("checkbox"))

    expect(handleChange).toHaveBeenCalledWith(expect.anything(), true)
  })

  it("respects the checked prop for controlled usage", () => {
    render(<Checkbox checked label="Aceito os termos" onChange={vi.fn()} />)

    expect(screen.getByRole("checkbox")).toBeChecked()
  })

  it("respects the disabled prop", () => {
    render(<Checkbox disabled label="Aceito os termos" />)

    expect(screen.getByRole("checkbox")).toBeDisabled()
  })

  it("defaults to the large size", () => {
    const { container } = render(<Checkbox label="Aceito os termos" />)

    expect(container.querySelector("svg")).toHaveStyle({ fontSize: spacing[24] })
  })

  it("applies the size prop", () => {
    const { container } = render(<Checkbox label="Aceito os termos" size="medium" />)

    expect(container.querySelector("svg")).toHaveStyle({ fontSize: spacing[20] })
  })
})
