import styled, { css, keyframes } from "styled-components"

import { colors, motion, opacity, radius, shadows, spacing, zIndex } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

export type ModalSize = "lg" | "md" | "sm"

const sizeMap: Record<ModalSize, string> = {
  lg: `calc(${spacing[256]} * 2 + ${spacing[128]})`,
  md: `calc(${spacing[256]} * 2)`,
  sm: `calc(${spacing[256]} + ${spacing[128]})`,
}

const fadeIn = keyframes`
  from {
    opacity: ${opacity.hidden};
  }

  to {
    opacity: ${opacity.visible};
  }
`

const rise = keyframes`
  from {
    opacity: ${opacity.hidden};
    transform: translateY(${spacing[16]}) scale(0.98);
  }

  to {
    opacity: ${opacity.visible};
    transform: translateY(0) scale(1);
  }
`

export const StyledModalOverlay = styled.div`
  align-items: center;
  animation: ${fadeIn} ${motion.duration.normal} ${motion.easing.out};
  background: ${hexToRgba(colors.neutral[900], 0.4)};
  display: flex;
  inset: 0;
  justify-content: center;
  padding: ${spacing[16]};
  position: fixed;
  z-index: ${zIndex.modal};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export type StyledModalDialogProps = {
  $size: ModalSize
}

export const StyledModalDialog = styled.div<StyledModalDialogProps>`
  ${(props) => {
    const { $size } = props

    return css`
      animation: ${rise} ${motion.duration.normal} ${motion.easing.out};
      background: ${colors.neutral[0]};
      border-radius: ${radius.lg};
      box-shadow: ${shadows.xl};
      display: flex;
      flex-direction: column;
      max-height: 100%;
      max-width: ${sizeMap[$size]};
      overflow: hidden;
      width: 100%;

      &:focus {
        outline: none;
      }

      @media (prefers-reduced-motion: reduce) {
        animation: none;
      }
    `
  }}
`

export const StyledModalHeader = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${spacing[16]};
  justify-content: space-between;
  padding: ${spacing[24]} ${spacing[24]} ${spacing[16]};
`

export const StyledModalCloseButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding: ${spacing[4]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};

  &:hover {
    background: ${colors.neutral[100]};
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }
`

export const StyledModalBody = styled.div`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${spacing[16]};
  overflow-y: auto;
  padding: 0 ${spacing[24]} ${spacing[24]};
`

export const StyledModalFooter = styled.div`
  border-top: 1px solid ${colors.neutral[200]};
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: flex-end;
  padding: ${spacing[16]} ${spacing[24]};
`
