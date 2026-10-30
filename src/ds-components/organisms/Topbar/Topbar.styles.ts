import styled, { css } from "styled-components"

import { colors, media, motion, opacity, radius, spacing, typography } from "@/foundation"

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
  gap: ${spacing[12]};
  margin-left: ${spacing[8]};
`

const avatarSize = css`
  border-radius: ${radius.full};
  flex-shrink: 0;
  height: ${spacing[40]};
  width: ${spacing[40]};
`

export const StyledTopbarAvatarImage = styled.img`
  ${avatarSize}
  object-fit: cover;
`

export const StyledTopbarAvatarInitials = styled.span`
  ${avatarSize}
  align-items: center;
  background: ${colors.info[50]};
  color: ${colors.info[700]};
  display: inline-flex;
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.semibold};
  justify-content: center;
`

// On a narrow screen the name and role are hidden to leave the bar room for the breadcrumb. They are
// clipped rather than display:none, so a screen reader still announces who is signed in.
export const StyledTopbarUserText = styled.span`
  display: flex;
  text-align: left;
  flex-direction: column;

  @media not all and ${media.md} {
    clip: rect(0 0 0 0);
    height: 1px;
    overflow: hidden;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
`

export const StyledTopbarUserName = styled.span`
  color: ${colors.neutral[900]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.sm};
`

export const StyledTopbarUserRole = styled.span`
  color: ${colors.neutral[600]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.xs}px;
  line-height: ${typography.lineHeight.xs};
`
