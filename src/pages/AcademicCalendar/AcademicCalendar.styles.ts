import styled, { css } from "styled-components"

import { borderRadiusLevels, colors, media, motion, opacity, radius, spacing, typography } from "@/foundation"

// The month view of the calendar's preparation: a toolbar (month name and navigation) above a grid of
// seven columns, the weekday names on top.
export const MonthToolbar = styled.div`
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: ${spacing[12]};
  justify-content: space-between;
`

export const MonthNavigation = styled.div`
  align-items: center;
  display: flex;
  gap: ${spacing[8]};
`

export const MonthGrid = styled.div`
  border: 1px solid ${colors.neutral[200]};
  border-radius: ${borderRadiusLevels.medium};
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  overflow: hidden;
  touch-action: none;
  user-select: none;
`

export const WeekdayName = styled.div`
  background: ${colors.neutral[50]};
  border-bottom: 1px solid ${colors.neutral[200]};
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.xs}px;
  font-weight: ${typography.fontWeight.semibold};
  overflow: hidden;
  padding: ${spacing[4]};
  text-align: center;
  text-overflow: clip;
  text-transform: capitalize;
  white-space: nowrap;

  @media ${media.md} {
    padding: ${spacing[8]};
  }
`

type DayCellProps = {
  $inPeriod: boolean
  $selected: boolean
  $today: boolean
  $weekend: boolean
}

// A day of the month. Inside the period it is a button: clicking (or dragging across days) opens a new
// item for it; a selected range is tinted with the school's color, today has a ring.
export const DayCell = styled.div<DayCellProps>`
  ${(props) => {
    const { $inPeriod, $selected, $today, $weekend } = props
    let background: string = colors.neutral[0]
    if ($weekend) background = colors.neutral[50]
    if ($selected) background = colors.primary[50]

    return css`
      background: ${background};
      border-right: 1px solid ${colors.neutral[200]};
      border-top: 1px solid ${colors.neutral[200]};
      cursor: ${$inPeriod ? "pointer" : "default"};
      display: flex;
      flex-direction: column;
      gap: ${spacing[4]};
      min-height: ${spacing[64]};
      min-width: 0;
      opacity: ${$inPeriod ? opacity.visible : opacity.disabled};
      padding: ${spacing[4]};
      position: relative;
      transition: background ${motion.duration.fast} ${motion.easing.out};

      &:nth-child(7n) {
        border-right: none;
      }

      ${$inPeriod &&
      css`
        &:hover {
          background: ${$selected ? colors.primary[100] : colors.primary[50]};
        }
      `}

      ${$today &&
      css`
        box-shadow: inset 0 0 0 2px ${colors.primary[500]};
      `}

      &:focus-visible {
        outline: 2px solid ${colors.primary[500]};
        outline-offset: -2px;
      }

      @media ${media.md} {
        min-height: ${spacing[96]};
        padding: ${spacing[8]};
      }
    `
  }}
`

export const EmptyCell = styled.div`
  background: ${colors.neutral[50]};
  border-right: 1px solid ${colors.neutral[200]};
  border-top: 1px solid ${colors.neutral[200]};

  &:nth-child(7n) {
    border-right: none;
  }
`

export const DayNumber = styled.span<{ $today: boolean }>`
  ${(props) => {
    const { $today } = props

    return css`
      color: ${$today ? colors.primary[700] : colors.neutral[700]};
      font-size: ${typography.fontSize.sm}px;
      font-weight: ${$today ? typography.fontWeight.bold : typography.fontWeight.medium};
    `
  }}
`

type ItemChipProps = {
  $background: string
  $color: string
}

// An item on a day, in its category's color; a button that opens the item when it can be edited. On a
// narrow screen there is no room for its title: it becomes a colored bar (its name stays accessible).
export const ItemChip = styled.button<ItemChipProps>`
  ${(props) => {
    const { $background, $color } = props

    return css`
      background: ${$background};
      border: none;
      border-radius: ${radius.sm};
      color: ${$color};
      cursor: pointer;
      font-family: inherit;
      font-size: ${typography.fontSize.xs}px;
      font-weight: ${typography.fontWeight.semibold};
      overflow: hidden;
      padding: 2px ${spacing[4]};
      text-align: left;
      text-overflow: ellipsis;
      white-space: nowrap;

      &:disabled {
        cursor: default;
      }

      &:focus-visible {
        outline: 2px solid ${colors.primary[500]};
        outline-offset: 1px;
      }

      @media not all and ${media.md} {
        background: ${$color};
        color: transparent;
        font-size: 0;
        height: ${spacing[4]};
        padding: 0;
      }
    `
  }}
`

export const MoreItems = styled.span`
  color: ${colors.neutral[700]};
  font-size: ${typography.fontSize.xs}px;
  padding: 0 ${spacing[4]};
`

export const ViewToggle = styled.div`
  display: flex;
  gap: ${spacing[8]};
`
