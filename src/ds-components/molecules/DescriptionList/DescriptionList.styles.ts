import styled from "styled-components"

import { colors, media, spacing, typography } from "@/foundation"

export type DescriptionListColumns = 1 | 2 | 3

export type StyledDescriptionListProps = {
  $columns: DescriptionListColumns
}

// One column on a narrow screen, `columns` from md up.
export const StyledDescriptionList = styled.dl<StyledDescriptionListProps>`
  display: grid;
  gap: ${spacing[16]} ${spacing[24]};
  grid-template-columns: 1fr;
  margin: 0;

  @media ${media.md} {
    grid-template-columns: repeat(${(props) => props.$columns}, minmax(0, 1fr));
  }
`

export type StyledDescriptionItemProps = {
  $fullWidth: boolean
}

export const StyledDescriptionItem = styled.div<StyledDescriptionItemProps>`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  min-width: 0;

  @media ${media.md} {
    grid-column: ${(props) => (props.$fullWidth ? "1 / -1" : "auto")};
  }
`

export const StyledDescriptionTerm = styled.dt`
  color: ${colors.neutral[700]};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.xs}px;
  font-weight: ${typography.fontWeight.medium};
  line-height: ${typography.lineHeight.xs};
`

export type StyledDescriptionDetailsProps = {
  $empty: boolean
}

// A missing value reads as such ("Não informado", in a muted italic) rather than as a blank gap.
export const StyledDescriptionDetails = styled.dd<StyledDescriptionDetailsProps>`
  color: ${(props) => (props.$empty ? colors.neutral[700] : colors.neutral[900])};
  font-family: ${typography.fontFamily.sans};
  font-size: ${typography.fontSize.sm}px;
  font-style: ${(props) => (props.$empty ? "italic" : "normal")};
  line-height: ${typography.lineHeight.sm};
  margin: 0;
  overflow-wrap: anywhere;
`
