import { fireEvent, render, screen } from "@testing-library/react"
import { createRef } from "react"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, colors, shadows, spacing } from "@/foundation"

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

  describe("character counter", () => {
    it("shows the typed and the maximum characters while the textarea is focused, hiding them otherwise", () => {
      render(<Textarea defaultValue="olá" maxLength={20} placeholder="Notes" />)
      const textarea = screen.getByPlaceholderText("Notes")

      expect(screen.getByText("0/20")).not.toBeVisible()

      fireEvent.focus(textarea)
      expect(screen.getByText("3/20")).toBeVisible()

      fireEvent.change(textarea, { target: { value: "olá, mundo" } })
      expect(screen.getByText("10/20")).toBeVisible()

      fireEvent.blur(textarea)
      expect(screen.getByText("10/20")).not.toBeVisible()
    })

    it("sits on the same line as the helper text, on its right", () => {
      render(<Textarea helperText="Até 20 caracteres." maxLength={20} placeholder="Notes" />)

      const helper = screen.getByText("Até 20 caracteres.")
      const counter = screen.getByText("0/20")
      const line = counter.parentElement as HTMLElement

      expect(line).toContainElement(helper)
      expect(line).toHaveStyle({ alignItems: "center", display: "flex", gap: spacing[8] })
      expect(counter).toHaveStyle({ marginLeft: "auto" })
      // The helper text gives way to the counter instead of pushing it out.
      expect(helper.parentElement).toHaveStyle({ minWidth: "0px" })
      expect(counter).toHaveStyle({ flexShrink: "0" })
    })

    it("keeps the counter on the line when there is an error instead of the helper text", () => {
      render(<Textarea error="Texto demais." helperText="Ajuda" maxLength={20} placeholder="Notes" />)

      expect(screen.getByText("Texto demais.").parentElement?.parentElement).toBe(
        screen.getByText("0/20").parentElement,
      )
      expect(screen.queryByText("Ajuda")).not.toBeInTheDocument()
    })

    it("follows the value when the parent controls the textarea", () => {
      const { rerender } = render(<Textarea maxLength={20} onChange={vi.fn()} placeholder="Notes" value="abc" />)

      fireEvent.focus(screen.getByPlaceholderText("Notes"))
      expect(screen.getByText("3/20")).toBeVisible()

      rerender(<Textarea maxLength={20} onChange={vi.fn()} placeholder="Notes" value="abcde" />)
      expect(screen.getByText("5/20")).toBeVisible()
    })

    it("turns red at the limit", () => {
      render(<Textarea defaultValue="12345" maxLength={5} placeholder="Notes" />)

      fireEvent.focus(screen.getByPlaceholderText("Notes"))

      expect(screen.getByText("5/5")).toHaveStyle({ color: colors.danger[700] })
    })

    it("is not rendered without a maxLength", () => {
      render(<Textarea defaultValue="olá" placeholder="Notes" />)

      fireEvent.focus(screen.getByPlaceholderText("Notes"))

      expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument()
    })

    it("keeps calling the onFocus, onBlur and onChange of the parent", () => {
      const onBlur = vi.fn()
      const onChange = vi.fn()
      const onFocus = vi.fn()
      render(<Textarea maxLength={20} onBlur={onBlur} onChange={onChange} onFocus={onFocus} placeholder="Notes" />)
      const textarea = screen.getByPlaceholderText("Notes")

      fireEvent.focus(textarea)
      fireEvent.change(textarea, { target: { value: "a" } })
      fireEvent.blur(textarea)

      expect(onFocus).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onBlur).toHaveBeenCalledTimes(1)
    })

    it("limits the text natively", () => {
      render(<Textarea maxLength={20} placeholder="Notes" />)

      expect(screen.getByPlaceholderText("Notes")).toHaveAttribute("maxlength", "20")
    })
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

  it("links helperText to the textarea through aria-describedby", () => {
    render(<Textarea helperText="Visível só para a equipe." title="Observações" />)

    expect(screen.getByLabelText("Observações")).toHaveAccessibleDescription("Visível só para a equipe.")
  })

  describe("error", () => {
    it("shows the error in place of helperText and describes the textarea with it", () => {
      render(<Textarea error="Texto muito longo." helperText="Ajuda" title="Observações" />)

      expect(screen.queryByText("Ajuda")).not.toBeInTheDocument()
      expect(screen.getByLabelText("Observações")).toHaveAccessibleDescription("Texto muito longo.")
    })

    it("marks the textarea as invalid and turns its border red", () => {
      render(<Textarea error="Texto muito longo." title="Observações" />)

      expect(screen.getByLabelText("Observações")).toHaveAttribute("aria-invalid", "true")
      expect(screen.getByLabelText("Observações")).toHaveStyle({ border: `1px solid ${colors.danger[500]}` })
    })
  })

  it("marks the textarea as required and adds an asterisk to the title", () => {
    render(<Textarea title="Motivo" required />)

    expect(screen.getByRole("textbox", { name: "Motivo" })).toBeRequired()
    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })
})
