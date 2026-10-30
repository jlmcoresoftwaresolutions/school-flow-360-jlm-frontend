import styled, { css } from "styled-components"

import { colors, motion, opacity, radius, shadows, spacing, typography } from "@/foundation"

const borderColor = colors.neutral[200]

// A baseline across the whole width it is given, with the tabs set slightly apart on top of it.
// overflow-x lets a long list of tabs scroll sideways on a narrow screen instead of wrapping or
// squeezing the labels; the bar's own look is the global scrollbar style (see GlobalStyle.ts).
export type StyledTabListProps = {
  $attached: boolean
}

// Attached (see Tabs.tsx), the bar drops its baseline and is stacked over what follows it, so the
// selected tab covers the top edge (and shadow) of the card below. The top padding leaves room for the
// selected tab's shadow, which the bar's overflow would otherwise clip.
const attachedListStyles = css`
  border-bottom: none;
  padding-top: ${spacing[8]};
  position: relative;
  z-index: 1;
`

export const StyledTabList = styled.div<StyledTabListProps>`
  border-bottom: 1px solid ${borderColor};
  display: flex;
  gap: ${spacing[4]};
  overflow-x: auto;
  padding: 0 ${spacing[16]};
  width: 100%;

  ${(props) => props.$attached && attachedListStyles}
`

export type StyledTabProps = {
  $attached: boolean
  $selected: boolean
}

// The selected tab drops its bottom border over the baseline (margin-bottom: -1px), so it reads as
// opening into the content below, the way a selected browser tab does.
const selectedStyles = css`
  border-bottom-color: transparent;
  color: ${colors.primary[600]};
  font-weight: ${typography.fontWeight.semibold};
`

// Attached, the selected tab takes the look of an elevated Card (no border, the Card's shadow) with
// its shadow cut off at the bottom, where it joins the card below. The other tabs keep their bottom
// border, a shade darker than the rest so it reads on the white card: a thin line between them and
// the card, since that content isn't theirs.
const attachedStyles = css<StyledTabProps>`
  border-bottom-color: ${colors.neutral[300]};
  margin-bottom: 0;

  ${(props) =>
    props.$selected &&
    css`
      border-color: transparent;
      box-shadow: ${shadows.md};
      clip-path: inset(-${spacing[16]} -${spacing[16]} 0 -${spacing[16]});
    `}
`

// Each tab is its own white box, bordered and rounded at the top only, like a browser tab.
export const StyledTab = styled.button<StyledTabProps>`
  align-items: center;
  background: ${colors.neutral[0]};
  border: 1px solid ${borderColor};
  border-radius: ${radius.md} ${radius.md} 0 0;
  color: ${colors.neutral[700]};
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.md}px;
  font-weight: ${typography.fontWeight.regular};
  gap: ${spacing[8]};
  line-height: ${typography.lineHeight.md};
  margin-bottom: -1px;
  padding: ${spacing[8]} ${spacing[16]};
  // A light transition when the selection moves from one tab to another (and on hover).
  transition:
    background ${motion.duration.normal} ${motion.easing.ease},
    border-color ${motion.duration.normal} ${motion.easing.ease},
    box-shadow ${motion.duration.normal} ${motion.easing.ease},
    color ${motion.duration.normal} ${motion.easing.ease};
  white-space: nowrap;

  ${(props) => props.$selected && selectedStyles}
  ${(props) => props.$attached && attachedStyles}

  &:hover:not(:disabled) {
    ${(props) =>
      !props.$selected &&
      css`
        background: ${colors.neutral[50]};
        color: ${colors.neutral[900]};
      `}
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
  padding-top: ${spacing[24]};

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }
`
