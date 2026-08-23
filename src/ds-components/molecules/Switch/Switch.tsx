import type { ComponentPropsWithoutRef, CSSProperties, ReactNode } from "react"
import { forwardRef } from "react"

import { Text } from "@/ds-components/atoms"

import { HiddenSwitchInput, SwitchRow, SwitchThumb, SwitchTrack, SwitchWrapper } from "./Switch.styles"

type SwitchOwnProps = {
  label: ReactNode
  className?: string
  helperText?: string
  style?: CSSProperties
}

export type SwitchProps = SwitchOwnProps & Omit<ComponentPropsWithoutRef<"input">, keyof SwitchOwnProps | "type">

export const Switch = forwardRef<HTMLInputElement, SwitchProps>((props, ref) => {
  const { className, helperText, label, style, ...rest } = props

  return (
    <SwitchWrapper className={className} style={style}>
      <SwitchRow>
        <HiddenSwitchInput ref={ref} type="checkbox" {...rest} />
        <SwitchTrack>
          <SwitchThumb />
        </SwitchTrack>
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
