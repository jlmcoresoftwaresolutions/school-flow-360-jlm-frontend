// The events of a class's history the screen knows, by the backend's action code (an unknown one shows its
// code as it came), and the fields they name (an unknown one shows its name as it came).
export const classEventActions = [
  "CAPACITY_EXCEPTION_AUTHORIZED",
  "CAPACITY_REVIEWED",
  "CLASS_ACTIVATED",
  "CLASS_CREATED",
  "CLASS_INACTIVATED",
  "CLASS_UPDATED",
  "TEACHER_LINK_CREATED",
  "TEACHER_LINK_ENDED",
  "TEACHER_LINK_UPDATED",
] as const

export type ClassEventAction = (typeof classEventActions)[number]

export const classEventFields = [
  "capacity",
  "code",
  "endDate",
  "joint",
  "name",
  "room",
  "shift",
  "startDate",
  "status",
  "subject",
  "subjects",
  "teacher",
] as const

export type ClassEventField = (typeof classEventFields)[number]

export const isClassEventAction = (value: string): value is ClassEventAction =>
  (classEventActions as readonly string[]).includes(value)

export const isClassEventField = (value: string): value is ClassEventField =>
  (classEventFields as readonly string[]).includes(value)

// A teacher link's dates as the backend writes them in the history ("2026-02-02..2026-06-30 joint", an
// empty end when open), or null when the value isn't one.
export const readLinkInterval = (value: string) => {
  const match = /^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})?( joint)?$/.exec(value.trim())
  if (!match) return null

  return { end: match[2] ?? null, joint: Boolean(match[3]), start: match[1] }
}
