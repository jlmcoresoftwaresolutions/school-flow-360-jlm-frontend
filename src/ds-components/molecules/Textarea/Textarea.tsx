import type { ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId } from "react"

import { Text } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"

import { StyledTextarea, TextareaWrapper } from "./Textarea.styles"

type TextareaOwnProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  elevated?: boolean
  helperText?: string
  style?: CSSProperties
  title?: string
}

export type TextareaProps = TextareaOwnProps & Omit<ComponentPropsWithoutRef<"textarea">, keyof TextareaOwnProps>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const { borderRadius = "medium", className, elevated = true, helperText, id, style, title, ...rest } = props

  const generatedId = useId()

  const textareaId = id ?? generatedId

  return (
    <TextareaWrapper className={className} style={style}>
      {title && (
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={textareaId}>
          {title}
        </Text>
      )}
      <StyledTextarea
        $borderRadius={borderRadiusLevels[borderRadius]}
        $elevated={elevated}
        id={textareaId}
        ref={ref}
        {...rest}
      />
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </TextareaWrapper>
  )
})

Textarea.displayName = "Textarea"
