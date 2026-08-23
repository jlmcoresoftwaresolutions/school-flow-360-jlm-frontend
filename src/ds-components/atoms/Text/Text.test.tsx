import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { spacing, typography } from "@/foundation"

import { Text } from "./Text"

describe("Text", () => {
  it("renders children inside a paragraph by default", () => {
    render(<Text>Hello</Text>)

    const element = screen.getByText("Hello")

    expect(element.tagName).toBe("P")
  })

  it("renders the tag passed via the as prop", () => {
    render(<Text as="h1">Heading</Text>)

    const element = screen.getByText("Heading")

    expect(element.tagName).toBe("H1")
  })

  it("applies the className passed as a prop", () => {
    render(<Text className="custom">Styled</Text>)

    const element = screen.getByText("Styled")

    expect(element).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Text style={{ marginTop: spacing[8] }}>Inline</Text>)

    const element = screen.getByText("Inline")

    expect(element).toHaveStyle({ marginTop: spacing[8] })
  })

  it("forwards attributes specific to the tag passed via the as prop", () => {
    const url = "https://example.com"

    render(
      <Text as="a" href={url}>
        Link
      </Text>,
    )

    const element = screen.getByText("Link")

    expect(element.tagName).toBe("A")
    expect(element).toHaveAttribute("href", url)
  })

  it("applies bold font weight when the bold prop is set", () => {
    render(<Text bold>Bold</Text>)

    expect(screen.getByText("Bold")).toHaveStyle({ fontWeight: typography.fontWeight.bold })
  })

  it("applies semibold font weight when the semibold prop is set", () => {
    render(<Text semibold>Semibold</Text>)

    expect(screen.getByText("Semibold")).toHaveStyle({ fontWeight: typography.fontWeight.semibold })
  })

  it("bold takes precedence over semibold when both are set", () => {
    render(
      <Text bold semibold>
        Both
      </Text>,
    )

    expect(screen.getByText("Both")).toHaveStyle({ fontWeight: typography.fontWeight.bold })
  })

  it("applies superbold font weight when the superbold prop is set", () => {
    render(<Text superbold>Superbold</Text>)

    expect(screen.getByText("Superbold")).toHaveStyle({ fontWeight: typography.fontWeight.superbold })
  })

  it("superbold takes precedence over bold and semibold when all three are set", () => {
    render(
      <Text bold semibold superbold>
        All three
      </Text>,
    )

    expect(screen.getByText("All three")).toHaveStyle({ fontWeight: typography.fontWeight.superbold })
  })

  it("applies an explicit fontWeight prop", () => {
    render(<Text fontWeight="semibold">Weighted</Text>)

    expect(screen.getByText("Weighted")).toHaveStyle({ fontWeight: typography.fontWeight.semibold })
  })

  it("applies text-transform: uppercase when the uppercase prop is set", () => {
    render(<Text uppercase>Uppercase</Text>)

    expect(screen.getByText("Uppercase")).toHaveStyle({ textTransform: "uppercase" })
  })

  it("applies text-transform: lowercase when the lowercase prop is set", () => {
    render(<Text lowercase>Lowercase</Text>)

    expect(screen.getByText("Lowercase")).toHaveStyle({ textTransform: "lowercase" })
  })

  it("applies text-transform: capitalize when the capitalize prop is set", () => {
    render(<Text capitalize>Capitalize</Text>)

    expect(screen.getByText("Capitalize")).toHaveStyle({ textTransform: "capitalize" })
  })

  it("uppercase takes precedence over lowercase and capitalize when multiple are set", () => {
    render(
      <Text capitalize lowercase uppercase>
        All three
      </Text>,
    )

    expect(screen.getByText("All three")).toHaveStyle({ textTransform: "uppercase" })
  })

  it("lowercase takes precedence over capitalize when both are set", () => {
    render(
      <Text capitalize lowercase>
        Both
      </Text>,
    )

    expect(screen.getByText("Both")).toHaveStyle({ textTransform: "lowercase" })
  })

  it("applies a display size above 4xl", () => {
    render(<Text fontSize="7xl">Display</Text>)

    expect(screen.getByText("Display")).toHaveStyle({
      fontSize: `${typography.fontSize["7xl"]}px`,
      lineHeight: `${typography.lineHeight["7xl"]}`,
    })
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Helpful hint"

    render(<Text tooltip={tooltipText}>Hover me</Text>)

    const element = screen.getByText("Hover me")

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(element)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(element)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
