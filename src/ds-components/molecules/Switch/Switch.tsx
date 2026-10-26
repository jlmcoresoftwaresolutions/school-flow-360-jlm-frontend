import MuiSwitch from "@mui/material/Switch"
import type { ChangeEvent, CSSProperties, ReactNode } from "react"
import { forwardRef, useId } from "react"

import { FieldMessage, Text } from "@/ds-components/atoms"
import { joinIds } from "@/utils/strings"

import { getSwitchSx, SwitchRow, SwitchWrapper } from "./Switch.styles"

type SwitchOwnProps = {
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
    error,
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

  const generatedId = useId()

  const messageId = `${id ?? generatedId}-message`

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
          slotProps={{
            input: {
              "aria-describedby": joinIds((error || helperText) && messageId),
              "aria-invalid": error ? true : undefined,
              ref,
            },
          }}
          sx={getSwitchSx(disabled)}
          value={value}
        />
        <Text as="span" fontSize="sm">
          {label}
        </Text>
      </SwitchRow>
      <FieldMessage error={error} helperText={helperText} id={messageId} />
    </SwitchWrapper>
  )
})

Switch.displayName = "Switch"
