import { describe, expect, it } from "vitest"

import { hexToRgba } from "./colors"

describe("hexToRgba", () => {
  it("converts a 6-digit hex color to an rgba string", () => {
    expect(hexToRgba("#4B87D6", 0.5)).toBe("rgba(75, 135, 214, 0.5)")
  })

  it("converts a 3-digit shorthand hex color to an rgba string", () => {
    expect(hexToRgba("#0f0", 1)).toBe("rgba(0, 255, 0, 1)")
  })

  it("works without a leading #", () => {
    expect(hexToRgba("FFFFFF", 0.1)).toBe("rgba(255, 255, 255, 0.1)")
  })
})
