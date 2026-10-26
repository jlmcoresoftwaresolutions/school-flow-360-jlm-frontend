import styled from "styled-components"

import { colors, typography } from "@/foundation"

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
`
