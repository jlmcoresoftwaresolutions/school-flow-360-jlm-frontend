import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { colors, shadows, spacing, translucency, typography } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

import { Tag } from "./Tag"

describe("Tag", () => {
  it("renders children inside a span", () => {
    render(<Tag>Novo</Tag>)

    const element = screen.getByText("Novo")

    expect(element.tagName).toBe("SPAN")
  })

  it("defaults to the default color", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ backgroundColor: colors.neutral[900] })
  })

  it("applies the brand color styles", () => {
    render(<Tag color="brand">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ backgroundColor: colors.primary[500] })
  })

  it("applies the danger color styles", () => {
    render(<Tag color="danger">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ backgroundColor: colors.danger[500] })
  })

  it("applies the inverse color's visible border", () => {
    render(<Tag color="inverse">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ border: `1px solid ${colors.neutral[200]}` })
  })

  it("applies the textColor prop, overriding the color/variant default", () => {
    render(
      <Tag color="success" textColor="#8b4513" variant="soft">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({ color: "#8b4513" })
  })

  it("defaults to the solid variant", () => {
    render(<Tag color="brand">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ backgroundColor: colors.primary[500] })
  })

  it("applies a transparent background and colored border/text for the outlined variant", () => {
    render(
      <Tag color="brand" variant="outlined">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      backgroundColor: "rgba(0, 0, 0, 0)",
      border: `1px solid ${colors.primary[500]}`,
      color: colors.primary[500],
    })
  })

  it("applies a light tint background and a darker, matching-border color for the soft variant", () => {
    render(
      <Tag color="success" variant="soft">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      backgroundColor: colors.success[50],
      border: `1px solid ${colors.success[50]}`,
      color: colors.success[700],
    })
  })

  it("has a drop shadow by default", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.getByText("Novo")).not.toHaveStyle({ boxShadow: shadows.none })
  })

  it("removes the drop shadow when elevated is false", () => {
    render(<Tag elevated={false}>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ boxShadow: shadows.none })
  })

  it("does not stretch to fill a flex container by default", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ alignSelf: "flex-start" })
  })

  it("defaults to the sm padding", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ padding: `${spacing[4]} ${spacing[12]}` })
  })

  it("applies the padding prop", () => {
    render(<Tag padding="lg">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ padding: `${spacing[12]} ${spacing[20]}` })
  })

  it("defaults to a small font size and medium font weight", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({
      fontSize: `${typography.fontSize.sm}px`,
      fontWeight: typography.fontWeight.medium,
    })
  })

  it("applies the fontSize and fontWeight props", () => {
    render(
      <Tag fontSize="lg" fontWeight="bold">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      fontSize: `${typography.fontSize.lg}px`,
      fontWeight: typography.fontWeight.bold,
    })
  })

  it("applies a translucent background tinted with the color, defaulting to the medium level", () => {
    render(
      <Tag color="brand" translucent>
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      backdropFilter: translucency.medium.backdropFilter,
      backgroundColor: hexToRgba(colors.primary[500], 0.4),
    })
  })

  it("applies an explicit translucent level", () => {
    render(
      <Tag color="danger" translucent="high">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      backdropFilter: translucency.high.backdropFilter,
      backgroundColor: hexToRgba(colors.danger[500], 0.1),
    })
  })

  it("translucent overrides the variant's own background", () => {
    render(
      <Tag color="success" translucent variant="outlined">
        Novo
      </Tag>,
    )

    expect(screen.getByText("Novo")).toHaveStyle({
      backgroundColor: hexToRgba(colors.success[500], 0.4),
    })
  })

  it("does not have a click handler or button role", () => {
    render(<Tag>Novo</Tag>)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("renders the startIcon before the label", () => {
    render(<Tag startIcon={<span data-testid="start-icon" />}>Novo</Tag>)

    const tag = screen.getByText("Novo")
    const icon = screen.getByTestId("start-icon")

    expect(tag.firstChild).toBe(icon)
  })

  it("renders the endIcon after the label", () => {
    render(<Tag endIcon={<span data-testid="end-icon" />}>Novo</Tag>)

    const tag = screen.getByText("Novo")
    const icon = screen.getByTestId("end-icon")

    expect(tag.lastChild).toBe(icon)
  })

  it("applies the className passed as a prop", () => {
    render(<Tag className="custom">Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Tag style={{ marginTop: "8px" }}>Novo</Tag>)

    expect(screen.getByText("Novo")).toHaveStyle({ marginTop: "8px" })
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Tag tooltip"

    render(<Tag tooltip={tooltipText}>Novo</Tag>)

    const element = screen.getByText("Novo")

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(element)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(element)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
