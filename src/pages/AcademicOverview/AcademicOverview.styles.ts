import styled from "styled-components"

import { colors, media, radius, spacing, typography } from "@/foundation"

// The overview's figures side by side: two columns on a phone, four from md up.
export const StatsGrid = styled.div`
  display: grid;
  gap: ${spacing[16]};
  grid-template-columns: repeat(2, minmax(0, 1fr));

  @media ${media.md} {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
`

export const StatBlock = styled.div`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${radius.lg};
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  padding: ${spacing[16]};
`

export const StatValue = styled.span`
  color: ${colors.neutral[900]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize["2xl"]}px;
  font-weight: ${typography.fontWeight.bold};
  line-height: ${typography.lineHeight["2xl"]};
`

export const OverviewContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
`

export const Shortcuts = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
`
