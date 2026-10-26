import MuiCheckbox from "@mui/material/Checkbox"
import type { ChangeEvent, CSSProperties, ReactNode } from "react"
import { forwardRef, useId } from "react"

import { FieldMessage, Text } from "@/ds-components/atoms"
import { joinIds } from "@/utils/strings"

import type { CheckboxSize } from "./Checkbox.styles"
import { CheckboxRow, CheckboxWrapper, getCheckboxSx } from "./Checkbox.styles"

type CheckboxOwnProps = {
  label: ReactNode
  autoFocus?: boolean
  checked?: boolean
  className?: string
  defaultChecked?: boolean
  disabled?: boolean
  error?: string
  helperText?: string
  id?: string
  name?: string
  required?: boolean
  size?: CheckboxSize
  style?: CSSProperties
  value?: string
  onBlur?: () => void
  onChange?: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void
}

export type CheckboxProps = CheckboxOwnProps

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const {
    autoFocus,
    checked,
    className,
    defaultChecked,
    disabled,
    error,
    helperText,
    id,
    label,
    name,
    onBlur,
    onChange,
    required,
    size = "large",
    style,
    value,
  } = props

  const generatedId = useId()

  const checkboxId = id ?? generatedId
  const messageId = `${checkboxId}-message`

  return (
    <CheckboxWrapper className={className} style={style}>
      <CheckboxRow>
        <MuiCheckbox
          autoFocus={autoFocus}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          disableRipple
          id={checkboxId}
          name={name}
          onBlur={onBlur}
          onChange={onChange}
          required={required}
          slotProps={{
            input: {
              "aria-describedby": joinIds((error || helperText) && messageId),
              "aria-invalid": error ? true : undefined,
              ref,
            },
          }}
          sx={getCheckboxSx(size, disabled, Boolean(error))}
          value={value}
        />
        <Text as="label" fontSize="sm" htmlFor={checkboxId}>
          {label}
        </Text>
      </CheckboxRow>
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </CheckboxWrapper>
  )
})

Checkbox.displayName = "Checkbox"
