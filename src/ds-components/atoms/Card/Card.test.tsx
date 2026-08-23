import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { borderRadiusLevels, colors, semanticColors, spacing } from "@/foundation"

import { Card } from "./Card"

describe("Card", () => {
  it("renders children inside a div", () => {
    render(<Card>Content</Card>)

    const element = screen.getByText("Content")

    expect(element.tagName).toBe("DIV")
  })

  it("defaults to the medium border radius", () => {
    render(<Card>Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ borderRadius: borderRadiusLevels.medium })
  })

  it("applies the borderRadius prop", () => {
    render(<Card borderRadius="high">Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("applies the full borderRadius level", () => {
    render(<Card borderRadius="full">Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ borderRadius: borderRadiusLevels.full })
  })

  it("defaults to the inverse background color", () => {
    render(<Card>Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ backgroundColor: semanticColors.inverse })
  })

  it("applies the color prop", () => {
    render(<Card color="brand">Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ backgroundColor: semanticColors.brand })
  })

  it("applies the className passed as a prop", () => {
    render(<Card className="custom">Content</Card>)

    const element = screen.getByText("Content")

    expect(element).toHaveClass("custom")
  })

  it("applies a default padding of 12px", () => {
    render(<Card>Content</Card>)

    const element = screen.getByText("Content")

    expect(element).toHaveStyle({ padding: spacing[12] })
  })

  it("removes the border by default (elevated)", () => {
    render(<Card>Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({ borderStyle: "none" })
  })

  it("keeps the border when elevated is false", () => {
    render(<Card elevated={false}>Content</Card>)

    expect(screen.getByText("Content")).toHaveStyle({
      borderColor: colors.neutral[100],
      borderStyle: "solid",
      borderWidth: "1px",
    })
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Card style={{ padding: spacing[24] }}>Content</Card>)

    const element = screen.getByText("Content")

    expect(element).toHaveStyle({ padding: spacing[24] })
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Card tooltip"

    render(<Card tooltip={tooltipText}>Content</Card>)

    const element = screen.getByText("Content")

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(element)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(element)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
