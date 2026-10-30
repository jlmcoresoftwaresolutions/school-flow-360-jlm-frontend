import styled, { css } from "styled-components"

import { colors, media, spacing, typography } from "@/foundation"

// Spans, not divs: it can sit inside a <button> (the Topbar's user menu trigger).
export const StyledUserIdentity = styled.span`
  align-items: center;
  display: inline-flex;
  gap: ${spacing[8]};
  min-width: 0;
`

export type StyledUserIdentityTextProps = {
  $hideOnNarrowScreens: boolean
}

// Clipped rather than display:none, so a screen reader still reads the name and role.
const visuallyHidden = css`
  clip: rect(0 0 0 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
`

export const StyledUserIdentityText = styled.span<StyledUserIdentityTextProps>`
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;

  ${(props) =>
    props.$hideOnNarrowScreens &&
    css`
      @media not all and ${media.md} {
        ${visuallyHidden}
      }
    `}
`

export const StyledUserIdentityName = styled.span`
  color: ${colors.neutral[900]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-weight: ${typography.fontWeight.semibold};
  line-height: ${typography.lineHeight.sm};
`

export const StyledUserIdentityRole = styled.span`
  color: ${colors.neutral[600]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.xs}px;
  line-height: ${typography.lineHeight.xs};
`
