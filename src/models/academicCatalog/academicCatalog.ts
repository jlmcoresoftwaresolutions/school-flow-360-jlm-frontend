import type { ApiItemsPage } from "../httpClient/httpClient"

// The P04 academic catalog (backend docs/P04_CONTRATO.md, slice 1): the institution's stages, grades
// and subjects, and per unit the offers (a grade in a period, with its subjects), the physical rooms
// and the fixed shifts. Nothing is deleted: an inactive item leaves the new choices and keeps the old
// references. Every item carries `eligibleActions`, the server's decision.

export type AcademicCatalogStatus = "ACTIVE" | "INACTIVE"

export type AcademicCatalogAction = "ACTIVATE" | "ADD_GRADE" | "EDIT" | "EDIT_SUBJECTS" | "INACTIVATE" | "RENAME"

// The list queries of the stages, grades and subjects.
export type AcademicCatalogSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: string
  status?: AcademicCatalogStatus
}

// A level of the institution (Educação Infantil, Ensino Fundamental...): the order never identifies it.
export type AcademicStage = {
  eligibleActions: AcademicCatalogAction[]
  id: number
  name: string
  sortOrder: number
  status: AcademicCatalogStatus
  version: number
}

export type AcademicStagePage = ApiItemsPage<AcademicStage>

export type AcademicStageWrite = {
  name: string
  sortOrder: number
  version?: number
}

// A grade of one stage, fixed when created (the hierarchy has two levels).
export type AcademicGrade = {
  eligibleActions: AcademicCatalogAction[]
  id: number
  name: string
  sortOrder: number
  stageId: number
  status: AcademicCatalogStatus
  version: number
}

export type AcademicGradePage = ApiItemsPage<AcademicGrade>

export type AcademicGradeSearchParams = AcademicCatalogSearchParams & {
  stageId?: number
}

export type AcademicGradeWrite = {
  name: string
  sortOrder: number
  stageId: number
  version?: number
}

// A subject of the institution, reused by the offers: its code (1 to 30 characters) is unique without
// case, accents or repeated spaces.
export type AcademicSubject = {
  code: string
  description: string | null
  eligibleActions: AcademicCatalogAction[]
  id: number
  name: string
  status: AcademicCatalogStatus
  version: number
}

export type AcademicSubjectPage = ApiItemsPage<AcademicSubject>

export type AcademicSubjectWrite = {
  code: string
  description?: string
  name: string
  version?: number
}

export type AcademicSubjectRef = {
  code: string
  id: number
  name: string
}

// GET .../{stages|grades|subjects}/{id}/impact: what would block inactivating it (sentences in English,
// from the backend).
export type AcademicCatalogImpact = {
  blockers: string[]
  canInactivate: boolean
  id: number
}

// GET /api/academic/catalog/search: the similar items before creating one (at least 2 characters).
export type AcademicCatalogMatches = {
  grades: AcademicGrade[]
  stages: AcademicStage[]
  subjects: AcademicSubject[]
}

// A grade offered in a unit and a period, with the subjects it teaches. Unit, period and grade never
// change after it is created.
export type AcademicOffer = {
  eligibleActions: AcademicCatalogAction[]
  gradeId: number
  id: number
  periodId: number
  status: AcademicCatalogStatus
  subjectIds: number[]
  unitId: number
  version: number
}

export type AcademicOfferPage = ApiItemsPage<AcademicOffer>

export type AcademicOfferSearchParams = {
  direction?: "asc" | "desc"
  gradeId?: number
  page?: number
  periodId?: number
  size?: number
  sortBy?: string
  status?: AcademicCatalogStatus
  unitId?: number
}

export type AcademicOfferCreate = {
  gradeId: number
  periodId: number
  unitId: number
}

// Body of PUT /api/academic/offers/{id}/subjects: the whole list replaces the current one.
export type AcademicOfferSubjects = {
  subjectIds: number[]
  version: number
}

// A physical room of a unit; it never changes unit.
export type AcademicRoom = {
  eligibleActions: AcademicCatalogAction[]
  id: number
  name: string
  status: AcademicCatalogStatus
  unitId: number
  version: number
}

export type AcademicRoomWrite = {
  name: string
  unitId: number
  version?: number
}

// The fixed shifts (a shift is not a class schedule).
export type AcademicShiftCode = "INTEGRAL" | "MANHA" | "NOITE" | "TARDE"

export type AcademicShift = {
  code: AcademicShiftCode
  label: string
}

// Body of the activations and inactivations of the catalog: only the version.
export type AcademicVersionOnly = {
  version: number
}
