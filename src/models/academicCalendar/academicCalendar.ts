import type { ApiItemsPage } from "../httpClient/httpClient"

// The P04 basic calendar (backend docs/P04_CONTRATO.md, slice 4). The management (Admin, Secretaria,
// Coordenação, in their units) prepares items; only the Admin and the unit's Coordenação publish and
// withdraw. Everyone reads the published calendar of their own context - the Aluno and the Responsável
// only that. Saving never publishes, and publishing takes a closed snapshot.

// Only a school day counts as one; a holiday takes its days off the count; an event never changes it.
export type AcademicCalendarCategory = "DIA_LETIVO" | "EVENTO" | "FERIADO"

export type AcademicCalendarItemStatus = "ACTIVE" | "INACTIVE"

export type AcademicCalendarItemAction = "EDIT" | "REMOVE"

export type AcademicCalendarItem = {
  category: AcademicCalendarCategory
  description: string | null
  eligibleActions: AcademicCalendarItemAction[]
  endDate: string
  id: number
  periodId: number
  startDate: string
  status: AcademicCalendarItemStatus
  title: string
  unitIds: number[]
  version: number
}

export type AcademicCalendarItemPage = ApiItemsPage<AcademicCalendarItem>

export type AcademicCalendarItemParams = {
  direction?: "asc" | "desc"
  page?: number
  periodId?: number
  size?: number
  sortBy?: string
  status?: AcademicCalendarItemStatus
  unitId?: number
}

// Body of POST /api/academic/calendar/items and PUT .../{id} (with `version`). The units must be the
// period's, active and in the caller's scope; the dates within the period.
export type AcademicCalendarItemWrite = {
  category: AcademicCalendarCategory
  description?: string
  endDate: string
  periodId: number
  startDate: string
  title: string
  unitIds: number[]
  version?: number
}

// GET /api/academic/calendar/preview: what would be published for a unit, with the `revision` (the
// fingerprint of the items) to send back when publishing.
export type AcademicCalendarPreview = {
  canPublish: boolean
  changedSincePublished: boolean
  items: AcademicCalendarItem[]
  periodId: number
  publishedVersionNo: number | null
  revision: string
  schoolDays: number
  unitId: number
}

// Body of POST /api/academic/calendar/publish: each unit with the revision seen in its preview; a
// different one publishes nothing (409 VERSION_CONFLICT, all or nothing).
export type AcademicCalendarPublish = {
  periodId: number
  units: { revision: string; unitId: number }[]
}

export type AcademicCalendarVersionStatus = "PUBLISHED" | "SUPERSEDED" | "WITHDRAWN"

// An item as it was published.
export type AcademicPublishedItem = {
  category: AcademicCalendarCategory
  description: string | null
  endDate: string
  id: number
  startDate: string
  title: string
}

export type AcademicCalendarVersion = {
  eligibleActions: "WITHDRAW"[]
  id: number
  items: AcademicPublishedItem[]
  periodId: number
  publishedAt: string
  revision: string
  schoolDays: number
  status: AcademicCalendarVersionStatus
  unitId: number
  version: number
  versionNo: number
  withdrawReason: string | null
}

// GET /api/academic/calendar/published: "nothing published" is an answer (NOT_PUBLISHED), not a failure.
export type AcademicCalendarPublished = {
  state: "NOT_PUBLISHED" | "PUBLISHED"
  versions: AcademicCalendarVersion[]
}

export type AcademicCalendarContext = {
  periodId?: number
  unitId?: number
}

// Body of POST /api/academic/calendar/versions/{id}/withdraw: a reason is required; the version is kept.
export type AcademicCalendarWithdraw = {
  reason: string
  version: number
}
