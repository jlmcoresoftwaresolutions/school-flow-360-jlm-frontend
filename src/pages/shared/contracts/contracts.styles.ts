import styled from "styled-components"

import { borderRadiusLevels, colors, spacing, typography } from "@/foundation"

// The exact text of a contract or a model, as written (line breaks kept), in a bordered box that scrolls
// on its own so a long contract doesn't push the actions out of sight.
export const ContractText = styled.div`
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  color: ${colors.neutral[900]};
  font-size: ${typography.fontSize.sm}px;
  line-height: ${typography.lineHeight.md};
  max-height: 420px;
  overflow-y: auto;
  overflow-wrap: anywhere;
  padding: ${spacing[16]};
  white-space: pre-wrap;
`
