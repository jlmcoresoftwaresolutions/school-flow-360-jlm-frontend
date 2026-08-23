import type { MouseEvent } from "react"
import { useState } from "react"

import { Tooltip } from "./Tooltip"

type Position = {
  x: number
  y: number
}

export const useTooltip = (tooltip?: string) => {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState<Position>({ x: 0, y: 0 })

  const onMouseEnter = (event: MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY })
    setIsVisible(true)
  }

  const onMouseLeave = () => {
    setIsVisible(false)
  }

  const onMouseMove = (event: MouseEvent) => {
    setPosition({ x: event.clientX, y: event.clientY })
  }

  const tooltipElement =
    tooltip && isVisible ? (
      <Tooltip x={position.x} y={position.y}>
        {tooltip}
      </Tooltip>
    ) : null

  return {
    tooltipElement,
    tooltipHandlers: { onMouseEnter, onMouseLeave, onMouseMove },
  }
}
