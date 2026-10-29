import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Tooltip } from "./Tooltip"

// jsdom has no layout: the balloon measures 0x0, and the viewport is window.innerWidth x innerHeight.
describe("Tooltip", () => {
  it("renders its content into document.body via a portal, as a tooltip", () => {
    render(
      <Tooltip x={10} y={20}>
        Hint
      </Tooltip>,
    )

    const element = screen.getByRole("tooltip")

    expect(element).toHaveTextContent("Hint")
    expect(element.parentElement).toBe(document.body)
  })

  it("sits just past the given x/y coordinates when following the cursor", () => {
    render(
      <Tooltip x={10} y={20}>
        Hint
      </Tooltip>,
    )

    expect(screen.getByRole("tooltip")).toHaveStyle({ left: "26px", top: "36px" })
  })

  describe("anchored to an element", () => {
    it("sits centered below the element", () => {
      render(<Tooltip anchorRect={{ bottom: 120, left: 200, right: 240, top: 100 }}>Hint</Tooltip>)

      expect(screen.getByRole("tooltip")).toHaveStyle({ left: "220px", top: "128px", visibility: "visible" })
    })

    it("opens above the element when there is no room below", () => {
      const top = window.innerHeight - 20
      render(<Tooltip anchorRect={{ bottom: window.innerHeight, left: 200, right: 240, top }}>Hint</Tooltip>)

      expect(screen.getByRole("tooltip")).toHaveStyle({ top: `${top - 8}px` })
    })

    it("stays inside the viewport next to its edges", () => {
      const { rerender } = render(
        <Tooltip anchorRect={{ bottom: 40, left: window.innerWidth - 4, right: window.innerWidth, top: 20 }}>
          Hint
        </Tooltip>,
      )
      expect(screen.getByRole("tooltip")).toHaveStyle({ left: `${window.innerWidth - 8}px` })

      rerender(<Tooltip anchorRect={{ bottom: 40, left: 0, right: 4, top: 20 }}>Hint</Tooltip>)
      expect(screen.getByRole("tooltip")).toHaveStyle({ left: "8px" })
    })
  })
})
