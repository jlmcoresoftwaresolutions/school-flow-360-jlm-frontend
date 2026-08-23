import { fireEvent, render, screen } from "@testing-library/react"
import { Link, MemoryRouter } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { borderRadiusLevels, colors, semanticColors, typography } from "@/foundation"

import { Button } from "./Button"

describe("Button", () => {
  it("renders children inside a button", () => {
    render(<Button>Click me</Button>)

    const element = screen.getByRole("button", { name: "Click me" })

    expect(element.tagName).toBe("BUTTON")
  })

  it("defaults to type button so it doesn't submit a surrounding form", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button")).toHaveAttribute("type", "button")
  })

  it("respects an explicit type prop", () => {
    render(<Button type="submit">Enviar</Button>)

    expect(screen.getByRole("button")).toHaveAttribute("type", "submit")
  })

  it("defaults to the filled variant", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ backgroundColor: colors.primary[500] })
  })

  it("defaults to the brand color", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ backgroundColor: semanticColors.brand })
  })

  it("defaults to the low border radius", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ borderRadius: borderRadiusLevels.low })
  })

  it("applies the borderRadius prop", () => {
    render(<Button borderRadius="high">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ borderRadius: borderRadiusLevels.high })
  })

  it("applies the color prop to the filled variant", () => {
    render(<Button color="danger">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ backgroundColor: semanticColors.danger })
  })

  it("applies the color prop to the outlined variant's label and border", () => {
    render(
      <Button color="danger" variant="outlined">
        Click me
      </Button>,
    )

    expect(screen.getByRole("button")).toHaveStyle({
      backgroundColor: colors.neutral[0],
      borderColor: semanticColors.danger,
      color: semanticColors.danger,
    })
  })

  it("applies the color prop to the link variant's label", () => {
    render(
      <Button color="danger" variant="link">
        Click me
      </Button>,
    )

    expect(screen.getByRole("button")).toHaveStyle({ background: "transparent", color: semanticColors.danger })
  })

  it("applies the outlined variant styles", () => {
    render(<Button variant="outlined">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ color: colors.primary[500] })
  })

  it("applies the link variant styles", () => {
    render(<Button variant="link">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ padding: "0" })
  })

  it("defaults to the medium size", () => {
    render(<Button>Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ fontSize: `${typography.fontSize.md}px` })
  })

  it("applies the small size styles", () => {
    render(<Button size="small">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ fontSize: `${typography.fontSize.sm}px` })
  })

  it("applies the large size styles", () => {
    render(<Button size="large">Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ fontSize: `${typography.fontSize.lg}px` })
  })

  it("renders the startIcon before the label", () => {
    render(<Button startIcon={<span data-testid="start-icon" />}>Click me</Button>)

    const button = screen.getByRole("button")
    const icon = screen.getByTestId("start-icon")

    expect(button.firstChild).toBe(icon)
  })

  it("renders the endIcon after the label", () => {
    render(<Button endIcon={<span data-testid="end-icon" />}>Click me</Button>)

    const button = screen.getByRole("button")
    const icon = screen.getByTestId("end-icon")

    expect(button.lastChild).toBe(icon)
  })

  it("renders as a native anchor via the as prop, forwarding href and dropping the type attribute", () => {
    render(
      <Button as="a" href="https://example.com">
        Click me
      </Button>,
    )

    const element = screen.getByRole("link", { name: "Click me" })

    expect(element.tagName).toBe("A")
    expect(element).toHaveAttribute("href", "https://example.com")
    expect(element).not.toHaveAttribute("type")
  })

  it("renders as a react-router Link via the as prop, forwarding the to prop", () => {
    render(
      <MemoryRouter>
        <Button as={Link} to="/experimental">
          Click me
        </Button>
      </MemoryRouter>,
    )

    const element = screen.getByRole("link", { name: "Click me" })

    expect(element.tagName).toBe("A")
    expect(element).toHaveAttribute("href", "/experimental")
  })

  it("applies the className passed as a prop", () => {
    render(<Button className="custom">Click me</Button>)

    expect(screen.getByRole("button")).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    render(<Button style={{ marginTop: "8px" }}>Click me</Button>)

    expect(screen.getByRole("button")).toHaveStyle({ marginTop: "8px" })
  })

  it("fires onClick when clicked", () => {
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Click me</Button>)

    fireEvent.click(screen.getByRole("button"))

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn()

    render(
      <Button disabled onClick={onClick}>
        Click me
      </Button>,
    )

    fireEvent.click(screen.getByRole("button"))

    expect(onClick).not.toHaveBeenCalled()
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Button tooltip"

    render(<Button tooltip={tooltipText}>Click me</Button>)

    const element = screen.getByRole("button")

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(element)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(element)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
