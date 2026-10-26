import type { ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId } from "react"

import { FieldLabel, FieldMessage } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"
import { joinIds } from "@/utils/strings"

import { StyledTextarea, TextareaWrapper } from "./Textarea.styles"

type TextareaOwnProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  elevated?: boolean
  error?: string
  helperText?: string
  style?: CSSProperties
  title?: string
}

export type TextareaProps = TextareaOwnProps & Omit<ComponentPropsWithoutRef<"textarea">, keyof TextareaOwnProps>

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    "aria-describedby": ariaDescribedBy,
    borderRadius = "low",
    className,
    elevated = true,
    error,
    helperText,
    id,
    required,
    style,
    title,
    ...rest
  } = props

  const generatedId = useId()

  const textareaId = id ?? generatedId
  const messageId = `${textareaId}-message`
  const describedBy = joinIds(ariaDescribedBy, (error || helperText) && messageId)

  return (
    <TextareaWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={textareaId} required={required}>
          {title}
        </FieldLabel>
      )}
      <StyledTextarea
        $borderRadius={borderRadiusLevels[borderRadius]}
        $elevated={elevated}
        $hasError={Boolean(error)}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        id={textareaId}
        ref={ref}
        required={required}
        {...rest}
      />
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </TextareaWrapper>
  )
})

Textarea.displayName = "Textarea"
