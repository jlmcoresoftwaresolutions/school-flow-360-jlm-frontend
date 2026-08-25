import type { CSSProperties } from "react"
import { createPortal } from "react-dom"

import { LoadingDot, LoadingOverlay, LoadingRingInner, LoadingRingOuter, LoadingSpinner } from "./Loading.styles"

export type LoadingProps = {
  className?: string
  style?: CSSProperties
}

export const Loading = (props: LoadingProps) => {
  const { className, style } = props

  return createPortal(
    <LoadingOverlay aria-label="Carregando..." className={className} role="status" style={style}>
      <LoadingSpinner>
        <LoadingRingOuter />
        <LoadingRingInner />
        <LoadingDot />
      </LoadingSpinner>
    </LoadingOverlay>,
    document.body,
  )
}
