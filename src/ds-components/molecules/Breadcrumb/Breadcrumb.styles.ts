import styled, { css } from "styled-components"

import { colors, motion, radius, spacing, typography } from "@/foundation"

export const StyledBreadcrumbList = styled.ol`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[4]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export const StyledBreadcrumbItem = styled.li`
  align-items: center;
  display: inline-flex;
  gap: ${spacing[4]};
`

const textStyles = css`
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  line-height: ${typography.lineHeight.sm};
`

// Links and buttons share one look: a trail entry is either a real <a> (href) or a <button> (onClick
// only), and both have to read the same.
const interactiveStyles = css`
  ${textStyles}
  background: transparent;
  border: none;
  border-radius: ${radius.sm};
  color: ${colors.neutral[600]};
  cursor: pointer;
  font-weight: ${typography.fontWeight.regular};
  padding: 0;
  text-decoration: none;
  transition: color ${motion.duration.fast} ${motion.easing.ease};

  &:hover {
    color: ${colors.neutral[900]};
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid ${colors.info[500]};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`

export const StyledBreadcrumbLink = styled.a`
  ${interactiveStyles}
`

export const StyledBreadcrumbButton = styled.button`
  ${interactiveStyles}
`

export const StyledBreadcrumbText = styled.span`
  ${textStyles}
  color: ${colors.neutral[600]};
`

export const StyledBreadcrumbCurrent = styled.span`
  ${textStyles}
  color: ${colors.neutral[900]};
  font-weight: ${typography.fontWeight.semibold};
`
