import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { opacity } from "@/foundation"

import { Icon } from "./Icon"

describe("Icon", () => {
  it("renders an svg element", () => {
    const { container } = render(<Icon name="home" />)

    expect(container.querySelector("svg")).toBeInTheDocument()
  })

  it("applies the className passed as a prop", () => {
    const { container } = render(<Icon className="custom" name="home" />)

    const wrapper = container.firstChild

    expect(wrapper).toHaveClass("custom")
  })

  it("applies inline styles passed via the style prop", () => {
    const { container } = render(<Icon name="home" style={{ opacity: opacity.disabled }} />)

    const wrapper = container.firstChild

    expect(wrapper).toHaveStyle({ opacity: opacity.disabled })
  })

  it("shows the tooltip on hover and hides it on mouse leave", () => {
    const tooltipText = "Icon tooltip"

    const { container } = render(<Icon name="home" tooltip={tooltipText} />)

    const wrapper = container.firstChild as Element

    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()

    fireEvent.mouseEnter(wrapper)
    expect(screen.getByText(tooltipText)).toBeInTheDocument()

    fireEvent.mouseLeave(wrapper)
    expect(screen.queryByText(tooltipText)).not.toBeInTheDocument()
  })
})
