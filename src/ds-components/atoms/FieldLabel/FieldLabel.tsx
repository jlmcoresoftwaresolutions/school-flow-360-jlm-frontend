import type { CSSProperties, ReactNode } from "react"

import { Text } from "../Text"
import { StyledRequiredMark } from "./FieldLabel.styles"

export type FieldLabelProps = {
  children: ReactNode
  htmlFor: string
  className?: string
  required?: boolean
  style?: CSSProperties
}

// The label above a form field. `required` adds a red asterisk; it is aria-hidden because the field
// itself carries required (or aria-required), which is what a screen reader announces.
export const FieldLabel = (props: FieldLabelProps) => {
  const { children, className, htmlFor, required, style } = props

  return (
    <Text as="label" className={className} fontSize="sm" fontWeight="medium" htmlFor={htmlFor} style={style}>
      {children}
      {required && <StyledRequiredMark aria-hidden="true">*</StyledRequiredMark>}
    </Text>
  )
}
