import type { CSSProperties, ReactNode } from "react"
import { createPortal } from "react-dom"

import { TooltipBalloon } from "./Tooltip.styles"

export type TooltipProps = {
  children: ReactNode
  x: number
  y: number
  className?: string
  style?: CSSProperties
}

export const Tooltip = (props: TooltipProps) => {
  const { children, className, style, x, y } = props

  return createPortal(
    <TooltipBalloon $x={x} $y={y} className={className} style={style}>
      {children}
    </TooltipBalloon>,
    document.body,
  )
}
