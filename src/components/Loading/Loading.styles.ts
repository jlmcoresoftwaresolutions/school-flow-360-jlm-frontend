import styled, { keyframes } from "styled-components"

import { colors, spacing, translucency, zIndex } from "@/foundation"

const spin = keyframes`
  to {
    transform: rotate(360deg);
  }
`

export const LoadingOverlay = styled.div`
  align-items: center;
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

// 1s has no corresponding motion token: motion.duration models one-shot transitions, not the
// period of a continuously looping spinner (which would look frantic at those speeds).
export const LoadingSpinner = styled.div`
  animation: ${spin} 1s linear infinite;
  border: ${spacing[4]} solid ${colors.neutral[200]};
  border-radius: 50%;
  border-top-color: ${colors.primary[500]};
  height: ${spacing[48]};
  width: ${spacing[48]};
`
