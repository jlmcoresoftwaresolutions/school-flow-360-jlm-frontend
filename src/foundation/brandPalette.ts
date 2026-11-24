// The product's own primary scale, as plain hex: what the interface shows when the school published no
// color of its own, and what code that needs a real color value (a default in a form, a contrast check)
// reads. colors.primary reads each step from a CSS variable (--sf-primary-<step>, set by
// src/utils/theme when the school has a color) and falls back to these.
export const brandPalette = {
  50: "#F6F9FD",
  100: "#E4EDF9",
  200: "#C0D5F1",
  300: "#9CBDE8",
  400: "#6F9FDE",
  500: "#4B87D6",
  600: "#4574B0",
  700: "#3D5778",
  800: "#1F406A",
  900: "#00285B",
}

export type BrandPaletteType = typeof brandPalette
