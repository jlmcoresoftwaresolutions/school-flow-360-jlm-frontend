import { type KeyboardEvent, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, IconButton, Text } from "@/ds-components/atoms"
import { badgeToneMap } from "@/ds-components/atoms/Badge/Badge.styles"
import type { AcademicCalendarItem, AcademicPeriod } from "@/models"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import {
  DayCell,
  DayNumber,
  EmptyCell,
  ItemChip,
  MonthGrid,
  MonthNavigation,
  MonthToolbar,
  MoreItems,
  WeekdayName,
} from "./AcademicCalendar.styles"
import { firstDayOfWeek, type MonthKey, monthWeeks, orderRange, shiftMonth, toMonthKey } from "./monthGrid"

export type CalendarMonthProps = {
  // Whether the person may prepare items: only then a day opens a new item.
  canPrepare: boolean
  items: AcademicCalendarItem[]
  // The month shown ("yyyy-MM"), kept by the parent so a reload after a save stays on it.
  month: MonthKey
  period: AcademicPeriod
  onMonthChange: (month: MonthKey) => void
  // An item on a day was clicked (only one the person may edit).
  onOpenItem: (item: AcademicCalendarItem) => void
  // A day, or a range dragged across days, was chosen for a new item.
  onSelectRange: (range: { end: string; start: string }) => void
}

// How many items a day shows before "+N".
const visibleItems = 3

// The calendar's preparation as a big month, like a meeting calendar (asked by Lucas on 25/11/2026):
// clicking a day, or dragging across days, opens a new item with those dates; an item on a day opens it to
// edit. Only the days inside the period can be chosen; the months go from the period's first to its last.
// The keyboard reaches every day (Enter or Space opens a new item on it).
export const CalendarMonth = (props: CalendarMonthProps) => {
  const { canPrepare, items, month, onMonthChange, onOpenItem, onSelectRange, period } = props

  const { i18n, t } = useTranslation()
  const { calendarCategoryLabel, calendarCategoryTone } = useAcademicLabels()

  // The day where a drag started and the day it is over now.
  const [anchor, setAnchor] = useState<string | null>(null)
  const [hover, setHover] = useState<string | null>(null)

  const weekStart = firstDayOfWeek(i18n.language)
  const weeks = monthWeeks(month, weekStart)
  const today = toIsoDate(new Date())
  const firstMonth = toMonthKey(period.startDate)
  const lastMonth = toMonthKey(period.endDate)
  const todayInPeriod = today >= period.startDate && today <= period.endDate
  const selection = anchor && hover ? orderRange(anchor, hover) : null
  const monthName = new Intl.DateTimeFormat(i18n.language, { month: "long", year: "numeric" }).format(
    fromIsoDate(`${month}-01`),
  )
  // Only the first letter goes up ("Fevereiro de 2026", never "Fevereiro De 2026").
  const monthTitle = monthName.charAt(0).toLocaleUpperCase(i18n.language) + monthName.slice(1)
  const weekdayFormat = new Intl.DateTimeFormat(i18n.language, { weekday: "short" })
  const dayFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "full" })
  // A Sunday, to name the weekdays from.
  const sunday = new Date(2026, 10, 1)
  const weekdays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + ((weekStart + index) % 7))
    return weekdayFormat.format(date)
  })

  // A drag ends wherever the button is released, even outside the grid.
  useEffect(() => {
    if (!anchor) return

    const finish = () => {
      onSelectRange(orderRange(anchor, hover ?? anchor))
      setAnchor(null)
      setHover(null)
    }

    window.addEventListener("mouseup", finish)
    return () => window.removeEventListener("mouseup", finish)
  }, [anchor, hover, onSelectRange])

  const inPeriod = (iso: string) => iso >= period.startDate && iso <= period.endDate
  const itemsOn = (iso: string) => items.filter((item) => item.startDate <= iso && item.endDate >= iso)

  const onDayKeyDown = (event: KeyboardEvent, iso: string) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    onSelectRange({ end: iso, start: iso })
  }

  const renderDay = (iso: string, day: number) => {
    const dayItems = itemsOn(iso)
    const selectable = canPrepare && inPeriod(iso)
    const weekday = fromIsoDate(iso).getDay()
    const label = dayFormat.format(fromIsoDate(iso))

    return (
      <DayCell
        key={iso}
        $inPeriod={inPeriod(iso)}
        $selected={Boolean(selection && iso >= selection.start && iso <= selection.end)}
        $today={iso === today}
        $weekend={weekday === 0 || weekday === 6}
        aria-label={selectable ? t("academicCalendar.month.addOn", { date: label }) : label}
        onKeyDown={selectable ? (event) => onDayKeyDown(event, iso) : undefined}
        onMouseDown={
          selectable
            ? (event) => {
                if (event.button !== 0) return
                setAnchor(iso)
                setHover(iso)
              }
            : undefined
        }
        onMouseEnter={selectable && anchor ? () => setHover(iso) : undefined}
        role={selectable ? "button" : undefined}
        tabIndex={selectable ? 0 : undefined}
      >
        <DayNumber $today={iso === today} aria-hidden>
          {day}
        </DayNumber>
        {dayItems.slice(0, visibleItems).map((item) => {
          const tone = badgeToneMap[calendarCategoryTone(item.category)]
          const editable = item.eligibleActions.includes("EDIT")
          return (
            <ItemChip
              key={item.id}
              $background={tone.background}
              $color={tone.color}
              aria-label={`${calendarCategoryLabel(item.category)}: ${item.title}`}
              disabled={!editable}
              onClick={() => onOpenItem(item)}
              onKeyDown={(event) => event.stopPropagation()}
              onMouseDown={(event) => event.stopPropagation()}
              title={item.title}
              type="button"
            >
              {item.title}
            </ItemChip>
          )
        })}
        {dayItems.length > visibleItems && (
          <MoreItems>{t("academicCalendar.month.more", { count: dayItems.length - visibleItems })}</MoreItems>
        )}
      </DayCell>
    )
  }

  return (
    <>
      <MonthToolbar>
        <Text as="h3" fontSize="lg" semibold>
          {monthTitle}
        </Text>
        <MonthNavigation>
          {todayInPeriod && (
            <Button onClick={() => onMonthChange(toMonthKey(today))} size="small" variant="outlined">
              {t("academicCalendar.month.today")}
            </Button>
          )}
          <IconButton
            disabled={month <= firstMonth}
            icon="chevron-left"
            label={t("academicCalendar.month.previous")}
            onClick={() => onMonthChange(shiftMonth(month, -1))}
          />
          <IconButton
            disabled={month >= lastMonth}
            icon="chevron-right"
            label={t("academicCalendar.month.next")}
            onClick={() => onMonthChange(shiftMonth(month, 1))}
          />
        </MonthNavigation>
      </MonthToolbar>

      {canPrepare && (
        <Text color="secondary" fontSize="sm">
          {t("academicCalendar.month.hint")}
        </Text>
      )}

      <MonthGrid aria-label={monthTitle} role="group">
        {weekdays.map((name) => (
          <WeekdayName key={name}>{name}</WeekdayName>
        ))}
        {weeks
          .flat()
          .map((cell, index) =>
            cell ? renderDay(cell.iso, cell.day) : <EmptyCell key={`empty-${index}`} aria-hidden />,
          )}
      </MonthGrid>
    </>
  )
}
