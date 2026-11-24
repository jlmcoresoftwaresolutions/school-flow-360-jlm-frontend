import { brandPalette, type BrandPaletteType } from "./brandPalette"

// A step of the primary scale: the school's color when it published one (the CSS variable that
// src/utils/theme sets on the page), the product's own otherwise. The variable's name must match the
// theme's (--sf-primary-<step>).
const primaryStep = (step: keyof BrandPaletteType) => `var(--sf-primary-${step}, ${brandPalette[step]})`

export const colors = {
  // The school's secondary color, for details only (the active submenu item's dot, the loading
  // spinner): never text nor a fill under text. Without one it follows the primary scale's 500.
  accent: {
    500: `var(--sf-accent-500, ${primaryStep(500)})`,
  },
  primary: {
    50: primaryStep(50),
    100: primaryStep(100),
    200: primaryStep(200),
    300: primaryStep(300),
    400: primaryStep(400),
    500: primaryStep(500),
    600: primaryStep(600),
    700: primaryStep(700),
    800: primaryStep(800),
    900: primaryStep(900),
  },
  neutral: {
    0: "#FFFFFF",
    50: "#F8F9FA",
    100: "#F1F3F5",
    200: "#E9ECEF",
    300: "#DEE2E6",
    400: "#CED4DA",
    500: "#ADB5BD",
    600: "#6C757D",
    700: "#495057",
    800: "#343A40",
    900: "#212529",
  },
  success: {
    50: "#F0FDF4",
    500: "#22C55E",
    700: "#15803D",
  },
  warning: {
    50: "#FFFBEB",
    500: "#F59E0B",
    700: "#B45309",
  },
  danger: {
    50: "#FEF2F2",
    500: "#EF4444",
    700: "#B91C1C",
  },
  info: {
    50: "#EFF6FF",
    500: "#3B82F6",
    700: "#1D4ED8",
  },
}

export type ColorsType = typeof colors
