import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PageHeader } from "./PageHeader"

describe("PageHeader", () => {
  it("renders the title as the page's level-one heading", () => {
    render(<PageHeader title="Minha Unidade" />)

    expect(screen.getByRole("heading", { level: 1, name: "Minha Unidade" })).toBeInTheDocument()
  })

  it("renders the description below the title when given", () => {
    render(<PageHeader description="Visão geral da sua organização." title="Minha Unidade" />)

    expect(screen.getByText("Visão geral da sua organização.")).toBeInTheDocument()
  })

  it("renders neither description nor icon when not given", () => {
    const { container } = render(<PageHeader title="Minha Unidade" />)

    expect(container.querySelector("p")).not.toBeInTheDocument()
    expect(container.querySelector("svg")).not.toBeInTheDocument()
  })

  it("renders the icon before the title when given", () => {
    const { container } = render(<PageHeader icon="building-outline" title="Minha Unidade" />)

    const header = container.firstElementChild
    expect(header?.firstElementChild?.querySelector("svg")).toBeInTheDocument()
  })

  it("forwards className and style to the root header", () => {
    const { container } = render(<PageHeader className="custom" style={{ margin: "4px" }} title="Minha Unidade" />)

    expect(container.firstElementChild).toHaveClass("custom")
    expect(container.firstElementChild).toHaveStyle({ margin: "4px" })
  })
})
