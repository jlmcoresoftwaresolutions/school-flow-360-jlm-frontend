import styled, { css } from "styled-components"

import { colors, radius, shadows, spacing, typography, zIndex } from "@/foundation"

const cursorOffset = 16

export type TooltipBalloonProps = {
  $x?: number
  $y?: number
}

// Placed either just past the cursor ($x/$y) or, anchored to an element, by Tooltip itself once its
// size is known - hidden until then so it never flashes at the wrong spot.
export const TooltipBalloon = styled.div<TooltipBalloonProps>`
  ${(props) => {
    const { $x, $y } = props

    const followsCursor = $x !== undefined && $y !== undefined

    return css`
      position: fixed;
      ${followsCursor
        ? css`
            top: ${$y + cursorOffset}px;
            left: ${$x + cursorOffset}px;
          `
        : css`
            top: 0;
            left: 0;
            visibility: hidden;
          `}
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
