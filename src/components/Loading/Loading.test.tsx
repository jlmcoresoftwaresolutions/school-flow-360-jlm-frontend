import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Loading } from "./Loading"

describe("Loading", () => {
  it("renders into document.body via a portal", () => {
    render(<Loading />)

    const element = screen.getByRole("status")

    expect(element.parentElement).toBe(document.body)
  })

  it("uses a default accessible label when none is provided", () => {
    render(<Loading />)

    expect(screen.getByRole("status", { name: "Carregando..." })).toBeInTheDocument()
  })

  it("uses a custom accessible label when provided", () => {
    render(<Loading label="Enviando formulário..." />)

    expect(screen.getByRole("status", { name: "Enviando formulário..." })).toBeInTheDocument()
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
