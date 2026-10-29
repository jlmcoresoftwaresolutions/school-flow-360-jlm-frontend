import type { CSSProperties } from "react"
import { createPortal } from "react-dom"

import { Text } from "@/ds-components/atoms"

import {
  LoadingDot,
  LoadingMessage,
  LoadingOverlay,
  LoadingRingInner,
  LoadingRingOuter,
  LoadingSpinner,
} from "./Loading.styles"

export type LoadingProps = {
  className?: string
  label?: string
  message?: string
  style?: CSSProperties
}

export const Loading = (props: LoadingProps) => {
  const { className, label = "Carregando...", message, style } = props

  return createPortal(
    <LoadingOverlay aria-label={label} className={className} role="status" style={style}>
      <LoadingSpinner>
        <LoadingRingOuter />
        <LoadingRingInner />
        <LoadingDot />
      </LoadingSpinner>

      {/* Visible text under the spinner, for a wait long enough to need an explanation. Being inside
          the status region, it is also announced when it appears. */}
      {message && (
        <LoadingMessage>
          <Text as="p" align="center" color="secondary" fontSize="sm" semibold>
            {message}
          </Text>
        </LoadingMessage>
      )}
    </LoadingOverlay>,
    document.body,
  )
}
