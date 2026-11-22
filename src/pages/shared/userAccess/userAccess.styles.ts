import styled, { css, keyframes } from "styled-components"

import { borderRadiusLevels, colors, media, motion, opacity, spacing, typography } from "@/foundation"

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
// A role row grows in when added and collapses away when removed: its height (a grid track going
// between 0fr and 1fr), the gap above it in the AccessBox (a negative margin while collapsed) and its
// opacity, clipped to its own box while it moves. Removing waits for the animation to end (see
// AssignmentFields). Nothing moves for whoever asked the system for reduced motion.
const rowCollapsed = `
  clip-path: inset(0);
  grid-template-rows: 0fr;
  margin-top: -${spacing[16]};
  opacity: ${opacity.hidden};
`

const rowExpanded = `
  clip-path: inset(0);
  grid-template-rows: 1fr;
  margin-top: 0;
  opacity: ${opacity.visible};
`

const rowEnter = keyframes`
  from { ${rowCollapsed} }
  to { ${rowExpanded} }
`

const rowLeave = keyframes`
  from { ${rowExpanded} }
  to { ${rowCollapsed} }
`

export type RowMotionProps = {
  $phase: "entering" | "leaving" | "still"
}

export const RowMotion = styled.div<RowMotionProps>`
  display: grid;
  grid-template-rows: 1fr;

  ${(props) => {
    const { $phase } = props

    if ($phase === "entering") {
      return css`
        animation: ${rowEnter} ${motion.duration.normal} ${motion.easing.out};
      `
    }

    if ($phase === "leaving") {
      return css`
        animation: ${rowLeave} ${motion.duration.normal} ${motion.easing.in} forwards;
        pointer-events: none;
      `
    }

    return ""
  }}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`

export const AssignmentRow = styled.div`
  align-items: start;
  display: grid;
  gap: ${spacing[12]};
  grid-template-columns: 1fr;
  min-height: 0;

  @media ${media.md} {
    grid-template-columns: 1fr 1fr auto;
  }
`

// The fields' label line (FieldLabel: sm text) plus the gap below it, and the Select's own height (12px
// padding and a 1px border around its 21px content): what lines the remove button up with the field.
const fieldLabelHeight = `${typography.fontSize.sm * typography.lineHeight.sm}px`
const selectHeight = `calc(2 * ${spacing[12]} + 2px + ${typography.fontSize.sm * typography.lineHeight.sm}px)`

// Keeps the remove button centered on the fields' boxes, below their labels.
export const RemoveSlot = styled.div`
  display: flex;
  justify-content: flex-end;

  @media ${media.md} {
    align-items: center;
    height: ${selectHeight};
    margin-top: calc(${fieldLabelHeight} + ${spacing[4]});
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

// An access with an action on its right (remove or keep it), the text taking the rest of the line.
export const ActionableAccessItem = styled(AccessItem)`
  align-items: center;
  flex-direction: row;
  justify-content: space-between;
  padding-right: ${spacing[8]};
`

// The actions on a user, side by side, wrapping on a narrow screen.
export const ActionRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[8]};
`
