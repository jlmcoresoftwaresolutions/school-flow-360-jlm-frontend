import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { FieldLabel } from "./FieldLabel"

describe("FieldLabel", () => {
  it("renders a label linked to the field through htmlFor", () => {
    render(
      <>
        <FieldLabel htmlFor="nome">Nome</FieldLabel>
        <input id="nome" />
      </>,
    )

    expect(screen.getByLabelText("Nome")).toHaveAttribute("id", "nome")
  })

  it("adds a decorative asterisk when required", () => {
    render(
      <FieldLabel htmlFor="nome" required>
        Nome
      </FieldLabel>,
    )

    expect(screen.getByText("*")).toHaveAttribute("aria-hidden", "true")
  })

  it("keeps the field's accessible name free of the asterisk", () => {
    render(
      <>
        <FieldLabel htmlFor="nome" required>
          Nome
        </FieldLabel>
        <input id="nome" required />
      </>,
    )

    expect(screen.getByRole("textbox", { name: "Nome" })).toBeInTheDocument()
  })

  it("has no asterisk when not required", () => {
    render(<FieldLabel htmlFor="nome">Nome</FieldLabel>)

    expect(screen.queryByText("*")).not.toBeInTheDocument()
  })

  it("forwards className and style", () => {
    render(
      <FieldLabel className="custom" htmlFor="nome" style={{ margin: "4px" }}>
        Nome
      </FieldLabel>,
    )

    expect(screen.getByText("Nome")).toHaveClass("custom")
    expect(screen.getByText("Nome")).toHaveStyle({ margin: "4px" })
  })
})
