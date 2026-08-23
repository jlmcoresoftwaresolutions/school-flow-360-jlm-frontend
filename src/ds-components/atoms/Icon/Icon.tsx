import type { CSSProperties } from "react"

import { colors, spacing, type SpacingType } from "@/foundation"

import { useTooltip } from "../Tooltip"
import { StyledIconWrapper } from "./Icon.styles"
import type { IconName } from "./iconMap"
import { iconMap } from "./iconMap"

type IconColor = "brand" | "danger" | "default" | "info" | "inverse" | "muted" | "secondary" | "success" | "warning"

const colorMap: Record<IconColor, string> = {
  brand: colors.primary[500],
  danger: colors.danger[500],
  default: colors.neutral[900],
  info: colors.info[500],
  inverse: colors.neutral[0],
  muted: colors.neutral[400],
  secondary: colors.neutral[600],
  success: colors.success[500],
  warning: colors.warning[500],
}

export type IconProps = {
  name: IconName
  className?: string
  color?: IconColor
  size?: keyof SpacingType
  style?: CSSProperties
  tooltip?: string
}

export const Icon = (props: IconProps) => {
  const { className, color = "default", name, size = 20, style, tooltip } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  const IconComponent = iconMap[name]

  return (
    <>
      <StyledIconWrapper $color={colorMap[color]} className={className} style={style} {...tooltipHandlers}>
        <IconComponent size={spacing[size]} />
      </StyledIconWrapper>
      {tooltipElement}
    </>
  )
}
