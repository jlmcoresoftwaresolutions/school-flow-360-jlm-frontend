import styled, { css } from "styled-components"

import { colors, motion, radius, shadows, spacing, typography, zIndex } from "@/foundation"

export const DateInputWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${spacing[4]};
`

// react-datepicker renders its own wrapper around the input, which defaults to an inline-block
// shrink-to-fit box. Input stretches to the full width of its parent, so both the library wrapper
// and the wrapper it nests inside have to be widened for DateInput to line up with it.
export const DatePickerWrapper = styled.div`
  position: relative;
  width: 100%;

  .react-datepicker-wrapper,
  .react-datepicker__input-container {
    display: block;
    width: 100%;
  }

  /* Keeps the typed value from running underneath the icons overlaid on the right. Reserves room
     for both the clear button and the calendar icon so the field never resizes when the clear
     button appears or disappears as the selected value changes. */
  .react-datepicker__input-container input {
    padding-right: ${spacing[64]};
  }
`

// pointer-events: none here lets a click land on the real <input> underneath instead of being
// swallowed by this wrapper - it has no click handler of its own, only the calendar icon (purely
// decorative) and the clear button (which opts back in below) live inside it.
export const InputIconsWrapper = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[4]};
  pointer-events: none;
  position: absolute;
  right: ${spacing[12]};
  top: 50%;
  transform: translateY(-50%);
`

export const CalendarIconWrapper = styled.div`
  align-items: center;
  display: flex;
  justify-content: center;
`

export const ClearButton = styled.button`
  align-items: center;
  background: transparent;
  border-radius: ${radius.full};
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: center;
  padding: 0;
  pointer-events: auto;

  &:hover {
    background: ${colors.neutral[100]};
  }

  &:disabled {
    cursor: not-allowed;
    pointer-events: none;
  }
`

export type StyledCalendarProps = {
  $borderRadius: string
}

// The base stylesheet shipped by react-datepicker is deliberately not imported: it hardcodes its
// own colors, spacing and font sizes, none of which come from src/foundation. Everything the
// calendar needs — layout mechanics included — is rebuilt here from tokens instead.
export const StyledCalendar = styled.div<StyledCalendarProps>`
  ${(props) => {
    const { $borderRadius } = props

    return css`
      .react-datepicker-popper {
        padding-top: ${spacing[4]};
        z-index: ${zIndex.dropdown};
      }

      .react-datepicker {
        background: ${colors.neutral[0]};
        border-radius: ${$borderRadius};
        border: 1px solid ${colors.neutral[300]};
        box-shadow: ${shadows.md};
        display: inline-block;
        font-family: ${typography.fontFamily.sans};
        padding: ${spacing[12]};
      }

      .react-datepicker__header {
        display: flex;
        flex-direction: column;
        gap: ${spacing[8]};
        padding-bottom: ${spacing[8]};
      }

      .react-datepicker__current-month {
        color: ${colors.neutral[900]};
        font-size: ${typography.fontSize.sm}px;
        font-weight: ${typography.fontWeight.semibold};
        text-align: center;
        text-transform: capitalize;
      }

      .react-datepicker__day-names,
      .react-datepicker__week {
        display: flex;
        gap: ${spacing[4]};
      }

      .react-datepicker__day-name,
      .react-datepicker__day {
        align-items: center;
        border-radius: ${radius.md};
        display: flex;
        height: ${spacing[32]};
        justify-content: center;
        width: ${spacing[32]};
      }

      .react-datepicker__day-name {
        color: ${colors.neutral[600]};
        font-size: ${typography.fontSize.xs}px;
        font-weight: ${typography.fontWeight.medium};
        text-transform: capitalize;
      }

      .react-datepicker__day {
        color: ${colors.neutral[900]};
        cursor: pointer;
        font-size: ${typography.fontSize.sm}px;
        transition: background ${motion.duration.fast} ${motion.easing.ease};
      }

      .react-datepicker__day:hover {
        background: ${colors.primary[100]};
      }

      .react-datepicker__day--today {
        font-weight: ${typography.fontWeight.bold};
      }

      .react-datepicker__day--outside-month {
        color: ${colors.neutral[400]};
      }

      .react-datepicker__day--keyboard-selected {
        background: ${colors.primary[100]};
      }

      .react-datepicker__day--selected {
        background: ${colors.primary[500]};
        color: ${colors.neutral[0]};
      }

      .react-datepicker__day--selected:hover {
        background: ${colors.primary[600]};
      }

      .react-datepicker__day--disabled {
        color: ${colors.neutral[400]};
        cursor: not-allowed;
      }

      .react-datepicker__day--disabled:hover {
        background: transparent;
      }

      .react-datepicker__navigation {
        align-items: center;
        background: transparent;
        border-radius: ${radius.md};
        border: none;
        cursor: pointer;
        display: flex;
        height: ${spacing[24]};
        justify-content: center;
        position: absolute;
        top: ${spacing[12]};
        width: ${spacing[24]};
      }

      .react-datepicker__navigation:hover {
        background: ${colors.neutral[100]};
      }

      .react-datepicker__navigation--previous {
        left: ${spacing[12]};
      }

      .react-datepicker__navigation--next {
        right: ${spacing[12]};
      }

      /* The icon span also carries its own "Previous Month"/"Next Month" label, which the
         aria-label on the button already covers: zero it out and draw the chevron in ::before. */
      .react-datepicker__navigation-icon {
        font-size: 0;
      }

      .react-datepicker__navigation-icon::before {
        border-color: ${colors.neutral[600]};
        border-style: solid;
        border-width: 2px 2px 0 0;
        content: "";
        display: block;
        height: ${spacing[8]};
        width: ${spacing[8]};
      }

      .react-datepicker__navigation-icon--previous::before {
        transform: rotate(-135deg);
      }

      .react-datepicker__navigation-icon--next::before {
        transform: rotate(45deg);
      }

      /* react-datepicker ships the full weekday name and a live region for screen readers next to
         the visible content; without the base stylesheet they would render on top of the grid. */
      .react-datepicker__aria-live,
      .react-datepicker__sr-only {
        clip: rect(0 0 0 0);
        height: 1px;
        overflow: hidden;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }
    `
  }}
`
