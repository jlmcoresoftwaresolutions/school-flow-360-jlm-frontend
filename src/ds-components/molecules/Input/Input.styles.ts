import styled, { css } from "styled-components"

import { colors, motion, shadows, spacing, typography } from "@/foundation"

export const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// Positions the optional start icon over the input's left padding.
export const InputControl = styled.div`
  position: relative;
`

export type InputSize = "large" | "medium" | "small"

// The side padding of each size, also used to place the start icon inside it.
const sidePadding: Record<InputSize, string> = {
  large: spacing[16],
  medium: spacing[12],
  small: spacing[8],
}

// medium reproduces this component's pre-size-prop look exactly (font-size md, padding 12px on
// every side) so adding the prop never shifts an existing <Input> that doesn't pass it.
const sizeStyles: Record<InputSize, ReturnType<typeof css>> = {
  large: css`
    font-size: ${typography.fontSize.lg}px;
    padding: ${spacing[16]};
  `,
  medium: css`
    font-size: ${typography.fontSize.md}px;
    padding: ${spacing[12]};
  `,
  small: css`
    font-size: ${typography.fontSize.sm}px;
    padding: ${spacing[8]};
  `,
}

export type InputStartIconProps = {
  $size: InputSize
}

// pointer-events: none lets a click on the icon fall through to the input and focus it.
export const InputStartIcon = styled.span<InputStartIconProps>`
  display: inline-flex;
  left: ${(props) => sidePadding[props.$size]};
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
`

export type StyledInputProps = {
  $borderRadius: string
  $size: InputSize
  $elevated?: boolean
  $hasError?: boolean
  $hasStartIcon?: boolean
}

export const StyledInput = styled.input<StyledInputProps>`
  ${(props) => {
    const { $borderRadius, $elevated, $hasError, $hasStartIcon, $size } = props

    return css`
      background: ${colors.neutral[0]};
      border-radius: ${$borderRadius};
      border: 1px solid ${$hasError ? colors.danger[500] : colors.neutral[300]};
      box-shadow: ${$elevated ? shadows.sm : shadows.none};
      color: ${colors.neutral[900]};
      font-family: ${typography.fontFamily.sans};
      width: 100%;
      transition: border-color ${motion.duration.normal} ${motion.easing.ease};

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }

      ${sizeStyles[$size]}

      ${$hasStartIcon &&
      css`
        padding-left: calc(${sidePadding[$size]} * 2 + ${$size === "small" ? spacing[16] : spacing[20]});
      `}

      &::placeholder {
        color: ${colors.neutral[500]};
      }

      &:focus {
        border-color: ${$hasError ? colors.danger[500] : colors.primary[500]};
        outline: none;
      }

      &:disabled {
        background: ${colors.neutral[50]};
        color: ${colors.neutral[500]};
        cursor: not-allowed;
      }
    `
  }}
`
