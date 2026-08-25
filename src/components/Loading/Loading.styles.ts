import styled, { keyframes } from "styled-components"

import { colors, motion, opacity, spacing, translucency, zIndex } from "@/foundation"

const fadeIn = keyframes`
  from {
    opacity: ${opacity.hidden};
  }
  to {
    opacity: ${opacity.visible};
  }
`

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

const spinReverse = keyframes`
  to {
    transform: rotate(-360deg);
  }
`

const pulse = keyframes`
  0%,
  100% {
    opacity: ${opacity.visible};
    transform: scale(1);
  }
  50% {
    opacity: ${opacity.disabled};
    transform: scale(0.75);
  }
`

export const LoadingOverlay = styled.div`
  align-items: center;
  animation: ${fadeIn} ${motion.duration.normal} ${motion.easing.out};
  backdrop-filter: ${translucency.low.backdropFilter};
  background: ${translucency.low.background};
  bottom: 0;
  display: flex;
  justify-content: center;
  left: 0;
  position: fixed;
  right: 0;
  top: 0;
  z-index: ${zIndex.overlay};
`

export const LoadingSpinner = styled.div`
  height: ${spacing[64]};
  position: relative;
  width: ${spacing[64]};
`

// 1.2s/0.8s/1s have no corresponding motion tokens: motion.duration models one-shot transitions,
// not the period of a continuously looping animation (which would look frantic at those speeds).
// The two rings spin in opposite directions at different speeds so the shape reads as one
// mechanism rather than two independent spinners layered on top of each other.
export const LoadingRingOuter = styled.div`
  animation: ${spin} 1.2s linear infinite;
  border: ${spacing[4]} solid ${colors.neutral[200]};
  border-radius: 50%;
  border-top-color: ${colors.primary[500]};
  height: 100%;
  inset: 0;
  position: absolute;
  width: 100%;
`

export const LoadingRingInner = styled.div`
  animation: ${spinReverse} 0.8s linear infinite;
  border: ${spacing[4]} solid transparent;
  border-bottom-color: ${colors.primary[300]};
  border-radius: 50%;
  border-right-color: ${colors.primary[300]};
  height: 60%;
  inset: 20%;
  position: absolute;
  width: 60%;
`

export const LoadingDot = styled.div`
  animation: ${pulse} 1s ease-in-out infinite;
  background: ${colors.primary[500]};
  border-radius: 50%;
  height: ${spacing[12]};
  inset: 0;
  margin: auto;
  position: absolute;
  width: ${spacing[12]};
`
