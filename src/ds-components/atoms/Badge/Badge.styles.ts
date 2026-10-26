import styled from "styled-components"

import { colors, radius, spacing, typography } from "@/foundation"

export type BadgeTone = "danger" | "info" | "neutral" | "success" | "warning"

type BadgeToneConfig = {
  background: string
  color: string
  dot: string
}

// Soft fills with a darker text of the same hue (and a stronger dot) keep the badge readable on any
// surface without the weight of a solid Tag - it's meant to sit inside table rows and card headers.
export const badgeToneMap: Record<BadgeTone, BadgeToneConfig> = {
  danger: { background: colors.danger[50], color: colors.danger[700], dot: colors.danger[500] },
  info: { background: colors.info[50], color: colors.info[700], dot: colors.info[500] },
  neutral: { background: colors.neutral[100], color: colors.neutral[700], dot: colors.neutral[400] },
  success: { background: colors.success[50], color: colors.success[700], dot: colors.success[500] },
  warning: { background: colors.warning[50], color: colors.warning[700], dot: colors.warning[500] },
}

export type StyledBadgeProps = {
  $background: string
  $color: string
}

export const StyledBadge = styled.span<StyledBadgeProps>`
  align-items: center;
  background: ${(props) => props.$background};
  border-radius: ${radius.full};
  color: ${(props) => props.$color};
  display: inline-flex;
  font-size: ${typography.fontSize.xs}px;
  font-weight: ${typography.fontWeight.medium};
  gap: ${spacing[8]};
  line-height: ${typography.lineHeight.xs};
  padding: ${spacing[4]} ${spacing[12]};
  white-space: nowrap;
`

export type StyledBadgeDotProps = {
  $color: string
}

export const StyledBadgeDot = styled.span<StyledBadgeDotProps>`
  background: ${(props) => props.$color};
  border-radius: ${radius.full};
  flex-shrink: 0;
  height: ${spacing[8]};
  width: ${spacing[8]};
`
