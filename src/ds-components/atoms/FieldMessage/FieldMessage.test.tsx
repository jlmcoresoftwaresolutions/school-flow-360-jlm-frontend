import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { colors } from "@/foundation"

import { FieldMessage } from "./FieldMessage"

describe("FieldMessage", () => {
  it("renders nothing without an error or helper text", () => {
    const { container } = render(<FieldMessage id="campo-mensagem" />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the helper text with the given id", () => {
    render(<FieldMessage helperText="Use o nome oficial." id="campo-mensagem" />)

    expect(screen.getByText("Use o nome oficial.")).toHaveAttribute("id", "campo-mensagem")
  })

  it("renders the error in place of the helper text", () => {
    render(<FieldMessage error="Campo obrigatório." helperText="Use o nome oficial." id="campo-mensagem" />)

    expect(screen.getByText("Campo obrigatório.")).toHaveAttribute("id", "campo-mensagem")
    expect(screen.queryByText("Use o nome oficial.")).not.toBeInTheDocument()
  })

  // The 700 shades are the ones that reach WCAG AA contrast at this size (see FieldMessage.styles.ts).
  it("paints the error in the dark danger shade", () => {
    render(<FieldMessage error="Campo obrigatório." id="campo-mensagem" />)

    expect(screen.getByText("Campo obrigatório.")).toHaveStyle({ color: colors.danger[700] })
  })

  it("paints the helper text in the dark neutral shade", () => {
    render(<FieldMessage helperText="Use o nome oficial." id="campo-mensagem" />)

    expect(screen.getByText("Use o nome oficial.")).toHaveStyle({ color: colors.neutral[700] })
  })

  it("forwards className and style", () => {
    render(<FieldMessage className="custom" helperText="Ajuda" id="campo-mensagem" style={{ margin: "4px" }} />)

    expect(screen.getByText("Ajuda")).toHaveClass("custom")
    expect(screen.getByText("Ajuda")).toHaveStyle({ margin: "4px" })
  })
})
