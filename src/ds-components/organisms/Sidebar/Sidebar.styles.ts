import styled, { css } from "styled-components"

import { colors, motion, opacity, radius, spacing, typography } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

const activeBackground = hexToRgba(colors.info[500], 0.12)
const activeChildBackground = hexToRgba(colors.info[500], 0.18)

export const SidebarWrapper = styled.aside`
  background: ${colors.neutral[0]};
  border-right: 1px solid ${colors.neutral[200]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
  height: 100%;
  padding: ${spacing[24]} 0;
  width: ${spacing[256]};
`

export const SidebarBrand = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
  padding: 0 ${spacing[16]};
`

export const SidebarBrandTitle = styled.p`
  color: ${colors.primary[900]};
  font-size: ${typography.fontSize.lg}px;
  font-weight: ${typography.fontWeight.bold};
  line-height: ${typography.lineHeight.lg};
  margin: 0;
`

// Right padding is intentionally omitted so the scrollbar sits flush against the sidebar's own
// right edge instead of floating inset from it; only the left side keeps the wrapper's inset.
// SidebarNavContent re-adds a right margin inside the scrollable area so the item highlights
// still keep a gap from the edge (and from the scrollbar, when there is one). The scrollbar's own
// look is global (see GlobalStyle.ts), not declared here.
export const SidebarNav = styled.nav`
  flex: 1;
  overflow-y: auto;
  padding-left: ${spacing[16]};
`

export const SidebarNavContent = styled.div`
  margin-right: ${spacing[16]};
`

export const SidebarBottom = styled.div`
  padding: 0 ${spacing[16]};
`

export const SidebarItemList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export type StyledSidebarChildrenProps = {
  $expanded: boolean
}

// Height is animated through grid-template-rows (0fr <-> 1fr) rather than max-height: the real
// content height is unknown, and 0fr -> 1fr transitions to exactly it. The children stay mounted so
// the collapse can play out; visibility flips only after the collapse finishes (and immediately
// on expand) so collapsed items are neither focusable nor announced.
export const SidebarChildrenWrapper = styled.div<StyledSidebarChildrenProps>`
  display: grid;
  grid-template-rows: ${(props) => (props.$expanded ? "1fr" : "0fr")};
  opacity: ${(props) => (props.$expanded ? opacity.visible : opacity.hidden)};
  transition:
    grid-template-rows ${motion.duration.normal} ${motion.easing.ease},
    opacity ${motion.duration.normal} ${motion.easing.ease},
    visibility 0s linear ${(props) => (props.$expanded ? "0s" : motion.duration.normal)};
  visibility: ${(props) => (props.$expanded ? "visible" : "hidden")};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// min-height: 0 lets the grid row shrink to 0, and overflow: hidden clips the list while it does.
// Neither padding nor border can live on this element: they'd keep it from ever collapsing fully.
export const SidebarChildrenClip = styled.div`
  min-height: 0;
  overflow: hidden;
`

export const SidebarChildList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  list-style: none;
  margin: 0;
  padding: ${spacing[4]} 0 0 ${spacing[8]};
`

export type StyledSidebarButtonProps = {
  $active: boolean
}

const buttonBase = css`
  align-items: center;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: flex;
  font-family: ${typography.fontFamily.sans};
  gap: ${spacing[12]};
  text-align: left;
  transition: background ${motion.duration.fast} ${motion.easing.ease};
  width: 100%;

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`

export const SidebarItemButton = styled.button<StyledSidebarButtonProps>`
  ${buttonBase}

  background: ${(props) => (props.$active ? activeBackground : "transparent")};
  padding: ${spacing[8]} ${spacing[12]};

  &:hover:not(:disabled) {
    background: ${(props) => (props.$active ? activeBackground : colors.neutral[100])};
  }
`

export const SidebarChildButton = styled.button<StyledSidebarButtonProps>`
  ${buttonBase}

  background: ${(props) => (props.$active ? activeChildBackground : "transparent")};
  padding: ${spacing[8]} ${spacing[12]};

  &:hover:not(:disabled) {
    background: ${(props) => (props.$active ? activeChildBackground : colors.neutral[100])};
  }

  /* Drawn inside the button: the children list clips its overflow (see SidebarChildrenClip),
     so a ring outside the button would be cut off at the list's edges. */
  &:focus-visible {
    outline-offset: -2px;
  }
`

export const SidebarItemLabel = styled.span<StyledSidebarButtonProps>`
  color: ${(props) => (props.$active ? colors.info[700] : colors.neutral[700])};
  flex: 1;
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${(props) => (props.$active ? typography.fontWeight.semibold : typography.fontWeight.medium)};
  line-height: ${typography.lineHeight.sm};
`

export const SidebarDot = styled.span<StyledSidebarButtonProps>`
  background: ${(props) => (props.$active ? colors.info[500] : colors.neutral[400])};
  border-radius: ${radius.full};
  flex-shrink: 0;
  height: ${spacing[8]};
  margin: 0 ${spacing[8]};
  width: ${spacing[8]};
`
