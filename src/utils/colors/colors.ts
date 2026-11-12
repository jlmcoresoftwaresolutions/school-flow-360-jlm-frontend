// Expands 3-digit shorthand hex (e.g. "#0f0") to 6 digits before parsing, so both notations work.
export const hexToRgba = (hex: string, alpha: number): string => {
  const digits = hex.replace("#", "")
  const fullDigits = digits.length === 3 ? digits.replace(/./g, (char) => char + char) : digits

  const r = parseInt(fullDigits.slice(0, 2), 16)
  const g = parseInt(fullDigits.slice(2, 4), 16)
  const b = parseInt(fullDigits.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export type RgbColor = {
  b: number
  g: number
  r: number
}

// Returns null for anything that isn't a plain 6-digit hex (with or without "#"), so callers can
// fall back to a default instead of rendering NaN for an incomplete/invalid value being typed.
export const hexToRgb = (hex: string): RgbColor | null => {
  const digits = hex.replace("#", "")
  if (!/^[0-9a-fA-F]{6}$/.test(digits)) return null

  return {
    b: parseInt(digits.slice(4, 6), 16),
    g: parseInt(digits.slice(2, 4), 16),
    r: parseInt(digits.slice(0, 2), 16),
  }
}

const toHexChannel = (channel: number): string =>
  Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, "0")

export const rgbToHex = (color: RgbColor): string =>
  `#${toHexChannel(color.r)}${toHexChannel(color.g)}${toHexChannel(color.b)}`.toUpperCase()

// The WCAG relative luminance of a channel (0-255), from the sRGB transfer function.
const channelLuminance = (channel: number): number => {
  const value = channel / 255

  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

const relativeLuminance = (color: RgbColor): number =>
  0.2126 * channelLuminance(color.r) + 0.7152 * channelLuminance(color.g) + 0.0722 * channelLuminance(color.b)

// The WCAG contrast ratio between two 6-digit hex colors, from 1 (none) to 21 (black on white). WCAG AA
// asks 4.5 for normal text and 3 for large text. Null when either color isn't a valid hex.
export const getContrastRatio = (first: string, second: string): number | null => {
  const firstRgb = hexToRgb(first)
  const secondRgb = hexToRgb(second)
  if (!firstRgb || !secondRgb) return null

  const [lighter, darker] = [relativeLuminance(firstRgb), relativeLuminance(secondRgb)].sort((a, b) => b - a)

  return (lighter + 0.05) / (darker + 0.05)
}
