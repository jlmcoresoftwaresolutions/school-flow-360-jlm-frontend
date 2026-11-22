import type { ComponentPropsWithoutRef, TransitionEvent } from "react"
import { useState } from "react"

import { StyledCollapsibleContent, StyledCollapsibleContentInner } from "./Collapsible.styles"
import { useCollapsibleContext } from "./CollapsibleContext"

export type CollapsibleContentProps = Omit<ComponentPropsWithoutRef<"div">, "hidden" | "id">

// The part of a Collapsible that is shown while it is open and hidden while it is closed. It slides open and
// closed, stays mounted the whole time (so what it holds keeps its state) and, once closed, is inert and
// not visible. className, style and the other div attributes go on the outer element.
export const CollapsibleContent = (props: CollapsibleContentProps) => {
  const { children, onTransitionEnd, ...rest } = props

  const { contentId, open } = useCollapsibleContext()

  // The open state the last slide ended at: the content is only left unclipped once it is open and the
  // slide to open has ended, and is clipped again as soon as it starts to close.
  const [settledOpen, setSettledOpen] = useState(open)

  const handleTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    onTransitionEnd?.(event)

    if (event.target === event.currentTarget) setSettledOpen(open)
  }

  return (
    <StyledCollapsibleContent {...rest} $open={open} id={contentId} inert={!open} onTransitionEnd={handleTransitionEnd}>
      <StyledCollapsibleContentInner $clip={!(open && settledOpen)}>{children}</StyledCollapsibleContentInner>
    </StyledCollapsibleContent>
  )
}
