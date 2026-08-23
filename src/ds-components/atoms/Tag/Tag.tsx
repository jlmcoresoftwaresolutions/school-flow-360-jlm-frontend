import type { CSSProperties, ReactNode } from "react"

import { translucency } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

import { useTooltip } from "../Tooltip"
import type { TagColor, TagFontSize, TagFontWeight, TagPadding, TagVariant } from "./Tag.styles"
import { StyledTag, tagColorMap } from "./Tag.styles"

type TranslucentLevel = "low" | "medium" | "high"

export type TagProps = {
  children: ReactNode
  className?: string
  color?: TagColor
  elevated?: boolean
  endIcon?: ReactNode
  fontSize?: TagFontSize
  fontWeight?: TagFontWeight
  padding?: TagPadding
  startIcon?: ReactNode
  style?: CSSProperties
  textColor?: string
  tooltip?: string
  translucent?: TranslucentLevel | boolean
  variant?: TagVariant
}

const resolveTranslucentLevel = (value: TranslucentLevel | true): TranslucentLevel =>
  value === true ? "medium" : value

// Kept separate from translucency.ts's own alphas, which are baked into a fixed white
// background there - the Tag instead tints its own resolved color, not white.
const translucentAlpha: Record<TranslucentLevel, number> = {
  high: 0.1,
  low: 0.7,
  medium: 0.4,
}

export const Tag = (props: TagProps) => {
  const {
    children,
    className,
    color = "default",
    elevated = true,
    endIcon,
    fontSize = "sm",
    fontWeight = "medium",
    padding = "sm",
    startIcon,
    style,
    textColor,
    tooltip,
    translucent,
    variant = "solid",
  } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  // translucent takes priority over variant - it replaces the fill entirely with a frosted-glass
  // tint of the color's own solid background, rather than combining with outlined/soft styling.
  const translucentLevel = translucent ? resolveTranslucentLevel(translucent as TranslucentLevel | true) : null
  const solidConfig = tagColorMap.solid[color]
  const {
    background,
    border,
    color: defaultTextColor,
  } = translucentLevel
    ? {
        background: hexToRgba(solidConfig.background, translucentAlpha[translucentLevel]),
        border: undefined,
        color: solidConfig.color,
      }
    : tagColorMap[variant][color]
  const backdropFilter = translucentLevel ? translucency[translucentLevel].backdropFilter : undefined

  return (
    <>
      <StyledTag
        $backdropFilter={backdropFilter}
        $background={background}
        $border={border}
        $color={textColor ?? defaultTextColor}
        $elevated={elevated}
        $fontSize={fontSize}
        $fontWeight={fontWeight}
        $padding={padding}
        className={className}
        style={style}
        {...tooltipHandlers}
      >
        {startIcon}
        {children}
        {endIcon}
      </StyledTag>
      {tooltipElement}
    </>
  )
}
