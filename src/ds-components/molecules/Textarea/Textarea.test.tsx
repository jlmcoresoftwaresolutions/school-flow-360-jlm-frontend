import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, shadows, spacing } from "@/foundation"

import { Textarea } from "./Textarea"

describe("Textarea", () => {
  it("renders a textarea", () => {
    render(<Textarea />)

    expect(screen.getByRole("textbox").tagName).toBe("TEXTAREA")
  })

  it("renders the title as a label associated with the textarea", () => {
    render(<Textarea title="Observações" />)

    const textarea = screen.getByLabelText("Observações")

    expect(textarea).toBeInTheDocument()
    expect(textarea.tagName).toBe("TEXTAREA")
  })

  it("does not render a label when title is not provided", () => {
    render(<Textarea />)

    expect(document.querySelector("label")).not.toBeInTheDocument()
  })

  it("renders helperText below the textarea", () => {
    render(<Textarea helperText="Visível apenas para a coordenação." />)

    expect(screen.getByText("Visível apenas para a coordenação.")).toBeInTheDocument()
  })

  it("does not render helperText when it is not provided", () => {
    const { container } = render(<Textarea />)

    expect(container.querySelector("span")).not.toBeInTheDocument()
  })

  it("applies the className passed as a prop to the wrapper", () => {
    const { container } = render(<Textarea className="custom" />)

    expect(container.firstChild).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop to the wrapper", () => {
    const { container } = render(<Textarea style={{ marginTop: spacing[8] }} />)

    expect(container.firstChild).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards a ref to the underlying textarea element", () => {
    const ref = createRef<HTMLTextAreaElement>()

    render(<Textarea ref={ref} />)

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
  })

  it("forwards native textarea props like placeholder, value, onChange and rows", () => {
    const handleChange = vi.fn()

    render(<Textarea onChange={handleChange} placeholder="Type here" rows={6} value="hello" />)

    const textarea = screen.getByPlaceholderText("Type here")

    expect(textarea).toHaveValue("hello")
    expect(textarea).toHaveAttribute("rows", "6")

    fireEvent.change(textarea, { target: { value: "world" } })

    expect(handleChange).toHaveBeenCalled()
  })

  it("defaults to the low border radius", () => {
    render(<Textarea placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).toHaveStyle({ borderRadius: borderRadiusLevels.low })
  })

  it("applies the borderRadius prop", () => {
    render(<Textarea borderRadius="high" placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("has a drop shadow by default", () => {
    render(<Textarea placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    render(<Textarea elevated={false} placeholder="Amount" />)

    expect(screen.getByPlaceholderText("Amount")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("respects the disabled attribute", () => {
    render(<Textarea disabled title="Observações" />)

    expect(screen.getByLabelText("Observações")).toBeDisabled()
  })
})
