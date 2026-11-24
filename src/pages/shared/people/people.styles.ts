import styled from "styled-components"

import { borderRadiusLevels, colors, media, spacing } from "@/foundation"

// A block of a person's form or profile: a titled group of fields or data, with a line between blocks.
export const PersonSection = styled.section`
  border-top: 1px solid ${colors.neutral[200]};
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
  padding-top: ${spacing[24]};

  &:first-of-type {
    border-top: none;
    padding-top: 0;
  }
`

// A block's title, with its actions on the right (wrapping below it on a narrow screen).
export const PersonBlockHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
`

// The guardian chosen in a picker: the name and what identifies it, with "Trocar" on the right.
export const PickedPerson = styled.div`
  align-items: center;
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  display: flex;
  gap: ${spacing[12]};
  justify-content: space-between;
  padding: ${spacing[12]} ${spacing[16]};
`

export const PersonSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
`

// Fields side by side on a wide screen, stacked on a narrow one.
export const FieldRow = styled.div`
  display: grid;
  gap: ${spacing[16]};
  grid-template-columns: minmax(0, 1fr);

  @media ${media.md} {
    grid-template-columns: repeat(auto-fit, minmax(${spacing[224]}, 1fr));
  }
`

// The buttons at the end of a form page, on the right.
export const FormActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: flex-end;
`

// A candidate of a duplicate review: the name, with its tags (kind, strength) beside it.
export const CandidateHeader = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
  justify-content: space-between;
`

export const CandidateTags = styled.span`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[4]};
`

// Below a person's page header: the status and identifiers on the left, the actions on the right.
export const ProfileBar = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[12]};
  justify-content: space-between;
  margin-bottom: ${spacing[16]};
`

export const ProfileBarInfo = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
`

// The notice of an anonymized person's profile, above its tabs.
export const AnonymizedNoticeBox = styled.div`
  align-items: flex-start;
  background: ${colors.neutral[50]};
  border: 1px solid ${colors.neutral[300]};
  border-radius: ${borderRadiusLevels.medium};
  display: flex;
  gap: ${spacing[12]};
  margin-bottom: ${spacing[16]};
  padding: ${spacing[16]};
`

// Badges side by side (the status and "Anonimizado"), wrapping on a narrow cell.
export const BadgeGroup = styled.span`
  display: inline-flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
`
