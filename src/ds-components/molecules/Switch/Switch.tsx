import MuiSwitch from "@mui/material/Switch"
import type { ChangeEvent, CSSProperties, ReactNode } from "react"
import { forwardRef } from "react"

import { Text } from "@/ds-components/atoms"

import { getSwitchSx, SwitchRow, SwitchWrapper } from "./Switch.styles"

type SwitchOwnProps = {
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
  size?: "small" | "medium"
  style?: CSSProperties
  value?: string
  onBlur?: () => void
  onChange?: (event: ChangeEvent<HTMLInputElement>, checked: boolean) => void
}

export type SwitchProps = SwitchOwnProps

export const Switch = forwardRef<HTMLInputElement, SwitchProps>((props, ref) => {
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
    size = "medium",
    style,
    value,
  } = props

  return (
    <SwitchWrapper className={className} style={style}>
      <SwitchRow>
        <MuiSwitch
          autoFocus={autoFocus}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          disableRipple
          id={id}
          name={name}
          onBlur={onBlur}
          onChange={onChange}
          required={required}
          size={size}
          slotProps={{ input: { ref } }}
          sx={getSwitchSx(disabled)}
          value={value}
        />
        <Text as="span" fontSize="sm">
          {label}
        </Text>
      </SwitchRow>
      {helperText && (
        <Text as="span" color="muted" fontSize="xs">
          {helperText}
        </Text>
      )}
    </SwitchWrapper>
  )
})

Switch.displayName = "Switch"
