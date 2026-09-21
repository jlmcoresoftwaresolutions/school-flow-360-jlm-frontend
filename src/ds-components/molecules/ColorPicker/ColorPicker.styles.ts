import { HexColorInput } from "react-colorful"
import styled, { css } from "styled-components"

import { colors, radius, shadows, spacing, typography, zIndex } from "@/foundation"

export const ColorPickerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

export const ColorPickerControl = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

export type StyledSwatchButtonProps = {
  $borderRadius: string
  $color: string
}

export const SwatchButton = styled.button<StyledSwatchButtonProps>`
  background-color: ${(props) => props.$color};
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${(props) => props.$borderRadius};
  cursor: pointer;
  flex-shrink: 0;
  height: ${spacing[40]};
  padding: 0;
  width: ${spacing[40]};

  &:disabled {
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary[300]};
    outline-offset: 2px;
  }
`

// Same visual rules as Input's own StyledInput (Input.styles.ts), duplicated rather than shared:
// HexColorInput renders its own <input> internally (there's no customInput slot like
// react-datepicker's to swap StyledInput in directly), so styled(HexColorInput) is the only way to
// reach that node - but the two intentionally still look identical to any other text Input.
export type StyledHexColorInputProps = {
  $borderRadius: string
  $elevated?: boolean
}

export const StyledHexColorInput = styled(HexColorInput)<StyledHexColorInputProps>`
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
      padding: ${spacing[12]};
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

export const ColorPickerPopover = styled.div`
  background: ${colors.neutral[0]};
  border-radius: ${radius.md};
  box-shadow: ${shadows.lg};
  padding: ${spacing[12]};
  position: fixed;
  z-index: ${zIndex.popover};

  /* react-colorful injects its own functional CSS (sizing, pointer positioning) at runtime - these
     two rules only round its corners to match this popover's own border-radius. */
  .react-colorful__saturation {
    border-radius: ${radius.sm} ${radius.sm} 0 0;
  }

  .react-colorful__last-control {
    border-radius: 0 0 ${radius.sm} ${radius.sm};
  }
`

export const RgbFieldsRow = styled.div`
  display: flex;
  gap: ${spacing[8]};
  margin-top: ${spacing[8]};
`
