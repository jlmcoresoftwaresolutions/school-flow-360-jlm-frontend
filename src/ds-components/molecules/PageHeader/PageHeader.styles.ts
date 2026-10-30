import styled from "styled-components"

import { colors, spacing, typography } from "@/foundation"

export const StyledPageHeader = styled.header`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
  margin-bottom: ${spacing[24]};
`

export const StyledPageHeaderText = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  min-width: 0;
`

export const StyledPageHeaderTitle = styled.h1`
  color: ${colors.primary[800]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize["2xl"]}px;
  font-weight: ${typography.fontWeight.bold};
  line-height: ${typography.lineHeight["2xl"]};
  margin: 0;
`

export const StyledPageHeaderDescription = styled.p`
  color: ${colors.neutral[700]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  line-height: ${typography.lineHeight.sm};
  margin: 0;
`
