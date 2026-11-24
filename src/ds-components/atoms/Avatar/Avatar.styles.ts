import styled, { css } from "styled-components"

import { colors, radius, spacing, typography } from "@/foundation"

export type AvatarSize = "lg" | "md" | "sm"

export const avatarSizeMap: Record<AvatarSize, { fontSize: number; size: string }> = {
  lg: { fontSize: typography.fontSize.lg, size: spacing[48] },
  md: { fontSize: typography.fontSize.sm, size: spacing[40] },
  sm: { fontSize: typography.fontSize.xs, size: spacing[32] },
}

export type StyledAvatarProps = {
  $size: AvatarSize
}

const avatarShape = css<StyledAvatarProps>`
  border-radius: ${radius.full};
  flex-shrink: 0;
  height: ${(props) => avatarSizeMap[props.$size].size};
  width: ${(props) => avatarSizeMap[props.$size].size};
`

export const StyledAvatarImage = styled.img<StyledAvatarProps>`
  ${avatarShape}
  object-fit: cover;
`

export const StyledAvatarInitials = styled.span<StyledAvatarProps>`
  ${avatarShape}
  align-items: center;
  /* The primary scale, so the initials follow the school's color; the 700 keeps WCAG AA on the 50. */
  background-color: ${colors.primary[50]};
  color: ${colors.primary[700]};
  display: inline-flex;
  font-family: ${typography.fontFamily.sans};
  font-size: ${(props) => avatarSizeMap[props.$size].fontSize}px;
  font-weight: ${typography.fontWeight.semibold};
  justify-content: center;
`
