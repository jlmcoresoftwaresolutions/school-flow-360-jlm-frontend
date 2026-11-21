import type { ComponentPropsWithRef, CSSProperties } from "react"

import { Icon } from "../Icon"
import type { IconName } from "../Icon/iconMap"
import { useTooltip } from "../Tooltip"
import type { IconButtonColor, IconButtonSize } from "./IconButton.styles"
import { iconButtonSizeMap, StyledIconButton } from "./IconButton.styles"

type IconButtonOwnProps = {
  icon: IconName
  label: string
  className?: string
  color?: IconButtonColor
  size?: IconButtonSize
  style?: CSSProperties
  tooltip?: string
}

export type IconButtonProps = IconButtonOwnProps & Omit<ComponentPropsWithRef<"button">, keyof IconButtonOwnProps>

// A button that shows only an icon: square, transparent until hovered, in the given color. With no
// visible text, `label` is its accessible name and, unless `tooltip` says otherwise, also the tooltip
// that explains it on hover and keyboard focus (an empty `tooltip` turns it off). It owns no copy.
export const IconButton = (props: IconButtonProps) => {
  const { className, color = "default", icon, label, size = "medium", style, tooltip = label, type, ...rest } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip || undefined)

  return (
    <>
      <StyledIconButton
        $color={color}
        $size={size}
        aria-label={label}
        className={className}
        style={style}
        {...rest}
        type={type ?? "button"}
        {...tooltipHandlers}
      >
        <Icon color="inherit" name={icon} size={iconButtonSizeMap[size].icon} />
      </StyledIconButton>
      {tooltipElement}
    </>
  )
}
