import type { CSSProperties } from "react"
import type { ToastPosition } from "react-toastify/unstyled"
import { Slide, ToastContainer } from "react-toastify/unstyled"

import { StyledToastWrapper } from "./Toast.styles"

export type ToastProps = {
  className?: string
  position?: ToastPosition
  style?: CSSProperties
}

// Mounted once at the app root (see main.tsx), the same way GlobalLoading is - toasts are then
// triggered imperatively from anywhere via the toast function exported from ./toastTrigger, never
// by rendering this component again. theme and transition are fixed rather than exposed as props:
// Toast.styles.ts only rebuilds the CSS for the "colored" theme paired with the Slide transition,
// so any other combination would render react-toastify's class names with no matching styles.
export const Toast = (props: ToastProps) => {
  const { className, position = "top-right", style } = props

  return (
    <StyledToastWrapper className={className} style={style}>
      <ToastContainer position={position} theme="colored" transition={Slide} />
    </StyledToastWrapper>
  )
}
