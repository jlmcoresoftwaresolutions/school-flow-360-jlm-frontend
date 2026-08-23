import styled, { css } from "styled-components"

import { colors, radius, shadows, spacing, typography } from "@/foundation"

export type TagColor =
  | "brand"
  | "danger"
  | "default"
  | "info"
  | "inverse"
  | "muted"
  | "secondary"
  | "success"
  | "warning"

export type TagVariant = "outlined" | "soft" | "solid"

export type TagFontSize = keyof typeof typography.fontSize
export type TagFontWeight = keyof typeof typography.fontWeight
export type TagPadding = "sm" | "md" | "lg"

const paddingMap: Record<TagPadding, string> = {
  lg: `${spacing[12]} ${spacing[20]}`,
  md: `${spacing[8]} ${spacing[16]}`,
  sm: `${spacing[4]} ${spacing[12]}`,
}

type TagColorConfig = {
  background: string
  color: string
  border?: string
}

// inverse is the only solid color that needs a visible border - a white background would otherwise
// blend into the page behind it, unlike every other color which is a solid, self-contained fill.
export const tagColorMap: Record<TagVariant, Record<TagColor, TagColorConfig>> = {
  outlined: {
    brand: { background: "transparent", border: `1px solid ${colors.primary[500]}`, color: colors.primary[500] },
    danger: { background: "transparent", border: `1px solid ${colors.danger[500]}`, color: colors.danger[500] },
    default: { background: "transparent", border: `1px solid ${colors.neutral[900]}`, color: colors.neutral[900] },
    info: { background: "transparent", border: `1px solid ${colors.info[500]}`, color: colors.info[500] },
    inverse: { background: "transparent", border: `1px solid ${colors.neutral[0]}`, color: colors.neutral[0] },
    muted: { background: "transparent", border: `1px solid ${colors.neutral[500]}`, color: colors.neutral[500] },
    secondary: { background: "transparent", border: `1px solid ${colors.neutral[600]}`, color: colors.neutral[600] },
    success: { background: "transparent", border: `1px solid ${colors.success[500]}`, color: colors.success[500] },
    warning: { background: "transparent", border: `1px solid ${colors.warning[500]}`, color: colors.warning[500] },
  },
  soft: {
    brand: { background: colors.primary[50], border: `1px solid ${colors.primary[50]}`, color: colors.primary[700] },
    danger: { background: colors.danger[50], border: `1px solid ${colors.danger[50]}`, color: colors.danger[700] },
    default: {
      background: colors.neutral[100],
      border: `1px solid ${colors.neutral[100]}`,
      color: colors.neutral[900],
    },
    info: { background: colors.info[50], border: `1px solid ${colors.info[50]}`, color: colors.info[700] },
    inverse: {
      background: "rgba(255, 255, 255, 0.15)",
      border: "1px solid rgba(255, 255, 255, 0.15)",
      color: colors.neutral[0],
    },
    muted: { background: colors.neutral[50], border: `1px solid ${colors.neutral[50]}`, color: colors.neutral[600] },
    secondary: {
      background: colors.neutral[100],
      border: `1px solid ${colors.neutral[100]}`,
      color: colors.neutral[700],
    },
    success: { background: colors.success[50], border: `1px solid ${colors.success[50]}`, color: colors.success[700] },
    warning: { background: colors.warning[50], border: `1px solid ${colors.warning[50]}`, color: colors.warning[700] },
  },
  solid: {
    brand: { background: colors.primary[500], color: colors.neutral[0] },
    danger: { background: colors.danger[500], color: colors.neutral[0] },
    default: { background: colors.neutral[900], color: colors.neutral[0] },
    info: { background: colors.info[500], color: colors.neutral[0] },
    inverse: { background: colors.neutral[0], border: `1px solid ${colors.neutral[200]}`, color: colors.neutral[900] },
    muted: { background: colors.neutral[200], color: colors.neutral[700] },
    secondary: { background: colors.neutral[600], color: colors.neutral[0] },
    success: { background: colors.success[500], color: colors.neutral[0] },
    warning: { background: colors.warning[500], color: colors.neutral[0] },
  },
}

// A softer take on Card's own glass edge highlight, giving translucent tags a subtle inset rim.
const glassEdgeGlow = "inset 0 1px 1px rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(255, 255, 255, 0.1)"

export type StyledTagProps = {
  $background: string
  $color: string
  $fontSize: TagFontSize
  $fontWeight: TagFontWeight
  $padding: TagPadding
  $backdropFilter?: string
  $border?: string
  $elevated?: boolean
}

export const StyledTag = styled.span<StyledTagProps>`
  ${(props) => {
    const { $backdropFilter, $background, $border, $color, $elevated, $fontSize, $fontWeight, $padding } = props

    const boxShadowLayers = [$elevated && shadows.md, $backdropFilter && glassEdgeGlow].filter(Boolean)
    const boxShadow = boxShadowLayers.length > 0 ? boxShadowLayers.join(", ") : shadows.none

    return css`
      align-items: center;
      align-self: flex-start;
      background: ${$background};
      border: ${$border ?? "1px solid transparent"};
      border-radius: ${radius.full};
      box-shadow: ${boxShadow};
      color: ${$color};
      display: inline-flex;
      font-size: ${typography.fontSize[$fontSize]}px;
      font-weight: ${typography.fontWeight[$fontWeight]};
      gap: ${spacing[8]};
      justify-content: center;
      padding: ${paddingMap[$padding]};
      white-space: nowrap;
      ${$backdropFilter &&
      css`
        backdrop-filter: ${$backdropFilter};
      `}
    `
  }}
`
