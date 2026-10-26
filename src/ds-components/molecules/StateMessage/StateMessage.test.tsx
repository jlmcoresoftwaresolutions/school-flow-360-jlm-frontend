import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { colors } from "@/foundation"

import { StateMessage } from "./StateMessage"

describe("StateMessage", () => {
  it("renders the title", () => {
    render(<StateMessage title="Nenhuma unidade cadastrada" />)

    expect(screen.getByText("Nenhuma unidade cadastrada")).toBeInTheDocument()
  })

  it("renders the description when given", () => {
    render(<StateMessage description="Cadastre a primeira unidade." title="Nenhuma unidade cadastrada" />)

    expect(screen.getByText("Cadastre a primeira unidade.")).toBeInTheDocument()
  })

  it("renders no description element when none is given", () => {
    render(<StateMessage title="Nenhuma unidade cadastrada" />)

    expect(screen.getAllByText(/.+/)).toHaveLength(1)
  })

  it("renders the action below the text", () => {
    render(<StateMessage action={<button type="button">Nova unidade</button>} title="Nenhuma unidade cadastrada" />)

    expect(screen.getByRole("button", { name: "Nova unidade" })).toBeInTheDocument()
  })

  it("defaults to the empty variant, which is not announced as an alert", () => {
    render(<StateMessage title="Nenhuma unidade cadastrada" />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("announces the error variant as an alert", () => {
    render(<StateMessage title="Não foi possível carregar" variant="error" />)

    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível carregar")
  })

  it("does not announce the restricted variant as an alert", () => {
    render(<StateMessage title="Acesso restrito" variant="restricted" />)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("tints the icon background by variant", () => {
    const { container, rerender } = render(<StateMessage title="Estado" variant="error" />)
    const iconBox = () => container.firstElementChild?.firstElementChild as HTMLElement

    expect(iconBox()).toHaveStyle({ backgroundColor: colors.danger[50] })

    rerender(<StateMessage title="Estado" variant="restricted" />)

    expect(iconBox()).toHaveStyle({ backgroundColor: colors.warning[50] })
  })

  it("lets the icon prop override the variant's icon", () => {
    const { container, rerender } = render(<StateMessage title="Estado" />)
    const defaultMarkup = container.querySelector("svg")?.outerHTML

    rerender(<StateMessage icon="search-outline" title="Estado" />)

    expect(container.querySelector("svg")?.outerHTML).not.toBe(defaultMarkup)
  })

  it("forwards className and style to the root element", () => {
    const { container } = render(<StateMessage className="custom" style={{ margin: "4px" }} title="Estado" />)

    expect(container.firstElementChild).toHaveClass("custom")
    expect(container.firstElementChild).toHaveStyle({ margin: "4px" })
  })
})
