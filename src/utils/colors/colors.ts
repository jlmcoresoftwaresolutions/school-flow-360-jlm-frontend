// Expands 3-digit shorthand hex (e.g. "#0f0") to 6 digits before parsing, so both notations work.
export const hexToRgba = (hex: string, alpha: number): string => {
  const digits = hex.replace("#", "")
  const fullDigits = digits.length === 3 ? digits.replace(/./g, (char) => char + char) : digits

  const r = parseInt(fullDigits.slice(0, 2), 16)
  const g = parseInt(fullDigits.slice(2, 4), 16)
  const b = parseInt(fullDigits.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
