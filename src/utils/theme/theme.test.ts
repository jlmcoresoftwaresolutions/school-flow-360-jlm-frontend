import { afterEach, describe, expect, it } from "vitest"

import { brandPalette, colors } from "@/foundation"
import { getContrastRatio, hexToRgb } from "@/utils/colors"

import { applySchoolColor, buildPrimaryScale, type PrimaryStep } from "./theme"

const steps = Object.keys(brandPalette).map(Number) as PrimaryStep[]

const lightness = (hex: string) => {
  const { b, g, r } = hexToRgb(hex) ?? { b: 0, g: 0, r: 0 }
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 2
}

const tint = (hex: string, alpha: number) => {
  const { b, g, r } = hexToRgb(hex) ?? { b: 0, g: 0, r: 0 }
  const blend = (channel: number) =>
    Math.round(255 + (channel - 255) * alpha)
      .toString(16)
      .padStart(2, "0")
  return `#${blend(r)}${blend(g)}${blend(b)}`
}

const rootVariable = (step: PrimaryStep) => document.documentElement.style.getPropertyValue(`--sf-primary-${step}`)

describe("buildPrimaryScale", () => {
  it("is null for something that isn't a hex color", () => {
    expect(buildPrimaryScale("blue")).toBeNull()
    expect(buildPrimaryScale("#12")).toBeNull()
  })

  it("keeps the school's color at the step nearest its lightness", () => {
    const scale = buildPrimaryScale("#1F406A")

    expect(scale?.[800]).toBe("#1F406A")
  })

  it("goes from light to dark", () => {
    const scale = buildPrimaryScale("#B71C1C")
    if (!scale) throw new Error("no scale")

    steps.slice(1).forEach((step, index) => {
      expect(lightness(scale[step])).toBeLessThan(lightness(scale[steps[index]]))
    })
  })

  it.each(["#FFD600", "#4CAF50", "#00BCD4", "#FF9800", "#9C27B0", "#000000", "#FFFFFF"])(
    "keeps the text steps readable for %s",
    (color) => {
      const scale = buildPrimaryScale(color)
      if (!scale) throw new Error("no scale")

      expect(getContrastRatio(scale[600], "#FFFFFF")).toBeGreaterThanOrEqual(4.5)
      expect(getContrastRatio(scale[700], tint(scale[500], 0.18))).toBeGreaterThanOrEqual(4.5)
    },
  )

  it("darkens a light color that white text couldn't be read on", () => {
    const scale = buildPrimaryScale("#FFD600")

    expect(scale?.[600]).not.toBe("#FFD600")
  })
})

describe("applySchoolColor", () => {
  afterEach(() => applySchoolColor(null))

  it("sets the variables colors.primary reads", () => {
    applySchoolColor("#B71C1C")

    expect(colors.primary[600]).toContain("--sf-primary-600")
    steps.forEach((step) => expect(rootVariable(step)).toBe(buildPrimaryScale("#B71C1C")?.[step]))
  })

  it("goes back to the product's palette when null", () => {
    applySchoolColor("#B71C1C")
    applySchoolColor(null)

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
  })

  it("sets nothing for the product's own color, in any case", () => {
    applySchoolColor(brandPalette[900].toLowerCase())

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
  })

  it("sets nothing for an invalid color", () => {
    applySchoolColor("not a color")

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
  })
})
