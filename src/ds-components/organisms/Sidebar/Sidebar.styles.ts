import styled, { css } from "styled-components"

import { colors, motion, opacity, radius, shadows, spacing, typography, zIndex } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

const activeBackground = hexToRgba(colors.info[500], 0.12)
const activeChildBackground = hexToRgba(colors.info[500], 0.18)

// Side inset of the content inside the panel. The icon-only rail is narrow, so it gets a tighter one
// to leave the icon buttons a comfortable width.
const insetFor = (collapsed: boolean) => (collapsed ? spacing[8] : spacing[16])

// Everything that differs between the rail and the expanded panel (width, insets, paddings) is
// animated with this one timing, so the panel opens and closes as a single motion instead of parts
// popping into place. The rail's values are chosen so an icon sits dead center in the rail (the 1px
// is the panel's right border) and slides to its expanded position as the panel widens, rather than
// flipping between `center` and `flex-start` alignment, which can't be animated.
const slide = `${motion.duration.normal} ${motion.easing.inOut}`
const railInnerWidth = `(${spacing[64]} - 1px)`
const itemPaddingFor = (collapsed: boolean) =>
  collapsed ? `calc((${railInnerWidth} - ${spacing[8]} * 2 - ${spacing[20]}) / 2)` : spacing[12]
const brandInsetFor = (collapsed: boolean) =>
  collapsed ? `calc((${railInnerWidth} - ${spacing[40]}) / 2)` : spacing[16]

const reducedMotion = css`
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export type StyledSidebarLayoutProps = {
  $collapsed: boolean
}

export type StyledSidebarWrapperProps = {
  $compact: boolean
}

export type StyledSidebarPanelProps = {
  $collapsed: boolean
  $overlay: boolean
}

// The <aside> is what takes space in the layout: full width on wide screens, only the icon rail's
// width on compact ones. The visible panel lives inside it and is absolutely positioned, so on a
// compact screen it can grow to full width OVER the content instead of pushing it aside.
export const SidebarWrapper = styled.aside<StyledSidebarWrapperProps>`
  flex-shrink: 0;
  height: 100%;
  position: relative;
  width: ${(props) => (props.$compact ? spacing[64] : spacing[256])};
`

export const SidebarPanel = styled.div<StyledSidebarPanelProps>`
  ${(props) => {
    const { $collapsed, $overlay } = props

    return css`
      background: ${colors.neutral[0]};
      border-right: 1px solid ${colors.neutral[200]};
      bottom: 0;
      box-shadow: ${$overlay ? shadows.lg : shadows.none};
      display: flex;
      flex-direction: column;
      gap: ${spacing[16]};
      left: 0;
      overflow: hidden;
      padding: ${spacing[16]} 0 ${spacing[12]};
      position: absolute;
      top: 0;
      transition:
        width ${slide},
        box-shadow ${slide},
        z-index 0s linear ${$overlay ? "0s" : motion.duration.normal};
      width: ${$collapsed ? spacing[64] : spacing[256]};
      z-index: ${$overlay ? zIndex.overlay : zIndex.base};

      ${reducedMotion}
    `
  }}
`

export type StyledSidebarBackdropProps = {
  $visible: boolean
}

// Dims the content behind an expanded compact sidebar; clicking it collapses the sidebar again.
// It stays mounted on compact screens so it can fade in and out; visibility flips only after the
// fade-out (and immediately on the way in) so a faded-out backdrop never swallows clicks.
export const SidebarBackdrop = styled.div<StyledSidebarBackdropProps>`
  background: ${hexToRgba(colors.neutral[900], 0.4)};
  inset: 0;
  opacity: ${(props) => (props.$visible ? opacity.visible : opacity.hidden)};
  position: fixed;
  transition:
    opacity ${slide},
    visibility 0s linear ${(props) => (props.$visible ? "0s" : motion.duration.normal)};
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  z-index: ${zIndex.fixed};

  ${reducedMotion}
`

// No `gap` here: the space between the brand and the toggle button is SidebarBrandInfo's own
// margin-right, so it can shrink to nothing in the rail (a flex gap would keep pushing the button off-center).
export const SidebarBrand = styled.div<StyledSidebarLayoutProps>`
  align-items: center;
  display: flex;
  padding: 0 ${(props) => brandInsetFor(props.$collapsed)};
  transition: padding ${slide};

  ${reducedMotion}
`

// Logo + title. Always mounted: in the rail it shrinks to zero width (flex-grow 1 -> 0 is animatable,
// unlike unmounting) and fades out, so it can slide open with the panel. The toggle button is its
// sibling, so it rides along to the right edge as this grows. Visibility flips after the fade-out
// so the collapsed logo/title are out of the accessibility tree.
export const SidebarBrandInfo = styled.div<StyledSidebarLayoutProps>`
  align-items: center;
  display: flex;
  flex-basis: 0;
  flex-grow: ${(props) => (props.$collapsed ? 0 : 1)};
  flex-shrink: 1;
  gap: ${spacing[12]};
  margin-right: ${(props) => (props.$collapsed ? "0px" : spacing[12])};
  min-width: 0;
  opacity: ${(props) => (props.$collapsed ? opacity.hidden : opacity.visible)};
  overflow: hidden;
  transition:
    flex-grow ${slide},
    margin-right ${slide},
    opacity ${motion.duration.normal} ${motion.easing.ease},
    visibility 0s linear ${(props) => (props.$collapsed ? motion.duration.normal : "0s")};
  visibility: ${(props) => (props.$collapsed ? "hidden" : "visible")};

  ${reducedMotion}
`

export const SidebarBrandTitle = styled.p`
  color: ${colors.primary[900]};
  flex: 1;
  font-size: ${typography.fontSize.lg}px;
  font-weight: ${typography.fontWeight.bold};
  line-height: ${typography.lineHeight.lg};
  margin: 0;
  white-space: nowrap;
`

export const SidebarToggleButton = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding: ${spacing[8]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};

  &:hover {
    background: ${colors.neutral[100]};
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }
`

// Right padding is intentionally omitted so the scrollbar sits flush against the sidebar's own
// right edge instead of floating inset from it; only the left side keeps the panel's inset.
// SidebarNavContent re-adds a right margin inside the scrollable area so the item highlights
// still keep a gap from the edge (and from the scrollbar, when there is one). The scrollbar's own
// look is global (see GlobalStyle.ts), not declared here.
//
// overflow-x is hidden because the rail keeps every label mounted (just faded out, see
// SidebarItemLabel) and they run past the rail's width; that must clip, not scroll sideways.
export const SidebarNav = styled.nav<StyledSidebarLayoutProps>`
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  padding-left: ${(props) => insetFor(props.$collapsed)};
  transition: padding-left ${slide};

  ${reducedMotion}
`

export const SidebarNavContent = styled.div<StyledSidebarLayoutProps>`
  margin-right: ${(props) => insetFor(props.$collapsed)};
  transition: margin-right ${slide};

  ${reducedMotion}
`

export const SidebarBottom = styled.div<StyledSidebarLayoutProps>`
  padding: 0 ${(props) => insetFor(props.$collapsed)};
  transition: padding ${slide};

  ${reducedMotion}
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

  ${reducedMotion}
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

export type StyledSidebarItemButtonProps = StyledSidebarButtonProps & StyledSidebarLayoutProps

const buttonBase = css`
  align-items: center;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: flex;
  font-family: ${typography.fontFamily.sans};
  gap: ${spacing[12]};
  position: relative;
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

export const SidebarItemButton = styled.button<StyledSidebarItemButtonProps>`
  ${buttonBase}

  background: ${(props) => (props.$active ? activeBackground : "transparent")};
  padding: ${spacing[8]} ${(props) => itemPaddingFor(props.$collapsed)};
  transition:
    background ${motion.duration.fast} ${motion.easing.ease},
    padding ${slide};

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

export type StyledSidebarItemLabelProps = StyledSidebarButtonProps & {
  $hidden?: boolean
}

// In the rail the label stays in the layout and accessibility tree (so the button keeps its accessible
// name) and is only faded out; the panel clips it, and the tooltip names the item on hover.
export const SidebarItemLabel = styled.span<StyledSidebarItemLabelProps>`
  color: ${(props) => (props.$active ? colors.info[700] : colors.neutral[700])};
  flex: 1;
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${(props) => (props.$active ? typography.fontWeight.semibold : typography.fontWeight.medium)};
  line-height: ${typography.lineHeight.sm};
  opacity: ${(props) => (props.$hidden ? opacity.hidden : opacity.visible)};
  transition: opacity ${motion.duration.normal} ${motion.easing.ease};
  white-space: nowrap;

  ${reducedMotion}
`

export const SidebarDot = styled.span<StyledSidebarButtonProps>`
  background: ${(props) => (props.$active ? colors.info[500] : colors.neutral[400])};
  border-radius: ${radius.full};
  flex-shrink: 0;
  height: ${spacing[8]};
  margin: 0 ${spacing[8]};
  width: ${spacing[8]};
`
