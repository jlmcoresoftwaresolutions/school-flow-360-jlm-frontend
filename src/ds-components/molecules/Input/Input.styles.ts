import styled, { css } from "styled-components"

import { colors, shadows, spacing, typography } from "@/foundation"

export const InputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export type InputSize = "large" | "medium" | "small"

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

export type StyledInputProps = {
  $borderRadius: string
  $size: InputSize
  $elevated?: boolean
}

export const StyledInput = styled.input<StyledInputProps>`
  ${(props) => {
    const { $borderRadius, $elevated, $size } = props

    return css`
      background: ${colors.neutral[0]};
      border-radius: ${$borderRadius};
      border: 1px solid ${colors.neutral[300]};
      box-shadow: ${$elevated ? shadows.sm : shadows.none};
      color: ${colors.neutral[900]};
      font-family: ${typography.fontFamily.sans};
      width: 100%;

      ${sizeStyles[$size]}

      &::placeholder {
        color: ${colors.neutral[500]};
      }

      &:focus {
        border-color: ${colors.primary[500]};
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
