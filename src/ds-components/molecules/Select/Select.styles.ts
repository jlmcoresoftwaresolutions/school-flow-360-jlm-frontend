import styled, { css } from "styled-components"

import { colors, shadows, spacing, typography } from "@/foundation"

export const SelectWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const SelectFieldWrapper = styled.div`
  position: relative;
`

export type StyledSelectProps = {
  $borderRadius: string
  $elevated?: boolean
}

export const StyledSelect = styled.select<StyledSelectProps>`
  ${(props) => {
    const { $borderRadius, $elevated } = props

    return css`
      appearance: none;
      background: ${colors.neutral[0]};
      border-radius: ${$borderRadius};
      border: 1px solid ${colors.neutral[300]};
      box-shadow: ${$elevated ? shadows.sm : shadows.none};
      color: ${colors.neutral[900]};
      cursor: pointer;
      font-family: ${typography.fontFamily.sans};
      font-size: ${typography.fontSize.md}px;
      padding: ${spacing[12]};
      padding-right: ${spacing[40]};
      width: 100%;

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

export const SelectChevron = styled.span`
  align-items: center;
  display: inline-flex;
  pointer-events: none;
  position: absolute;
  right: ${spacing[12]};
  top: 50%;
  transform: translateY(-50%);
`
