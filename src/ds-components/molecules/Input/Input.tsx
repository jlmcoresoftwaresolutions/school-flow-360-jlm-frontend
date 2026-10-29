import type { ChangeEvent, ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId, useState } from "react"

import type { IconName } from "@/ds-components/atoms"
import { FieldLabel, FieldMessage, Icon } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"
import { stripNonDigits } from "@/utils/formats"
import { joinIds } from "@/utils/strings"

import type { MaskType } from "./Input.masks"
import { applyMask } from "./Input.masks"
import type { InputSize } from "./Input.styles"
import { InputControl, InputPasswordToggle, InputStartIcon, InputWrapper, StyledInput } from "./Input.styles"

// Deliberately not derived from React's own HTMLInputTypeAttribute: that type ends in a
// `(string & {})` catch-all for forward compatibility, which would let "date" back in through
// an Exclude/Omit since a string literal is still assignable to it. Listing every other native
// type explicitly is what actually blocks "date" at compile time, steering callers to DateInput.
type InputType =
  | "button"
  | "checkbox"
  | "color"
  | "datetime-local"
  | "email"
  | "file"
  | "hidden"
  | "image"
  | "month"
  | "number"
  | "password"
  | "radio"
  | "range"
  | "reset"
  | "search"
  | "submit"
  | "tel"
  | "text"
  | "time"
  | "url"
  | "week"

type InputOwnProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  elevated?: boolean
  error?: string
  helperText?: string
  hidePasswordLabel?: string
  invalid?: boolean
  mask?: MaskType
  numeric?: boolean
  showPasswordLabel?: string
  size?: InputSize
  startIcon?: IconName
  style?: CSSProperties
  title?: string
  type?: InputType
}

export type InputProps = InputOwnProps & Omit<ComponentPropsWithoutRef<"input">, keyof InputOwnProps>

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    "aria-describedby": ariaDescribedBy,
    borderRadius = "low",
    className,
    elevated = true,
    error,
    helperText,
    hidePasswordLabel = "Ocultar senha",
    id,
    invalid,
    mask,
    numeric,
    onChange,
    required,
    showPasswordLabel = "Mostrar senha",
    size = "medium",
    startIcon,
    style,
    title,
    type,
    ...rest
  } = props

  const generatedId = useId()

  const [isPasswordVisible, setIsPasswordVisible] = useState(false)

  const inputId = id ?? generatedId
  const messageId = `${inputId}-message`
  // `invalid` is for an error the field can't explain alone - e.g. a rejected login, where the message
  // sits once under the form and both fields point at it through aria-describedby.
  const hasError = Boolean(error) || Boolean(invalid)
  // A caller's own aria-describedby is kept, with the message appended to it.
  const describedBy = joinIds(ariaDescribedBy, (error || helperText) && messageId)
  // A password field gets a button to show what was typed, which switches it to a plain text field.
  const isPassword = type === "password"
  const inputType = isPassword && isPasswordVisible ? "text" : type

  // type stays "text" (rather than "number") so digits can be masked without the native
  // number input's quirks (spinners, "e"/"+"/"-", no leading zeros); inputMode still gives
  // mobile browsers a numeric keyboard. mask takes precedence over numeric when both are set.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (mask) event.target.value = applyMask(mask, event.target.value)
    else if (numeric) event.target.value = stripNonDigits(event.target.value)
    onChange?.(event)
  }

  return (
    <InputWrapper className={className} style={style}>
      {title && (
        <FieldLabel htmlFor={inputId} required={required}>
          {title}
        </FieldLabel>
      )}
      <InputControl>
        {startIcon && (
          <InputStartIcon $size={size}>
            <Icon color="muted" name={startIcon} size={size === "small" ? 16 : 20} />
          </InputStartIcon>
        )}
        <StyledInput
          $borderRadius={borderRadiusLevels[borderRadius]}
          $elevated={elevated}
          $hasEndButton={isPassword}
          $hasError={hasError}
          $hasStartIcon={Boolean(startIcon)}
          $size={size}
          aria-describedby={describedBy}
          aria-invalid={hasError ? true : undefined}
          id={inputId}
          ref={ref}
          required={required}
          {...rest}
          inputMode={mask || numeric ? "numeric" : undefined}
          onChange={handleChange}
          pattern={numeric && !mask ? "[0-9]*" : undefined}
          type={inputType}
        />
        {isPassword && (
          <InputPasswordToggle
            $size={size}
            aria-controls={inputId}
            aria-label={isPasswordVisible ? hidePasswordLabel : showPasswordLabel}
            disabled={rest.disabled}
            onClick={() => setIsPasswordVisible((visible) => !visible)}
            type="button"
          >
            <Icon
              color="secondary"
              name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
              size={size === "small" ? 16 : 20}
            />
          </InputPasswordToggle>
        )}
      </InputControl>
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </InputWrapper>
  )
})

Input.displayName = "Input"
