import type { CSSProperties, ReactNode } from "react"
import { useLayoutEffect, useRef } from "react"
import { createPortal } from "react-dom"

import { spacing } from "@/foundation"

import { TooltipBalloon } from "./Tooltip.styles"

// The viewport box of the element a tooltip is anchored to (what getBoundingClientRect returns).
export type TooltipAnchorRect = {
  bottom: number
  left: number
  right: number
  top: number
}

export type TooltipProps = {
  children: ReactNode
  anchorRect?: TooltipAnchorRect
  className?: string
  style?: CSSProperties
  x?: number
  y?: number
}

// Space between the balloon and its element, and the least it keeps from the viewport's edges.
const anchorGap = Number.parseFloat(spacing[8])
const viewportMargin = Number.parseFloat(spacing[8])

// The balloon, rendered in document.body so no ancestor's overflow clips it. Anchored to an element
// (anchorRect), it sits centered below it - or above, when there is no room below - and shifts
// sideways to stay on screen; its size is only known once rendered, so it is placed in a layout
// effect, before the browser paints. With x/y instead, it sits just past that point (the cursor).
export const Tooltip = (props: TooltipProps) => {
  const { anchorRect, children, className, style, x, y } = props

  const balloonRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const balloon = balloonRef.current
    if (!balloon || !anchorRect) return

    const { height, width } = balloon.getBoundingClientRect()

    const below = anchorRect.bottom + anchorGap
    const above = anchorRect.top - anchorGap - height
    const fitsBelow = below + height <= window.innerHeight - viewportMargin
    const top = fitsBelow || above < viewportMargin ? below : above

    const centered = (anchorRect.left + anchorRect.right) / 2 - width / 2
    const left = Math.max(viewportMargin, Math.min(centered, window.innerWidth - viewportMargin - width))

    balloon.style.top = `${top}px`
    balloon.style.left = `${left}px`
    balloon.style.visibility = "visible"
  }, [anchorRect])

  return createPortal(
    <TooltipBalloon
      $x={anchorRect ? undefined : x}
      $y={anchorRect ? undefined : y}
      className={className}
      ref={balloonRef}
      role="tooltip"
      style={style}
    >
      {children}
    </TooltipBalloon>,
    document.body,
  )
}
