import styled, { css } from "styled-components"

import { colors, motion, opacity, radius, spacing } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

export type IconButtonColor = "brand" | "danger" | "default"

export type IconButtonSize = "large" | "medium" | "small"

// The icon's color; hovering and pressing tint the background with it, as the Button's link variant does.
export const iconButtonColorMap: Record<IconButtonColor, string> = {
  brand: colors.primary[600],
  danger: colors.danger[700],
  default: colors.neutral[700],
}

// The button's side (it is square) and the icon's size, a spacing key. small is a tight 28px around a
// 20px icon (e.g. a modal's close button); medium leaves the same icon a roomier 40px.
export const iconButtonSizeMap = {
  large: { button: spacing[48], icon: 24 },
  medium: { button: spacing[40], icon: 20 },
  small: { button: `calc(${spacing[20]} + 2 * ${spacing[4]})`, icon: 20 },
} as const

export type StyledIconButtonProps = {
  $color: IconButtonColor
  $size: IconButtonSize
}

export const StyledIconButton = styled.button<StyledIconButtonProps>`
  ${(props) => {
    const { $color, $size } = props
    const color = iconButtonColorMap[$color]
    const side = iconButtonSizeMap[$size].button

    return css`
      align-items: center;
      background: transparent;
      border: none;
      border-radius: ${radius.md};
      color: ${color};
      cursor: pointer;
      display: inline-flex;
      flex-shrink: 0;
      height: ${side};
      justify-content: center;
      padding: 0;
      transition: background ${motion.duration.fast} ${motion.easing.ease};
      width: ${side};

      &:hover:not(:disabled) {
        background: ${hexToRgba(color, 0.1)};
      }

      &:active:not(:disabled) {
        background: ${hexToRgba(color, 0.16)};
      }

      &:focus-visible {
        outline: 2px solid ${colors.info[500]};
        outline-offset: 2px;
      }

      &:disabled {
        cursor: not-allowed;
        opacity: ${opacity.disabled};
      }

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    `
  }}
`
