import styled, { css } from "styled-components"

import { colors, motion, opacity, radius, spacing, typography } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

const currentBackground = hexToRgba(colors.info[500], 0.12)

export const StyledPaginationList = styled.ul`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[4]};
  list-style: none;
  margin: 0;
  padding: 0;
`

const cellSize = css`
  align-items: center;
  display: inline-flex;
  height: ${spacing[32]};
  justify-content: center;
  min-width: ${spacing[32]};
`

export type StyledPaginationButtonProps = {
  $current?: boolean
}

export const StyledPaginationButton = styled.button<StyledPaginationButtonProps>`
  ${cellSize}
  background: ${(props) => (props.$current ? currentBackground : "transparent")};
  border: none;
  border-radius: ${radius.md};
  color: ${(props) => (props.$current ? colors.info[700] : colors.neutral[700])};
  cursor: pointer;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${(props) => (props.$current ? typography.fontWeight.semibold : typography.fontWeight.medium)};
  padding: 0 ${spacing[8]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};

  &:hover:not(:disabled) {
    background: ${(props) => (props.$current ? currentBackground : colors.neutral[100])};
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const StyledPaginationEllipsis = styled.span`
  ${cellSize}
  color: ${colors.neutral[500]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
`
