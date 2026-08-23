import type { CSSProperties } from "react"
import { createPortal } from "react-dom"

import { LoadingOverlay, LoadingSpinner } from "./Loading.styles"

export type LoadingProps = {
  className?: string
  label?: string
  style?: CSSProperties
}

export const Loading = (props: LoadingProps) => {
  const { className, label = "Carregando...", style } = props

  return createPortal(
    <LoadingOverlay aria-label={label} className={className} role="status" style={style}>
      <LoadingSpinner />
    </LoadingOverlay>,
    document.body,
  )
}
