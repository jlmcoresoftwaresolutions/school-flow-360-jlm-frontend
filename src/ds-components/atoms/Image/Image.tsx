import type { CSSProperties } from "react"

import {
  borderRadiusLevels,
  type BorderRadiusLevelsType,
  shadows,
  type ShadowsType,
  spacing,
  type SpacingType,
} from "@/foundation"

import { useTooltip } from "../Tooltip"
import { StyledImage } from "./Image.styles"

export type ImageProps = {
  alt: string
  src: string
  borderRadius?: keyof BorderRadiusLevelsType
  boxShadow?: keyof ShadowsType
  className?: string
  size?: keyof SpacingType
  style?: CSSProperties
  tooltip?: string
}

export const Image = (props: ImageProps) => {
  const { alt, borderRadius = "medium", boxShadow = "xl", className, size = 48, src, style, tooltip } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  return (
    <>
      <StyledImage
        $borderRadius={borderRadiusLevels[borderRadius]}
        $boxShadow={shadows[boxShadow]}
        $size={spacing[size]}
        alt={alt}
        className={className}
        src={src}
        style={style}
        {...tooltipHandlers}
      />
      {tooltipElement}
    </>
  )
}
