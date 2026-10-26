import styled from "styled-components"

import { colors, motion, opacity, radius, shadows, spacing, typography, zIndex } from "@/foundation"

export const StyledActionMenuTrigger = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  padding: ${spacing[8]};
  transition: background ${motion.duration.fast} ${motion.easing.ease};

  &:hover:not(:disabled) {
    background: ${colors.neutral[100]};
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`

// Positioned with fixed coordinates computed from the trigger (see ActionMenu.tsx) and rendered in a
// portal, so a table or card with overflow: hidden around the trigger can't clip it. It sits above
// modals (popover) so a menu opened inside one is still visible.
export const StyledActionMenuList = styled.div`
  background: ${colors.neutral[0]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.md};
  box-shadow: ${shadows.lg};
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  min-width: ${spacing[192]};
  padding: ${spacing[4]};
  position: fixed;
  z-index: ${zIndex.popover};
`

export type StyledActionMenuItemProps = {
  $danger: boolean
}

export const StyledActionMenuItem = styled.button<StyledActionMenuItemProps>`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${radius.sm};
  color: ${(props) => (props.$danger ? colors.danger[700] : colors.neutral[700])};
  cursor: pointer;
  display: flex;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.medium};
  gap: ${spacing[12]};
  line-height: ${typography.lineHeight.sm};
  padding: ${spacing[8]} ${spacing[12]};
  text-align: left;
  width: 100%;

  &:hover:not(:disabled),
  &:focus-visible {
    background: ${(props) => (props.$danger ? colors.danger[50] : colors.neutral[100])};
    outline: none;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: ${opacity.disabled};
  }
`

// Takes the free space, so a trailing check mark (radio items) sits at the item's right edge.
export const StyledActionMenuItemLabel = styled.span`
  flex: 1;
`
