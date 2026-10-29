import type { FocusEvent, MouseEvent } from "react"
import { useState } from "react"

import type { TooltipAnchorRect } from "./Tooltip"
import { Tooltip } from "./Tooltip"

// "element" (the default): the balloon sits by the hovered or focused element. "cursor": it follows
// the mouse, for a large area where pointing at the exact spot matters.
export type TooltipAnchor = "cursor" | "element"

export type UseTooltipOptions = {
  anchor?: TooltipAnchor
}

type TooltipHandlers = {
  onBlur?: (event: FocusEvent<Element>) => void
  onFocus?: (event: FocusEvent<Element>) => void
  onMouseEnter?: (event: MouseEvent<Element>) => void
  onMouseLeave?: (event: MouseEvent<Element>) => void
  onMouseMove?: (event: MouseEvent<Element>) => void
}

type TooltipPlacement = { anchorRect: TooltipAnchorRect } | { x: number; y: number }

const toAnchorRect = (element: Element): TooltipAnchorRect => {
  const { bottom, left, right, top } = element.getBoundingClientRect()

  return { bottom, left, right, top }
}

// Shows `tooltip` for whatever element the returned handlers are spread on. Anchored to the element
// it also shows on keyboard focus; following the cursor it is mouse-only. Without a `tooltip` no
// handlers are returned, so a caller's own mouse/focus handlers are left alone.
export const useTooltip = (tooltip?: string, options: UseTooltipOptions = {}) => {
  const { anchor = "element" } = options

  const [placement, setPlacement] = useState<TooltipPlacement | null>(null)

  const hide = () => setPlacement(null)

  const showAtElement = (event: FocusEvent<Element> | MouseEvent<Element>) =>
    setPlacement({ anchorRect: toAnchorRect(event.currentTarget) })

  const showAtCursor = (event: MouseEvent<Element>) => setPlacement({ x: event.clientX, y: event.clientY })

  let tooltipHandlers: TooltipHandlers = {}

  if (tooltip && anchor === "cursor") {
    tooltipHandlers = { onMouseEnter: showAtCursor, onMouseLeave: hide, onMouseMove: showAtCursor }
  } else if (tooltip) {
    tooltipHandlers = { onBlur: hide, onFocus: showAtElement, onMouseEnter: showAtElement, onMouseLeave: hide }
  }

  const tooltipElement = tooltip && placement ? <Tooltip {...placement}>{tooltip}</Tooltip> : null

  return { tooltipElement, tooltipHandlers }
}
