import styled from "styled-components"

import { ActionMenu } from "@/ds-components/molecules"
import { colors, media, motion, opacity, radius, spacing } from "@/foundation"

export const StyledTopbar = styled.header`
  align-items: center;
  background: ${colors.neutral[0]};
  border-bottom: 1px solid ${colors.neutral[200]};
  display: flex;
  flex-shrink: 0;
  gap: ${spacing[16]};
  justify-content: space-between;
  min-height: ${spacing[64]};
  padding: 0 ${spacing[16]};

  @media ${media.md} {
    padding: 0 ${spacing[32]};
  }
`

export const StyledTopbarStart = styled.div`
  flex: 1;
  min-width: 0;
`

export const StyledTopbarEnd = styled.div`
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: ${spacing[8]};
`

export const StyledTopbarAction = styled.button`
  align-items: center;
  background: transparent;
  border: none;
  border-radius: ${radius.md};
  cursor: pointer;
  display: inline-flex;
  height: ${spacing[40]};
  justify-content: center;
  transition: background ${motion.duration.fast} ${motion.easing.ease};
  width: ${spacing[40]};

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

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// Spans, not divs: with a user menu the whole block sits inside the menu's trigger <button>.
export const StyledTopbarUser = styled.span`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
  margin-left: ${spacing[8]};
`

// The chevron beside the user block: it turns upside down while the user menu is open (see below).
export const StyledTopbarUserChevron = styled.span`
  display: inline-flex;
  transition: transform ${motion.duration.fast} ${motion.easing.inOut};

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

// The user menu's trigger, with a tighter padding than the ActionMenu's own around the user block.
// Its aria-expanded (set by ActionMenu while the menu is open) is what turns the chevron.
export const StyledTopbarUserMenu = styled(ActionMenu)`
  && {
    padding: ${spacing[4]};
  }

  &[aria-expanded="true"] ${StyledTopbarUserChevron} {
    transform: rotate(180deg);
  }
`
