import type { ButtonHTMLAttributes, ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react"

import { borderRadiusLevels, type BorderRadiusLevelsType, semanticColors, type SemanticColorsType } from "@/foundation"

import { useTooltip } from "../Tooltip"
import type { ButtonSize, ButtonVariant } from "./Button.styles"
import { StyledButton } from "./Button.styles"

type ButtonOwnProps<C extends ElementType> = {
  children: ReactNode
  as?: C
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  color?: keyof SemanticColorsType
  endIcon?: ReactNode
  size?: ButtonSize
  startIcon?: ReactNode
  style?: CSSProperties
  tooltip?: string
  variant?: ButtonVariant
}

export type ButtonProps<C extends ElementType = "button"> = ButtonOwnProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof ButtonOwnProps<C>>

export const Button = <C extends ElementType = "button">(props: ButtonProps<C>) => {
  const {
    as,
    borderRadius = "low",
    children,
    className,
    color = "brand",
    endIcon,
    size = "medium",
    startIcon,
    style,
    tooltip,
    variant = "filled",
    ...rest
  } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  // type only makes sense on a real <button> - defaulting it to "button" (avoiding an accidental
  // form submit) would set an invalid attribute if as renders something else, like a router Link.
  const isNativeButton = as === undefined || as === "button"
  const type = isNativeButton ? ((rest as ButtonHTMLAttributes<HTMLButtonElement>).type ?? "button") : undefined

  return (
    <>
      <StyledButton
        $borderRadius={borderRadiusLevels[borderRadius]}
        $color={semanticColors[color]}
        $size={size}
        $variant={variant}
        as={as}
        className={className}
        style={style}
        {...rest}
        type={type}
        {...tooltipHandlers}
      >
        {startIcon}
        {children}
        {endIcon}
      </StyledButton>
      {tooltipElement}
    </>
  )
}
