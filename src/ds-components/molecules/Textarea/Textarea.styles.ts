import styled, { css } from "styled-components"

import { colors, shadows, spacing, typography } from "@/foundation"

export const TextareaWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export type StyledTextareaProps = {
  $borderRadius: string
  $elevated?: boolean
}

export const StyledTextarea = styled.textarea<StyledTextareaProps>`
  ${(props) => {
    const { $borderRadius, $elevated } = props

    return css`
      background: ${colors.neutral[0]};
      border-radius: ${$borderRadius};
      border: 1px solid ${colors.neutral[300]};
      box-shadow: ${$elevated ? shadows.sm : shadows.none};
      color: ${colors.neutral[900]};
      font-family: ${typography.fontFamily.sans};
      font-size: ${typography.fontSize.md}px;
      min-height: ${spacing[80]};
      padding: ${spacing[12]};
      resize: none;
      width: 100%;

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
