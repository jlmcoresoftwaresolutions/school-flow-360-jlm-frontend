import styled from "styled-components"

import { colors, motion, opacity, radius, spacing, typography } from "@/foundation"

// overflow-x lets a long list of tabs scroll sideways on a narrow screen instead of wrapping or
// squeezing the labels; the bar's own look is the global scrollbar style (see GlobalStyle.ts).
export const StyledTabList = styled.div`
  border-bottom: 1px solid ${colors.neutral[200]};
  display: flex;
  gap: ${spacing[4]};
  overflow-x: auto;
`

export type StyledTabProps = {
  $selected: boolean
}

// The 2px underline sits over the list's own 1px border (margin-bottom: -1px), so the selected tab
// reads as part of the line rather than floating above it.
export const StyledTab = styled.button<StyledTabProps>`
  background: transparent;
  border: none;
  border-bottom: 2px solid ${(props) => (props.$selected ? colors.info[500] : "transparent")};
  border-radius: ${radius.sm} ${radius.sm} 0 0;
  color: ${(props) => (props.$selected ? colors.info[700] : colors.neutral[600])};
  cursor: pointer;
  flex-shrink: 0;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${(props) => (props.$selected ? typography.fontWeight.semibold : typography.fontWeight.medium)};
  line-height: ${typography.lineHeight.sm};
  margin-bottom: -1px;
  padding: ${spacing[12]} ${spacing[16]};
  transition:
    color ${motion.duration.fast} ${motion.easing.ease},
    border-color ${motion.duration.fast} ${motion.easing.ease};
  white-space: nowrap;

  &:hover:not(:disabled) {
    color: ${(props) => (props.$selected ? colors.info[700] : colors.neutral[900])};
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: -2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const StyledTabPanel = styled.div`
  padding-top: ${spacing[16]};

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }
`
