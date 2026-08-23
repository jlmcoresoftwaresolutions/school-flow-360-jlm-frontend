import type { ChangeEvent, ComponentPropsWithoutRef, CSSProperties } from "react"
import { forwardRef, useId } from "react"

import { Text } from "@/ds-components/atoms"
import { borderRadiusLevels, type BorderRadiusLevelsType } from "@/foundation"
import { stripNonDigits } from "@/utils/formats"

import type { MaskType } from "./Input.masks"
import { applyMask } from "./Input.masks"
import { InputWrapper, StyledInput } from "./Input.styles"

type InputOwnProps = {
  borderRadius?: keyof BorderRadiusLevelsType
  className?: string
  elevated?: boolean
  helperText?: string
  mask?: MaskType
  numeric?: boolean
  style?: CSSProperties
  title?: string
}

export type InputProps = InputOwnProps & Omit<ComponentPropsWithoutRef<"input">, keyof InputOwnProps>

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    borderRadius = "medium",
    className,
    elevated = true,
    helperText,
    id,
    mask,
    numeric,
    onChange,
    style,
    title,
    ...rest
  } = props

  const generatedId = useId()

  const inputId = id ?? generatedId

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
        <Text as="label" fontSize="sm" fontWeight="medium" htmlFor={inputId}>
          {title}
        </Text>
      )}
      <StyledInput
        $borderRadius={borderRadiusLevels[borderRadius]}
        $elevated={elevated}
        id={inputId}
        ref={ref}
        {...rest}
        inputMode={mask || numeric ? "numeric" : undefined}
        onChange={handleChange}
        pattern={numeric && !mask ? "[0-9]*" : undefined}
      />
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </InputWrapper>
  )
})

Input.displayName = "Input"
