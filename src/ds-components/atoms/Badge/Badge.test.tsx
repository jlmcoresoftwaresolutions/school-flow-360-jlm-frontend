import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { colors } from "@/foundation"

import { Badge } from "./Badge"

describe("Badge", () => {
  it("renders its children inside a span", () => {
    render(<Badge>Ativa</Badge>)

    expect(screen.getByText("Ativa").tagName).toBe("SPAN")
  })

  it("defaults to the neutral tone", () => {
    render(<Badge>Inativa</Badge>)

    expect(screen.getByText("Inativa")).toHaveStyle({
      backgroundColor: colors.neutral[100],
      color: colors.neutral[700],
    })
  })

  it("applies the success tone", () => {
    render(<Badge tone="success">Ativa</Badge>)

    expect(screen.getByText("Ativa")).toHaveStyle({ backgroundColor: colors.success[50], color: colors.success[700] })
  })

  it("applies the danger tone", () => {
    render(<Badge tone="danger">Com restrição</Badge>)

    expect(screen.getByText("Com restrição")).toHaveStyle({
      backgroundColor: colors.danger[50],
      color: colors.danger[700],
    })
  })

  it("shows a decorative dot by default, hidden from assistive tech", () => {
    render(<Badge tone="warning">Pendente</Badge>)

    const dot = screen.getByText("Pendente").firstElementChild

    expect(dot).toHaveAttribute("aria-hidden", "true")
    expect(dot).toHaveStyle({ backgroundColor: colors.warning[500] })
  })

  it("omits the dot when dot is false", () => {
    render(<Badge dot={false}>Pendente</Badge>)

    expect(screen.getByText("Pendente").firstElementChild).toBeNull()
  })

  it("forwards className and style to the root element", () => {
    render(
      <Badge className="custom" style={{ margin: "4px" }}>
        Ativa
      </Badge>,
    )

    expect(screen.getByText("Ativa")).toHaveClass("custom")
    expect(screen.getByText("Ativa")).toHaveStyle({ margin: "4px" })
  })

  it("shows the tooltip while hovering and hides it afterwards", () => {
    render(<Badge tooltip="Aguardando configuração">Pendente</Badge>)

    const badge = screen.getByText("Pendente")
    fireEvent.mouseEnter(badge)

    expect(screen.getByText("Aguardando configuração")).toBeInTheDocument()

    fireEvent.mouseLeave(badge)

    expect(screen.queryByText("Aguardando configuração")).not.toBeInTheDocument()
  })
})
