import { describe, expect, it } from "vitest"

import { getContrastRatio, hexToRgb, hexToRgba, rgbToHex } from "./colors"

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

describe("hexToRgb", () => {
  it("converts a 6-digit hex color to an RgbColor", () => {
    expect(hexToRgb("#4B87D6")).toEqual({ b: 214, g: 135, r: 75 })
  })

  it("works without a leading #", () => {
    expect(hexToRgb("FFFFFF")).toEqual({ b: 255, g: 255, r: 255 })
  })

  it("returns null for a 3-digit shorthand hex, which is not supported here", () => {
    expect(hexToRgb("#0f0")).toBeNull()
  })

  it("returns null for an invalid or incomplete hex value", () => {
    expect(hexToRgb("#4B87D")).toBeNull()
    expect(hexToRgb("not-a-color")).toBeNull()
  })
})

describe("rgbToHex", () => {
  it("converts an RgbColor to an uppercase 6-digit hex string", () => {
    expect(rgbToHex({ b: 214, g: 135, r: 75 })).toBe("#4B87D6")
  })

  it("pads single-digit hex channels with a leading zero", () => {
    expect(rgbToHex({ b: 0, g: 0, r: 0 })).toBe("#000000")
  })

  it("clamps channel values outside the 0-255 range", () => {
    expect(rgbToHex({ b: -10, g: 300, r: 128 })).toBe("#80FF00")
  })
})

describe("getContrastRatio", () => {
  it("gives 21 for black on white and 1 for a color on itself", () => {
    expect(getContrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
    expect(getContrastRatio("#4B87D6", "#4B87D6")).toBeCloseTo(1, 5)
  })

  it("doesn't depend on the order of the colors", () => {
    expect(getContrastRatio("#FFFFFF", "#00285B")).toBeCloseTo(getContrastRatio("#00285B", "#FFFFFF")!, 10)
  })

  it("matches the WCAG values of known pairs", () => {
    // White on the brand's navy passes AA comfortably; on a light yellow it fails.
    expect(getContrastRatio("#00285B", "#FFFFFF")).toBeGreaterThan(4.5)
    expect(getContrastRatio("#FFFF00", "#FFFFFF")).toBeLessThan(1.1)
    expect(getContrastRatio("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2)
  })

  it("gives null for a color that isn't a valid hex", () => {
    expect(getContrastRatio("#12", "#FFFFFF")).toBeNull()
    expect(getContrastRatio("#FFFFFF", "azul")).toBeNull()
  })
})
