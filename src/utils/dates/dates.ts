type FormatDateOptions = {
  withTime?: boolean
}

const pad = (value: number): string => String(value).padStart(2, "0")

type ParsedDate = {
  day: number
  hours: number
  minutes: number
  month: number
  year: number
}

// Parses the date/time parts directly out of the string instead of going through `Date`, so the
// result never depends on the runtime's timezone: `new Date("2026-07-04")` parses as UTC midnight,
// and reading it back with local getters can shift the calendar day in negative UTC offsets (e.g.
// Brazil). The literal date/time written in the string is what gets displayed - this does not
// convert between timezones.
const parseIsoDate = (value: string): ParsedDate => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(value)
  if (!match) throw new Error(`formatDate: "${value}" is not a valid ISO date string`)

  const [, year, month, day, hours, minutes] = match

  return {
    day: Number(day),
    hours: Number(hours ?? 0),
    minutes: Number(minutes ?? 0),
    month: Number(month),
    year: Number(year),
  }
}

// Accepts either a full ISO datetime ("2026-07-04T14:30:00.000Z") or a date-only ISO string
// ("2026-07-04"). withTime defaults to false; if it's true and the input had no time component,
// the time shows as 00:00.
export const formatDate = (value: string, options?: FormatDateOptions): string => {
  const withTime = options?.withTime ?? false

  const { day, hours, minutes, month, year } = parseIsoDate(value)
  const datePart = `${pad(day)}/${pad(month)}/${year}`

  if (!withTime) return datePart

  return `${datePart} ${pad(hours)}:${pad(minutes)}`
}
