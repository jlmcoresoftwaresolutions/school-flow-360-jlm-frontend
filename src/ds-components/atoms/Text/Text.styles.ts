import styled, { css } from "styled-components"

import { typography } from "@/foundation"

export type TextFontSize = keyof typeof typography.fontSize
export type TextFontWeight = keyof typeof typography.fontWeight
export type TextAlign = "left" | "center" | "right" | "justify"
export type TextTransform = "uppercase" | "lowercase" | "capitalize"

export type StyledTextProps = {
  $color: string
  $fontSize: TextFontSize
  $fontWeight: TextFontWeight
  $align?: TextAlign
  $textTransform?: TextTransform
}

export const StyledText = styled.p<StyledTextProps>`
  ${(props) => {
    const { $align, $color, $fontSize, $fontWeight, $textTransform } = props

    return css`
      margin: 0;
      color: ${$color};
      font-size: ${typography.fontSize[$fontSize]}px;
      font-weight: ${typography.fontWeight[$fontWeight]};
      line-height: ${typography.lineHeight[$fontSize]};
      ${$align &&
      css`
        text-align: ${$align};
      `}
      ${$textTransform &&
      css`
        text-transform: ${$textTransform};
      `}
    `
  }}
`
