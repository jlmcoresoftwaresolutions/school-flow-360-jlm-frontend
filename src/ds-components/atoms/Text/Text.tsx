import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react"

import { semanticColors, type SemanticColorsType } from "@/foundation"

import { useTooltip } from "../Tooltip"
import type { TextAlign, TextFontSize, TextFontWeight, TextTransform } from "./Text.styles"
import { StyledText } from "./Text.styles"

type TextColor = keyof SemanticColorsType

type TextOwnProps<C extends ElementType> = {
  children: ReactNode
  align?: TextAlign
  as?: C
  bold?: boolean
  capitalize?: boolean
  className?: string
  color?: TextColor
  fontSize?: TextFontSize
  fontWeight?: TextFontWeight
  lowercase?: boolean
  semibold?: boolean
  style?: CSSProperties
  superbold?: boolean
  tooltip?: string
  uppercase?: boolean
}

export type TextProps<C extends ElementType = "p"> = TextOwnProps<C> &
  Omit<ComponentPropsWithoutRef<C>, keyof TextOwnProps<C>>

export const Text = <C extends ElementType = "p">(props: TextProps<C>) => {
  const {
    align,
    as,
    bold,
    capitalize,
    children,
    className,
    color = "default",
    fontSize = "md",
    fontWeight = "regular",
    lowercase,
    semibold,
    style,
    superbold,
    tooltip,
    uppercase,
    ...rest
  } = props

  const { tooltipElement, tooltipHandlers } = useTooltip(tooltip)

  let resolvedFontWeight: TextFontWeight = fontWeight
  if (superbold) resolvedFontWeight = "superbold"
  else if (bold) resolvedFontWeight = "bold"
  else if (semibold) resolvedFontWeight = "semibold"

  let textTransform: TextTransform | undefined
  if (uppercase) textTransform = "uppercase"
  else if (lowercase) textTransform = "lowercase"
  else if (capitalize) textTransform = "capitalize"

  return (
    <>
      <StyledText
        $align={align}
        $color={semanticColors[color]}
        $fontSize={fontSize}
        $fontWeight={resolvedFontWeight}
        $textTransform={textTransform}
        as={as}
        className={className}
        style={style}
        {...rest}
        {...tooltipHandlers}
      >
        {children}
      </StyledText>
      {tooltipElement}
    </>
  )
}
