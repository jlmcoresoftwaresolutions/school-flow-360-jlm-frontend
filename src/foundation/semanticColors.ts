import { colors } from "./colors"

export const semanticColors = {
  brand: colors.primary[500],
  danger: colors.danger[500],
  default: colors.neutral[900],
  info: colors.info[500],
  inverse: colors.neutral[0],
  muted: colors.neutral[500],
  secondary: colors.neutral[700],
  success: colors.success[500],
  surface: colors.neutral[50],
  warning: colors.warning[500],
}

export type SemanticColorsType = typeof semanticColors
