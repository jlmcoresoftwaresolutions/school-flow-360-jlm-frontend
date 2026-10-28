import type { CSSProperties } from "react"

import { StyledFieldMessage } from "./FieldMessage.styles"

export type FieldMessageProps = {
  id: string
  className?: string
  error?: string
  helperText?: string
  style?: CSSProperties
}

// The line of text under a form field: the error when there is one (in red, replacing the helper text,
// which matters less while the value is wrong), otherwise the helper text, otherwise nothing. The
// field points its aria-describedby at `id`, so a screen reader reads this message with the field.
export const FieldMessage = (props: FieldMessageProps) => {
  const { className, error, helperText, id, style } = props

  const message = error || helperText

  if (!message) return null

  return (
    // Keyed by the text, so a new message is a new element and plays the appear animation again.
    <StyledFieldMessage $error={Boolean(error)} className={className} id={id} key={message} style={style}>
      {message}
    </StyledFieldMessage>
  )
}
