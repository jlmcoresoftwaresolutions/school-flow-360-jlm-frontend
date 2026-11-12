import type { ChangeEventHandler, ComponentPropsWithoutRef, CSSProperties, FocusEventHandler } from "react"
import { forwardRef, useId, useState } from "react"

import { FieldLabel, FieldMessage } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"
import { joinIds } from "@/utils/strings"

import { CharacterCounter, MessageSlot, StyledTextarea, TextareaFooter, TextareaWrapper } from "./Textarea.styles"

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

// A multi-line field. With a `maxLength`, a "x/y" counter of the characters typed shows while the field
// has focus, on the right of the line where the helper text or the error is (with a gap from it, so a
// long message wraps instead of touching it), and the limit itself is the native one, so nothing
// beyond it can be typed.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>((props, ref) => {
  const {
    "aria-describedby": ariaDescribedBy,
    borderRadius = "low",
    className,
    elevated = true,
    error,
    helperText,
    id,
    maxLength,
    onBlur,
    onChange,
    onFocus,
    required,
    style,
    title,
    value,
    ...rest
  } = props

  const generatedId = useId()

  const [isFocused, setIsFocused] = useState(false)
  // The characters typed, read from the field itself on focus and on every change, so it works the same
  // for a field the parent controls and for one it doesn't (react-hook-form's register).
  const [typedLength, setTypedLength] = useState(0)

  const hasCounter = maxLength !== undefined
  const length = value === undefined ? typedLength : String(value).length

  const handleFocus: FocusEventHandler<HTMLTextAreaElement> = (event) => {
    setTypedLength(event.target.value.length)
    setIsFocused(true)
    onFocus?.(event)
  }

  const handleBlur: FocusEventHandler<HTMLTextAreaElement> = (event) => {
    setIsFocused(false)
    onBlur?.(event)
  }

  const handleChange: ChangeEventHandler<HTMLTextAreaElement> = (event) => {
    setTypedLength(event.target.value.length)
    onChange?.(event)
  }

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
        maxLength={maxLength}
        onBlur={handleBlur}
        onChange={handleChange}
        onFocus={handleFocus}
        ref={ref}
        required={required}
        value={value}
        {...rest}
      />
      {hasCounter ? (
        <TextareaFooter>
          <MessageSlot>
            <FieldMessage error={error} helperText={helperText} id={messageId} />
          </MessageSlot>
          <CharacterCounter $atLimit={length >= maxLength} $visible={isFocused} aria-hidden="true">
            {length}/{maxLength}
          </CharacterCounter>
        </TextareaFooter>
      ) : (
        <FieldMessage error={error} helperText={helperText} id={messageId} />
      )}
    </TextareaWrapper>
  )
})

Textarea.displayName = "Textarea"
