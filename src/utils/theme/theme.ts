import { backdropPalette, type BackdropPaletteType } from "@/foundation/backdropPalette"
import { brandPalette, type BrandPaletteType } from "@/foundation/brandPalette"
import { colors } from "@/foundation/colors"
import { getContrastRatio, hexToRgb, type RgbColor, rgbToHex } from "@/utils/colors"

// The school's colors across the interface. colors.primary (src/foundation/colors.ts) reads each step
// from a CSS variable, --sf-primary-<step>, falling back to the product's own palette (brandPalette),
// and colors.accent reads --sf-accent-500, falling back to the primary 500; setting those variables on
// the root element repaints every button, link, tab and focused field, and the details in the accent.

export type PrimaryStep = keyof BrandPaletteType

export type PrimaryScale = Record<PrimaryStep, string>

const steps = Object.keys(brandPalette).map(Number) as PrimaryStep[]

const white = "#FFFFFF"

// The WCAG AA minimum for normal text.
const minimumTextContrast = 4.5

// How much lighter, in HSL lightness points, each darker step stays below the one before it.
const minimumStepGap = 4

type HslColor = {
  // 0 to 360
  h: number
  // 0 to 100
  l: number
  // 0 to 100
  s: number
}

const toHsl = (color: RgbColor): HslColor => {
  const r = color.r / 255
  const g = color.g / 255
  const b = color.b / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const delta = max - min
  if (delta === 0) return { h: 0, l: l * 100, s: 0 }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4

  return { h: (h * 60 + 360) % 360, l: l * 100, s: s * 100 }
}

const toRgb = (color: HslColor): RgbColor => {
  const s = color.s / 100
  const l = color.l / 100
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const sector = color.h / 60
  const x = chroma * (1 - Math.abs((sector % 2) - 1))
  const m = l - chroma / 2
  const [r, g, b] = [
    [chroma, x, 0],
    [x, chroma, 0],
    [0, chroma, x],
    [0, x, chroma],
    [x, 0, chroma],
    [chroma, 0, x],
  ][Math.floor(sector) % 6]

  return { b: (b + m) * 255, g: (g + m) * 255, r: (r + m) * 255 }
}

const hslToHex = (color: HslColor): string => rgbToHex(toRgb(color))

// The product's palette lightness at each step, the profile a school's scale follows.
const defaultLightness = Object.fromEntries(
  steps.map((step) => [step, toHsl(hexToRgb(brandPalette[step]) as RgbColor).l]),
) as Record<PrimaryStep, number>

// A color over white at that opacity, as the tinted backgrounds (the active menu item) are painted.
const overWhite = (hex: string, alpha: number): string => {
  const color = hexToRgb(hex) as RgbColor
  const blend = (channel: number) => 255 + (channel - 255) * alpha

  return rgbToHex({ b: blend(color.b), g: blend(color.g), r: blend(color.r) })
}

// Darkens a color, keeping its hue and saturation, until it reaches the contrast asked against the
// background (and stays below the lightness given).
const darkenUntil = (color: HslColor, background: string, maxLightness: number): HslColor => {
  let lightness = Math.min(color.l, maxLightness)
  while (
    lightness > 0 &&
    (getContrastRatio(hslToHex({ ...color, l: lightness }), background) ?? 0) < minimumTextContrast
  ) {
    lightness -= 1
  }

  return { ...color, l: Math.max(0, lightness) }
}

// The ten steps of the primary scale for a school's color (a 6-digit hex), or null when it isn't one.
// The color itself takes the step whose lightness is nearest in the product's palette; the lighter and
// darker steps spread from it towards the product's own lightest and darkest. Then the steps used as
// text keep WCAG AA: 600 (buttons, under white text, and links) against white, and 700 (the active menu
// item and page) against its tinted background, with 700 to 900 always darker than the step before.
export const buildPrimaryScale = (color: string): PrimaryScale | null => {
  const rgb = hexToRgb(color)
  if (!rgb) return null

  const base = toHsl(rgb)
  const anchor = steps.reduce((nearest, step) =>
    Math.abs(defaultLightness[step] - base.l) < Math.abs(defaultLightness[nearest] - base.l) ? step : nearest,
  )
  const lightest = defaultLightness[steps[0]]
  const darkest = Math.min(defaultLightness[steps[steps.length - 1]], base.l)

  const lightnessAt = (step: PrimaryStep): number => {
    const anchorLightness = defaultLightness[anchor]
    if (step < anchor) {
      const progress = (defaultLightness[step] - anchorLightness) / (lightest - anchorLightness)
      return base.l + progress * (Math.max(lightest, base.l) - base.l)
    }
    const progress = (anchorLightness - defaultLightness[step]) / (anchorLightness - darkest || 1)
    return base.l - progress * (base.l - darkest)
  }

  const hsl = Object.fromEntries(steps.map((step) => [step, { ...base, l: lightnessAt(step) }])) as Record<
    PrimaryStep,
    HslColor
  >

  hsl[600] = darkenUntil(hsl[600], white, hsl[600].l)
  const activeBackground = overWhite(hslToHex(hsl[500]), 0.18)
  hsl[700] = darkenUntil(hsl[700], activeBackground, hsl[600].l - minimumStepGap)
  hsl[800] = { ...hsl[800], l: Math.max(0, Math.min(hsl[800].l, hsl[700].l - minimumStepGap)) }
  hsl[900] = { ...hsl[900], l: Math.max(0, Math.min(hsl[900].l, hsl[800].l - minimumStepGap)) }

  // The school's own color, exactly as published, unless a contrast rule had to darken it.
  const scale = Object.fromEntries(
    steps.map((step) => [step, step === anchor && hsl[step].l === base.l ? rgbToHex(rgb) : hslToHex(hsl[step])]),
  ) as PrimaryScale

  return scale
}

// The WCAG minimum for a graphic that shows a state (the active item's dot) against its background.
const minimumGraphicContrast = 3

// The school's secondary color as the accent, darkened (keeping its hue) until it shows against white,
// or null when it isn't a hex color.
export const buildAccent = (color: string): string | null => {
  const rgb = hexToRgb(color)
  if (!rgb) return null
  if ((getContrastRatio(rgbToHex(rgb), white) ?? 0) >= minimumGraphicContrast) return rgbToHex(rgb)

  const base = toHsl(rgb)
  let lightness = base.l
  while (
    lightness > 0 &&
    (getContrastRatio(hslToHex({ ...base, l: lightness }), white) ?? 0) < minimumGraphicContrast
  ) {
    lightness -= 1
  }

  return hslToHex({ ...base, l: Math.max(0, lightness) })
}

// The colors a school publishes, as both the published and the public identity bring them.
export type SchoolColors = {
  primaryColor: string
  secondaryColor: string | null
}

const primaryVariable = (step: PrimaryStep) => `--sf-primary-${step}`

const accentVariable = "--sf-accent-500"

// The last colors applied, kept in the browser (per address, so per school) to paint the next visit
// before the identity is read again, instead of flashing the product's colors first. Colors only:
// nothing about the person, and never the image links, which expire.
const storageKey = "sf360.schoolColors"

type BackdropName = keyof BackdropPaletteType

const backdropNames = Object.keys(backdropPalette) as BackdropName[]

const backdropVariable = (name: BackdropName) => `--sf-backdrop-${name}`

// The animated background before signing in, in the school's hues: each of the product's backdrop
// colors keeps its light and takes the hue of the school's primary (the teal glow, of its accent), with
// the school's saturation but never more than the product's own, so a vivid color stays as muted as the
// navy it replaces. A gray school color gives a gray background.
export const buildBackdrop = (primary: string, accent: string): BackdropPaletteType | null => {
  const primaryRgb = hexToRgb(primary)
  const accentRgb = hexToRgb(accent)
  if (!primaryRgb || !accentRgb) return null

  const primaryHsl = toHsl(primaryRgb)
  const accentHsl = toHsl(accentRgb)
  const inHue = (name: BackdropName, hue: HslColor) => {
    const own = toHsl(hexToRgb(backdropPalette[name]) as RgbColor)
    return hslToHex({ h: hue.h, l: own.l, s: Math.min(own.s, hue.s) })
  }

  return {
    base: inHue("base", primaryHsl),
    glow: inHue("glow", primaryHsl),
    glowAccent: inHue("glowAccent", accentHsl),
    glowLow: inHue("glowLow", primaryHsl),
  }
}

const pageBackgroundVariable = "--sf-page-background"

// How much of the school's primary goes into the light gray of the pages behind the login: enough to
// give them its hue, little enough that the white cards still stand out and the status colors still
// read as they do on the gray.
export const pageTintAmount = 0.03

// The pages' background for a school's primary (its 500 step): the product's light gray with a touch
// of the color, or null when it isn't a hex color.
export const buildPageBackground = (primary: string, amount = pageTintAmount): string | null => {
  const tint = hexToRgb(primary)
  const gray = hexToRgb(colors.neutral[50]) as RgbColor
  if (!tint) return null
  const mix = (channel: keyof RgbColor) => gray[channel] + (tint[channel] - gray[channel]) * amount

  return rgbToHex({ b: mix("b"), g: mix("g"), r: mix("r") })
}

const paint = (schoolColors: SchoolColors | null) => {
  const style = document.documentElement.style
  const primary = schoolColors?.primaryColor ?? null
  const isProductColor = primary?.toUpperCase() === brandPalette[900].toUpperCase()
  const scale = primary && !isProductColor ? buildPrimaryScale(primary) : null
  const accent = schoolColors?.secondaryColor ? buildAccent(schoolColors.secondaryColor) : null

  steps.forEach((step) => {
    if (scale) style.setProperty(primaryVariable(step), scale[step])
    else style.removeProperty(primaryVariable(step))
  })
  if (accent) style.setProperty(accentVariable, accent)
  else style.removeProperty(accentVariable)

  // Only a school's own primary changes the background: the product's colors keep its navy.
  const backdrop = primary && scale ? buildBackdrop(primary, accent ?? primary) : null
  backdropNames.forEach((name) => {
    if (backdrop) style.setProperty(backdropVariable(name), backdrop[name])
    else style.removeProperty(backdropVariable(name))
  })

  const pageBackground = scale ? buildPageBackground(scale[500]) : null
  if (pageBackground) style.setProperty(pageBackgroundVariable, pageBackground)
  else style.removeProperty(pageBackgroundVariable)
}

const isSchoolColors = (value: unknown): value is SchoolColors => {
  if (typeof value !== "object" || value === null) return false
  const { primaryColor, secondaryColor } = value as Record<string, unknown>

  return typeof primaryColor === "string" && (secondaryColor === null || typeof secondaryColor === "string")
}

// Paints the interface with the school's colors, or back with the product's when null, and keeps them
// for the next visit. The product's own primary color (brandPalette[900], the default a school starts
// with) needs no variables; without a secondary color, the accent follows the primary.
export const applySchoolColors = (schoolColors: SchoolColors | null): void => {
  const kept = schoolColors && {
    primaryColor: schoolColors.primaryColor,
    secondaryColor: schoolColors.secondaryColor,
  }
  paint(kept)

  try {
    if (kept) localStorage.setItem(storageKey, JSON.stringify(kept))
    else localStorage.removeItem(storageKey)
  } catch {
    // Without storage, the next visit just starts with the product's colors.
  }
}

// Paints the colors kept from the last visit, if any. Called once when the app starts, before the first
// render, so the school's colors are there from the first frame.
export const restoreSchoolColors = (): void => {
  try {
    const stored = localStorage.getItem(storageKey)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    if (isSchoolColors(parsed)) paint(parsed)
  } catch {
    // An unreadable entry is the product's colors.
  }
}
