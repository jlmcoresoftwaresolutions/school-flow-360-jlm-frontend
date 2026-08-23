import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Tooltip } from "./Tooltip"

describe("Tooltip", () => {
  it("renders its content into document.body via a portal", () => {
    render(
      <Tooltip x={10} y={20}>
        Hint
      </Tooltip>,
    )

    const element = screen.getByText("Hint")

    expect(element.parentElement).toBe(document.body)
  })

  it("positions itself relative to the given x/y coordinates", () => {
    render(
      <Tooltip x={10} y={20}>
        Hint
      </Tooltip>,
    )

    const element = screen.getByText("Hint")

    expect(element).toHaveStyle({ left: "26px", top: "36px" })
  })
})
