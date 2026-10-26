import { colors } from "./colors"

// Every color here is used both as text on light surfaces and as a fill under white text, so each one
// is the shade that keeps WCAG AA contrast (4.5:1) both ways on white and neutral 50 - the 500 shades
// of the palette fall short (primary 3.7:1, success 2.3:1, neutral 2.1:1). muted therefore matches
// secondary: neutral 600 still misses 4.5:1 on neutral 50, the background of the surface cards.
export const semanticColors = {
  brand: colors.primary[600],
  danger: colors.danger[700],
  default: colors.neutral[900],
  info: colors.info[700],
  inverse: colors.neutral[0],
  muted: colors.neutral[700],
  secondary: colors.neutral[700],
  success: colors.success[700],
  surface: colors.neutral[50],
  warning: colors.warning[700],
}

export type SemanticColorsType = typeof semanticColors
