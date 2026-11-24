import { afterEach, describe, expect, it } from "vitest"

import { backdropPalette, brandPalette, colors } from "@/foundation"
import { getContrastRatio, hexToRgb } from "@/utils/colors"

import {
  applySchoolColors,
  buildAccent,
  buildBackdrop,
  buildPageBackground,
  buildPrimaryScale,
  type PrimaryStep,
  restoreSchoolColors,
} from "./theme"

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

const accentVariable = () => document.documentElement.style.getPropertyValue("--sf-accent-500")

const pageBackground = () => document.documentElement.style.getPropertyValue("--sf-page-background")

const backdrop = (name: keyof typeof backdropPalette) =>
  document.documentElement.style.getPropertyValue(`--sf-backdrop-${name}`)

// The HSL lightness of a hex color, 0 to 100.
const hslLightness = (hex: string) => (lightness(hex) / 255) * 100

// The HSL saturation of a hex color, 0 to 100.
const saturation = (hex: string) => {
  const { b, g, r } = hexToRgb(hex) ?? { b: 0, g: 0, r: 0 }
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  const l = (max + min) / 2
  return max === min ? 0 : ((max - min) / (1 - Math.abs(2 * l - 1))) * 100
}

const storageKey = "sf360.schoolColors"

const school = (primaryColor: string, secondaryColor: string | null = null) => ({ primaryColor, secondaryColor })

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

describe("buildAccent", () => {
  it("keeps a secondary color that shows against white", () => {
    expect(buildAccent("#4B87D6")).toBe("#4B87D6")
  })

  it("darkens a light one until it shows against white", () => {
    const accent = buildAccent("#FFEB3B")

    expect(accent).not.toBe("#FFEB3B")
    expect(getContrastRatio(accent ?? "", "#FFFFFF")).toBeGreaterThanOrEqual(3)
  })

  it("is null for something that isn't a hex color", () => {
    expect(buildAccent("yellow")).toBeNull()
  })
})

describe("buildBackdrop", () => {
  it("keeps the light of the product's background in the school's hue, never more saturated", () => {
    const built = buildBackdrop("#B71C1C", "#2E7D32")
    if (!built) throw new Error("no backdrop")
    ;(Object.keys(backdropPalette) as (keyof typeof backdropPalette)[]).forEach((name) => {
      expect(Math.abs(hslLightness(built[name]) - hslLightness(backdropPalette[name]))).toBeLessThan(1.5)
      expect(saturation(built[name])).toBeLessThanOrEqual(saturation(backdropPalette[name]) + 1.5)
    })
  })

  it("gives a gray background for a gray school color", () => {
    expect(saturation(buildBackdrop("#555555", "#555555")?.base ?? "")).toBe(0)
  })

  it("is null for something that isn't a hex color", () => {
    expect(buildBackdrop("red", "#2E7D32")).toBeNull()
  })
})

describe("buildPageBackground", () => {
  it("mixes a touch of the color into the product's light gray", () => {
    expect(buildPageBackground("#F8F9FA")).toBe(colors.neutral[50])
    expect(buildPageBackground("#000000", 0.5)).toBe("#7C7D7D")
    expect(buildPageBackground("#B71C1C")).not.toBe(colors.neutral[50])
  })

  it("is null for something that isn't a hex color", () => {
    expect(buildPageBackground("red")).toBeNull()
  })
})

describe("applySchoolColors", () => {
  afterEach(() => {
    applySchoolColors(null)
    localStorage.clear()
  })

  it("sets the variables colors.primary reads", () => {
    applySchoolColors(school("#B71C1C"))

    expect(colors.primary[600]).toContain("--sf-primary-600")
    steps.forEach((step) => expect(rootVariable(step)).toBe(buildPrimaryScale("#B71C1C")?.[step]))
  })

  it("sets the accent from the secondary color, and leaves it to the primary without one", () => {
    applySchoolColors(school("#B71C1C", "#2E7D32"))

    expect(colors.accent[500]).toContain("--sf-accent-500")
    expect(accentVariable()).toBe("#2E7D32")

    applySchoolColors(school("#B71C1C"))

    expect(accentVariable()).toBe("")
  })

  it("repaints the background of the screens before signing in, the accent in the top right glow", () => {
    applySchoolColors(school("#B71C1C", "#2E7D32"))

    expect(colors.backdrop.base).toContain("--sf-backdrop-base")
    expect(backdrop("base")).toBe(buildBackdrop("#B71C1C", "#2E7D32")?.base)
    expect(backdrop("glowAccent")).toBe(buildBackdrop("#B71C1C", "#2E7D32")?.glowAccent)

    applySchoolColors(school("#B71C1C"))

    expect(backdrop("glowAccent")).toBe(buildBackdrop("#B71C1C", "#B71C1C")?.glowAccent)
  })

  it("tints the pages' background with the school's primary", () => {
    applySchoolColors(school("#B71C1C"))

    expect(colors.page.background).toContain("--sf-page-background")
    expect(pageBackground()).toBe(buildPageBackground(buildPrimaryScale("#B71C1C")?.[500] ?? ""))

    applySchoolColors(null)

    expect(pageBackground()).toBe("")
  })

  it("keeps the product's background for the product's own color", () => {
    applySchoolColors(school(brandPalette[900], "#2E7D32"))

    expect(backdrop("base")).toBe("")
    expect(backdrop("glowAccent")).toBe("")
    expect(pageBackground()).toBe("")
  })

  it("goes back to the product's palette when null", () => {
    applySchoolColors(school("#B71C1C", "#2E7D32"))
    applySchoolColors(null)

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
    expect(accentVariable()).toBe("")
    expect(backdrop("base")).toBe("")
  })

  it("sets no primary step for the product's own color, in any case", () => {
    applySchoolColors(school(brandPalette[900].toLowerCase()))

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
  })

  it("sets nothing for an invalid color", () => {
    applySchoolColors(school("not a color", "nor this"))

    steps.forEach((step) => expect(rootVariable(step)).toBe(""))
    expect(accentVariable()).toBe("")
  })

  it("keeps the colors for the next visit, and forgets them when null", () => {
    applySchoolColors(school("#B71C1C", "#2E7D32"))

    expect(JSON.parse(localStorage.getItem(storageKey) ?? "null")).toEqual(school("#B71C1C", "#2E7D32"))

    applySchoolColors(null)

    expect(localStorage.getItem(storageKey)).toBeNull()
  })
})

describe("restoreSchoolColors", () => {
  afterEach(() => {
    applySchoolColors(null)
    localStorage.clear()
  })

  it("paints the colors kept from the last visit", () => {
    localStorage.setItem(storageKey, JSON.stringify(school("#B71C1C", "#2E7D32")))

    restoreSchoolColors()

    expect(rootVariable(600)).toBe(buildPrimaryScale("#B71C1C")?.[600])
    expect(accentVariable()).toBe("#2E7D32")
  })

  it("keeps the product's colors without anything kept", () => {
    restoreSchoolColors()

    expect(rootVariable(600)).toBe("")
  })

  it.each(["not json", JSON.stringify({ primaryColor: 1 }), JSON.stringify(null)])(
    "ignores an unreadable entry (%s)",
    (stored) => {
      localStorage.setItem(storageKey, stored)

      restoreSchoolColors()

      expect(rootVariable(600)).toBe("")
    },
  )
})
