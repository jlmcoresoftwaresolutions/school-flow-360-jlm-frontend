import type { ApiItemsPage } from "../httpClient/httpClient"

// The P04 school periods (backend docs/P04_CONTRATO.md, slice 1). Admin, Secretaria and Coordenação
// manage them in the units of their assignments; a Professor only reads the ones of the units they
// teach in. A period is saved CONFIGURED (saving never activates it), then ACTIVE, then CLOSED for good.

export type AcademicPeriodStatus = "ACTIVE" | "CLOSED" | "CONFIGURED"

export type AcademicPeriodKind = "ANNUAL" | "OTHER" | "SEMESTER"

// What the server lets the caller do with the period now.
export type AcademicPeriodAction = "ACTIVATE" | "CLOSE" | "EDIT"

export type AcademicPeriod = {
  closeReason: string | null
  eligibleActions: AcademicPeriodAction[]
  endDate: string
  id: number
  kind: AcademicPeriodKind
  name: string
  referenceYear: number
  startDate: string
  status: AcademicPeriodStatus
  unitIds: number[]
  updatedAt: string
  version: number
}

export type AcademicPeriodPage = ApiItemsPage<AcademicPeriod>

// GET /api/academic/periods's query. The scope is applied before counting and paging.
export type AcademicPeriodSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: "name" | "referenceYear" | "startDate" | "status"
  status?: AcademicPeriodStatus
  year?: number
}

// Body of POST /api/academic/periods and PUT /api/academic/periods/{id} (the edition with `version`).
// Every unit must be active and in the caller's scope; dates are business dates (yyyy-MM-dd).
export type AcademicPeriodWrite = {
  endDate: string
  kind: AcademicPeriodKind
  name: string
  referenceYear: number
  startDate: string
  unitIds: number[]
  version?: number
}

// GET /api/academic/periods/{id}/impact: what would block closing it (sentences in English, from the
// backend), and how many active offers it has.
export type AcademicPeriodImpact = {
  activeOffers: number
  blockers: string[]
  canClose: boolean
  periodId: number
}

// Body of POST /api/academic/periods/{id}/close: a reason of 1 to 500 characters.
export type AcademicPeriodClose = {
  reason: string
  version: number
}
