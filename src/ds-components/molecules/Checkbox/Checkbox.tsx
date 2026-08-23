import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react"
import { forwardRef, useId } from "react"

import { Text } from "@/ds-components/atoms"

import { CheckboxRow, CheckboxWrapper, StyledCheckbox } from "./Checkbox.styles"

type CheckboxOwnProps = {
  label: ReactNode
  className?: string
  helperText?: string
  style?: CSSProperties
}

export type CheckboxProps = CheckboxOwnProps & Omit<ComponentPropsWithoutRef<"input">, keyof CheckboxOwnProps | "type">

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>((props, ref) => {
  const { className, helperText, id, label, style, ...rest } = props

  const generatedId = useId()

  const checkboxId = id ?? generatedId

  return (
    <CheckboxWrapper className={className} style={style}>
      <CheckboxRow>
        <StyledCheckbox id={checkboxId} ref={ref} type="checkbox" {...rest} />
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
