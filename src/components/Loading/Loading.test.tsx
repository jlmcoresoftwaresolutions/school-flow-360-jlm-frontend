import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Loading } from "./Loading"

describe("Loading", () => {
  it("renders into document.body via a portal", () => {
    render(<Loading />)

    const element = screen.getByRole("status")

    expect(element.parentElement).toBe(document.body)
  })

  it("has 'Carregando...' as its accessible label", () => {
    render(<Loading />)

    expect(screen.getByRole("status", { name: "Carregando..." })).toBeInTheDocument()
  })

  it("uses label as its accessible label when given", () => {
    render(<Loading label="Loading..." />)

    expect(screen.getByRole("status", { name: "Loading..." })).toBeInTheDocument()
  })

  it("shows no visible text by default", () => {
    render(<Loading />)

    expect(screen.getByRole("status").textContent).toBe("")
  })

  it("shows message under the spinner, inside the status region", () => {
    render(<Loading message="Conectando ao servidor." />)

    expect(screen.getByRole("status")).toHaveTextContent("Conectando ao servidor.")
  })

  it("applies the className passed as a prop", () => {
    render(<Loading className="custom" />)

    expect(screen.getByRole("status")).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Loading style={{ opacity: 0.9 }} />)

    expect(screen.getByRole("status")).toHaveStyle({ opacity: 0.9 })
  })
})
