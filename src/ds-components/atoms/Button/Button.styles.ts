import styled, { css } from "styled-components"

import { colors, motion, opacity, spacing, typography } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

export type ButtonSize = "large" | "medium" | "small"
export type ButtonVariant = "filled" | "link" | "outlined"

export type StyledButtonProps = {
  $borderRadius: string
  $color: string
  $size: ButtonSize
  $variant: ButtonVariant
}

const sizeStyles: Record<ButtonSize, ReturnType<typeof css>> = {
  large: css`
    font-size: ${typography.fontSize.lg}px;
    padding: ${spacing[12]} ${spacing[24]};
  `,
  medium: css`
    font-size: ${typography.fontSize.md}px;
    padding: ${spacing[8]} ${spacing[12]};
  `,
  small: css`
    font-size: ${typography.fontSize.sm}px;
    padding: ${spacing[4]} ${spacing[12]};
  `,
}

// color drives a different property per variant: filled's background, outlined's label/border,
// link's label - each variant only takes what makes sense for its own look.
const variantStyles = (color: string): Record<ButtonVariant, ReturnType<typeof css>> => ({
  filled: css`
    background: ${color};
    border: 1px solid transparent;
    color: ${colors.neutral[0]};

    &:hover:not(:disabled) {
      opacity: ${opacity.overlay};
    }
  `,
  link: css`
    background: transparent;
    border: 1px solid transparent;
    color: ${color};
    padding: 0;

    &:hover:not(:disabled) {
      text-decoration: underline;
    }
  `,
  outlined: css`
    background: ${colors.neutral[0]};
    border: 1px solid ${color};
    color: ${color};

    &:hover:not(:disabled) {
      background: ${hexToRgba(color, 0.1)};
    }
  `,
})

export const StyledButton = styled.button<StyledButtonProps>`
  ${(props) => {
    const { $borderRadius, $color, $size, $variant } = props

    return css`
      align-items: center;
      border-radius: ${$borderRadius};
      cursor: pointer;
      display: inline-flex;
      font-family: ${typography.fontFamily.sans};
      font-weight: ${typography.fontWeight.semibold};
      gap: ${spacing[8]};
      justify-content: center;
      transition:
        background ${motion.duration.fast} ${motion.easing.ease},
        opacity ${motion.duration.fast} ${motion.easing.ease};

      ${sizeStyles[$size]}
      ${variantStyles($color)[$variant]}

      &:disabled {
        cursor: not-allowed;
        opacity: ${opacity.disabled};
      }
    `
  }}
`
