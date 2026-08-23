import type { CSSProperties, ReactNode } from "react"

import {
  borderRadiusLevels,
  type BorderRadiusLevelsType,
  colors,
  semanticColors,
  type SemanticColorsType,
  shadows,
  translucency,
} from "@/foundation"

import { useTooltip } from "../Tooltip"
import { StyledCard } from "./Card.styles"

type TranslucentLevel = "low" | "medium" | "high"

export type CardProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  children?: ReactNode
  className?: string
  color?: keyof SemanticColorsType
  elevated?: boolean
  style?: CSSProperties
  tooltip?: string
  translucent?: TranslucentLevel | boolean
}

const glassEdgeGlow = "inset 0 1px 1px rgba(255, 255, 255, 0.4), inset 0 0 0 1px rgba(255, 255, 255, 0.16)"

const resolveTranslucentLevel = (value: TranslucentLevel | true): TranslucentLevel =>
  value === true ? "medium" : value

export const Card = (props: CardProps) => {
  const {
    borderRadius = "medium",
    children,
    className,
    color = "inverse",
    elevated = true,
    style,
    tooltip,
    translucent,
  } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  const translucentConfig = translucent
    ? translucency[resolveTranslucentLevel(translucent as TranslucentLevel | true)]
    : null
  const background = translucentConfig?.background ?? semanticColors[color]
  const backdropFilter = translucentConfig?.backdropFilter
  const boxShadowLayers = [elevated && shadows.md, translucentConfig && glassEdgeGlow].filter(Boolean)
  const boxShadow = boxShadowLayers.length > 0 ? boxShadowLayers.join(", ") : undefined
  const border = elevated || translucentConfig ? "none" : `1px solid ${colors.neutral[100]}`

  return (
    <>
      <StyledCard
        $backdropFilter={backdropFilter}
        $background={background}
        $border={border}
        $borderRadius={borderRadiusLevels[borderRadius]}
        $boxShadow={boxShadow}
        className={className}
        style={style}
        {...tooltipHandlers}
      >
        {children}
      </StyledCard>
      {tooltipElement}
    </>
  )
}
