import styled, { css } from "styled-components"

import { colors, radius, shadows, spacing, typography, zIndex } from "@/foundation"

const cursorOffset = 16

export type TooltipBalloonProps = {
  $x: number
  $y: number
}

export const TooltipBalloon = styled.div<TooltipBalloonProps>`
  ${(props) => {
    const { $x, $y } = props

    return css`
      position: fixed;
      top: ${$y + cursorOffset}px;
      left: ${$x + cursorOffset}px;
      z-index: ${zIndex.tooltip};
      max-width: ${spacing[240]};
      padding: ${spacing[8]} ${spacing[12]};
      border-radius: ${radius.sm};
      background: ${colors.neutral[900]};
      color: ${colors.neutral[0]};
      font-size: ${typography.fontSize.sm}px;
      line-height: ${typography.lineHeight.sm};
      box-shadow: ${shadows.md};
      pointer-events: none;
      word-wrap: break-word;
    `
  }}
`
