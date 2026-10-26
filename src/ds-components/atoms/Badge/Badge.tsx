import type { CSSProperties, ReactNode } from "react"

import { useTooltip } from "../Tooltip"
import type { BadgeTone } from "./Badge.styles"
import { badgeToneMap, StyledBadge, StyledBadgeDot } from "./Badge.styles"

export type BadgeProps = {
  children: ReactNode
  className?: string
  dot?: boolean
  style?: CSSProperties
  tone?: BadgeTone
  tooltip?: string
}

// A small status label. It is purely visual: which tone means which status (and the label text itself)
// is the caller's decision, so the DS doesn't hard-code a status taxonomy that the product hasn't approved.
// The text always carries the meaning - the dot and the tone are decoration for sighted users only.
export const Badge = (props: BadgeProps) => {
  const { children, className, dot = true, style, tone = "neutral", tooltip } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  const config = badgeToneMap[tone]

  return (
    <>
      <StyledBadge
        $background={config.background}
        $color={config.color}
        className={className}
        style={style}
        {...tooltipHandlers}
      >
        {dot && <StyledBadgeDot $color={config.dot} aria-hidden="true" />}
        {children}
      </StyledBadge>
      {tooltipElement}
    </>
  )
}
