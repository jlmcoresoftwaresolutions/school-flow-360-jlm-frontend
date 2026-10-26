import type { CSSProperties } from "react"

import { spacing } from "@/foundation"

import type { SkeletonVariant } from "./Skeleton.styles"
import { StyledSkeleton } from "./Skeleton.styles"

export type SkeletonProps = {
  className?: string
  height?: string
  style?: CSSProperties
  variant?: SkeletonVariant
  width?: string
}

// A placeholder block for content that is still loading. It is decorative (hidden from assistive
// tech): put aria-busy on the region being loaded to announce the state, not on each block.
export const Skeleton = (props: SkeletonProps) => {
  const { className, height, style, variant = "text", width } = props

  let resolvedHeight = height ?? spacing[16]
  let resolvedWidth = width ?? "100%"

  if (variant === "rect") {
    resolvedHeight = height ?? spacing[64]
  } else if (variant === "circle") {
    // A circle is only a circle when both sides match, so one given side sizes both.
    const size = width ?? height ?? spacing[40]

    resolvedHeight = size
    resolvedWidth = size
  }

  return (
    <StyledSkeleton
      $height={resolvedHeight}
      $variant={variant}
      $width={resolvedWidth}
      aria-hidden="true"
      className={className}
      style={style}
    />
  )
}
