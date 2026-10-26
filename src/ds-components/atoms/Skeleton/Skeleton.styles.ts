import styled, { css, keyframes } from "styled-components"

import { colors, motion, opacity, radius } from "@/foundation"

export type SkeletonVariant = "circle" | "rect" | "text"

const pulse = keyframes`
  from {
    opacity: ${opacity.visible};
  }

  to {
    opacity: ${opacity.disabled};
  }
`

const radiusMap: Record<SkeletonVariant, string> = {
  circle: radius.full,
  rect: radius.md,
  text: radius.sm,
}

export type StyledSkeletonProps = {
  $height: string
  $variant: SkeletonVariant
  $width: string
}

export const StyledSkeleton = styled.span<StyledSkeletonProps>`
  ${(props) => {
    const { $height, $variant, $width } = props

    return css`
      animation: ${pulse} ${motion.duration.slow} ${motion.easing.inOut} infinite alternate;
      background: ${colors.neutral[200]};
      border-radius: ${radiusMap[$variant]};
      display: block;
      flex-shrink: 0;
      height: ${$height};
      width: ${$width};

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `
  }}
`
