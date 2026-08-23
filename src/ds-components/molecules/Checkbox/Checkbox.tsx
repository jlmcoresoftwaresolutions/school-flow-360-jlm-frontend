import MuiCheckbox from "@mui/material/Checkbox"
import type { ChangeEvent, CSSProperties, ReactNode } from "react"
import { forwardRef, useId } from "react"

import { Text } from "@/ds-components/atoms"

import { CheckboxRow, CheckboxWrapper, getCheckboxSx } from "./Checkbox.styles"

type CheckboxOwnProps = {
  label: ReactNode
  autoFocus?: boolean
  checked?: boolean
  className?: string
  defaultChecked?: boolean
  disabled?: boolean
  helperText?: string
  id?: string
  name?: string
  required?: boolean
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
    helperText,
    id,
    label,
    name,
    onBlur,
    onChange,
    required,
    style,
    value,
  } = props

  const generatedId = useId()

  const checkboxId = id ?? generatedId

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
          slotProps={{ input: { ref } }}
          sx={getCheckboxSx(disabled)}
          value={value}
        />
        <Text as="label" fontSize="sm" htmlFor={checkboxId}>
          {label}
        </Text>
      </CheckboxRow>
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </CheckboxWrapper>
  )
})

Checkbox.displayName = "Checkbox"
