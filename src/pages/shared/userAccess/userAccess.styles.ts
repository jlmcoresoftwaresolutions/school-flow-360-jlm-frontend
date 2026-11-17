import styled from "styled-components"

import { borderRadiusLevels, colors, media, spacing } from "@/foundation"

// A list page's main card content: filters, table and pagination stacked.
export const ListContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
`

// One line per role in a unit, in a table cell or a description.
export const AccessLines = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// A person in a table row: the name over the e-mail.
export const PersonCell = styled.span`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  min-width: 0;
`

export const FormFields = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
`

// The access part of the form: bordered, like a sub-card.
export const AccessBox = styled.fieldset`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  display: flex;
  flex-direction: column;
  gap: ${spacing[16]};
  margin: 0;
  min-width: 0;
  padding: ${spacing[16]};
`

// A role and its unit side by side (stacked on a narrow screen), with the remove button at the end.
export const AssignmentRow = styled.div`
  align-items: start;
  display: grid;
  gap: ${spacing[12]};
  grid-template-columns: 1fr;

  @media ${media.md} {
    grid-template-columns: 1fr 1fr auto;
  }
`

// Keeps the remove button level with the fields, below their labels.
export const RemoveSlot = styled.div`
  display: flex;
  justify-content: flex-end;

  @media ${media.md} {
    padding-top: ${spacing[24]};
  }
`

export const DetailsSections = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[24]};
`

export const DetailsSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${spacing[12]};
`

export const AccessItems = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${spacing[8]};
  list-style: none;
  margin: 0;
  padding: 0;
`

export const AccessItem = styled.li`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
  padding: ${spacing[12]} ${spacing[16]};
`
