import styled, { keyframes } from "styled-components"

import { colors, motion, opacity, spacing, typography } from "@/foundation"

// Fades in while dropping into place from just above, so a message (an error above all) shows up
// instead of popping in. It plays on mount, and FieldMessage remounts the element whenever the text
// changes, so helper text turning into an error animates too.
const appear = keyframes`
  from {
    opacity: ${opacity.hidden};
    transform: translateY(-${spacing[4]});
  }

  to {
    opacity: ${opacity.visible};
    transform: translateY(0);
  }
`

export type StyledFieldMessageProps = {
  $error: boolean
}

// The 700 shades, not the semantic muted/danger (500) ones: at this small size the 500s fall well
// short of WCAG AA's 4.5:1 (neutral 2.1:1, danger 3.8:1 on white), and these hold above it on the
// light surfaces fields sit on too (white and neutral 50).
export const StyledFieldMessage = styled.span<StyledFieldMessageProps>`
  color: ${(props) => (props.$error ? colors.danger[700] : colors.neutral[700])};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.xs}px;
  line-height: ${typography.lineHeight.xs};
  animation: ${appear} ${motion.duration.normal} ${motion.easing.out};

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`
