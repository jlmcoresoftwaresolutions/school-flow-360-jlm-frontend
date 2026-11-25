import { fromIsoDate, toIsoDate } from "@/utils/dates"

// The month view of the calendar's preparation: the days of a month laid out in weeks, the first day of
// the week of the person's language, and the months a period covers.

// A month as "yyyy-MM".
export type MonthKey = string

export type MonthCell = { day: number; iso: string } | null

// 0 is Sunday, 1 is Monday. The browser knows the week of the language when it can (Intl.Locale
// weekInfo); without it, Brazil and the English-speaking world start on Sunday, Europe on Monday.
export const firstDayOfWeek = (language: string): number => {
  try {
    const locale = new Intl.Locale(language) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number }
      weekInfo?: { firstDay: number }
    }
    const info = locale.getWeekInfo?.() ?? locale.weekInfo
    if (info) return info.firstDay % 7
  } catch {
    // An unknown language falls back below.
  }
  return language === "pt-BR" || language.startsWith("en") ? 0 : 1
}

export const toMonthKey = (iso: string): MonthKey => iso.slice(0, 7)

export const shiftMonth = (month: MonthKey, delta: number): MonthKey => {
  const [year, monthNumber] = month.split("-").map(Number)
  const date = new Date(year, monthNumber - 1 + delta, 1)
  return toIsoDate(date).slice(0, 7)
}

// The weeks of a month, each with seven cells; the days before the 1st and after the last are empty.
export const monthWeeks = (month: MonthKey, weekStart: number): MonthCell[][] => {
  const first = fromIsoDate(`${month}-01`)
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  const lead = (first.getDay() - weekStart + 7) % 7
  const cells: MonthCell[] = Array.from({ length: lead }, () => null)
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, iso: `${month}-${String(day).padStart(2, "0")}` })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks: MonthCell[][] = []
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7))
  return weeks
}

// The month to open: today's when it is inside the period, otherwise the period's first.
export const initialMonth = (startDate: string, endDate: string): MonthKey => {
  const today = toIsoDate(new Date())
  return today >= startDate && today <= endDate ? toMonthKey(today) : toMonthKey(startDate)
}

// The two days of a selection in order.
export const orderRange = (first: string, second: string) =>
  first <= second ? { end: second, start: first } : { end: first, start: second }
