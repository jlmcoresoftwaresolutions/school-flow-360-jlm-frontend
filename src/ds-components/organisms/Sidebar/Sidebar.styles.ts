import styled from "styled-components"

import { colors, motion, radius, spacing } from "@/foundation"
import { hexToRgba } from "@/utils/colors"

export const SidebarWrapper = styled.aside`
  background: ${colors.primary[900]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
  height: 100vh;
  padding: ${spacing[24]} 0;
  width: ${spacing[256]};
`

export const SidebarBrand = styled.div`
  align-items: center;
  border-bottom: 1px solid ${hexToRgba(colors.neutral[0], 0.08)};
  display: flex;
  gap: ${spacing[12]};
  padding: 0 ${spacing[16]} ${spacing[16]};
`

export const SidebarBrandText = styled.div`
  display: flex;
  flex-direction: column;
`

// Right padding is intentionally omitted so the scrollbar sits flush against the sidebar's own
// right edge instead of floating inset from it; only the left side keeps the wrapper's inset.
export const SidebarNav = styled.nav`
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: ${spacing[24]};
  overflow-y: auto;
  padding-left: ${spacing[16]};
  scrollbar-color: ${hexToRgba(colors.neutral[0], 0.16)} transparent;
  scrollbar-width: thin;

  &::-webkit-scrollbar {
    width: ${spacing[4]};
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background: ${hexToRgba(colors.neutral[0], 0.16)};
    border-radius: ${radius.full};
  }

  &::-webkit-scrollbar-thumb:hover {
    background: ${hexToRgba(colors.neutral[0], 0.28)};
  }
`

export const SidebarSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[8]};
`

export const SidebarSectionTitle = styled.div`
  padding: 0 ${spacing[12]};
`

export const SidebarItemList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export type StyledSidebarItemButtonProps = {
  $active: boolean
}

export const SidebarItemButton = styled.button<StyledSidebarItemButtonProps>`
  align-items: center;
  background: ${(props) => (props.$active ? hexToRgba(colors.primary[500], 0.16) : "transparent")};
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: flex;
  gap: ${spacing[12]};
  padding: ${spacing[8]} ${spacing[12]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};
  width: 100%;

  &:hover {
    background: ${(props) =>
      props.$active ? hexToRgba(colors.primary[500], 0.16) : hexToRgba(colors.neutral[0], 0.08)};
  }

  &:focus-visible {
    outline: 2px solid ${colors.primary[300]};
    outline-offset: 2px;
  }
`

export const SidebarFooter = styled.div`
  border-top: 1px solid ${hexToRgba(colors.neutral[0], 0.08)};
  padding: ${spacing[16]} ${spacing[16]} 0;
`
