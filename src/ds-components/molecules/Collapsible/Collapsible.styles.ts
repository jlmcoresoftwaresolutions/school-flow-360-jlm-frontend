import styled, { css } from "styled-components"

import { motion } from "@/foundation"

export type StyledCollapsibleContentProps = {
  $open: boolean
}

// The height slides between 0 and the content's own height by animating a single grid row between 0fr and
// 1fr, which needs no measuring. While closed it is also visibility: hidden - applied only once the slide
// is over - so what is inside leaves the tab order and the reading order. Reduced motion keeps a
// near-zero duration instead of none, so the transition still ends and the owner is still told.
export const StyledCollapsibleContent = styled.div<StyledCollapsibleContentProps>`
  ${(props) => {
    const { $open } = props

    return css`
      display: grid;
      grid-template-rows: ${$open ? "1fr" : "0fr"};
      transition:
        grid-template-rows ${motion.duration.normal} ${motion.easing.ease},
        visibility 0s linear ${$open ? "0s" : motion.duration.normal};
      visibility: ${$open ? "visible" : "hidden"};

      @media (prefers-reduced-motion: reduce) {
        transition-duration: 0.01ms;
        transition-delay: 0s;
      }
    `
  }}
`

export type StyledCollapsibleContentInnerProps = {
  $clip: boolean
}

// The row's content. It has to be clipped while the row is shorter than the content (opening, closing and
// closed), but not once it is fully open, or it would cut off what overflows it: focus rings, shadows and
// the popups of the fields inside, like a date picker's calendar.
export const StyledCollapsibleContentInner = styled.div<StyledCollapsibleContentInnerProps>`
  min-height: 0;
  overflow: ${(props) => (props.$clip ? "hidden" : "visible")};
`
