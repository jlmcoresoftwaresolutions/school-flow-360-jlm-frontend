import type { AcademicShiftCode } from "../academicCatalog/academicCatalog"
import type { ApiItemsPage } from "../httpClient/httpClient"

// The P04 classes and teacher links (backend docs/P04_CONTRATO.md, slice 2). A class is born in an
// existing active offer (unit, period and grade, which never change) as PREPARATION, then ACTIVE ⇄
// INACTIVE. A Professor only sees the classes where they have a current link, and only their own links.

export type AcademicClassStatus = "ACTIVE" | "INACTIVE" | "PREPARATION"

export type AcademicClassAction = "ACTIVATE" | "ADD_TEACHER" | "EDIT" | "INACTIVATE"

// What is missing without stopping an enrollment (today only the teacher).
export type AcademicClassPendency = "NO_TEACHER"

export type AcademicClass = {
  capacity: number
  code: string
  eligibleActions: AcademicClassAction[]
  // Computed, never editable: active class, unit and offer, open period, capacity above zero and an
  // active room (if any).
  eligibleForEnrollment: boolean
  gradeId: number
  id: number
  name: string
  noPhysicalRoom: boolean
  offerId: number
  pendencies: AcademicClassPendency[]
  periodId: number
  roomId: number | null
  shift: AcademicShiftCode
  shiftLabel: string
  status: AcademicClassStatus
  subjectIds: number[]
  unitId: number
  updatedAt: string
  version: number
}

export type AcademicClassPage = ApiItemsPage<AcademicClass>

export type AcademicClassSearchParams = {
  direction?: "asc" | "desc"
  gradeId?: number
  page?: number
  periodId?: number
  q?: string
  size?: number
  sortBy?: "code" | "name" | "status"
  status?: AcademicClassStatus
  unitId?: number
}

// Body of POST /api/academic/classes: a room of the same unit **or** `noPhysicalRoom`, never both nor
// neither; the subjects must be the offer's; the capacity a whole number ≥ 0.
export type AcademicClassCreate = {
  capacity: number
  code: string
  gradeId: number
  name: string
  noPhysicalRoom?: boolean
  periodId: number
  roomId?: number
  shift: AcademicShiftCode
  subjectIds: number[]
  unitId: number
}

// Body of PUT /api/academic/classes/{id}: only the name, the shift and the room change (the unit,
// period, grade and capacity are refused, 422; the capacity has its own review).
export type AcademicClassUpdate = {
  name: string
  noPhysicalRoom?: boolean
  roomId?: number
  shift: AcademicShiftCode
  version: number
}

// GET /api/academic/classes/{id}/impact: what stops activating it and what blocks inactivating it
// (sentences in English, from the backend), and whether the enrollment source answers.
export type AcademicClassImpact = {
  activationImpediments: string[]
  classId: number
  enrollmentSourceAvailable: boolean
  inactivationBlockers: string[]
}

// Body of POST /api/academic/classes/{id}/activate and /inactivate (an optional reason to inactivate).
export type AcademicClassStateChange = {
  reason?: string
  version: number
}

// A Professor of a unit, for a link: an active person of Usuários with the Professor role there, with
// or without a login (the id and the unit tell homonyms apart).
export type AcademicTeacher = {
  fullName: string
  hasAccess: boolean
  unitId: number
  userId: number
}

// Computed from the dates on the day of the answer.
export type AcademicTeacherLinkState = "CURRENT" | "ENDED" | "SCHEDULED"

export type AcademicTeacherLinkAction = "EDIT" | "END"

// A teacher's work in a class and subject, with inclusive dates (no end = open). Ending keeps who, when
// and why, and deletes nothing.
export type AcademicTeacherLink = {
  classId: number
  eligibleActions: AcademicTeacherLinkAction[]
  endDate: string | null
  endReason: string | null
  id: number
  joint: boolean
  startDate: string
  state: AcademicTeacherLinkState
  subjectId: number
  teacherName: string
  teacherUserId: number
  version: number
}

// Body of POST /api/academic/classes/{id}/teachers. A start or end in the past only by the Admin or the
// unit's Coordenação, with a reason; another teacher in the same class and subject only with `joint` in
// both links.
export type AcademicTeacherLinkCreate = {
  endDate?: string
  joint?: boolean
  reason?: string
  startDate: string
  subjectId: number
  teacherUserId: number
}

export type AcademicTeacherLinkUpdate = {
  endDate?: string
  joint?: boolean
  reason?: string
  startDate: string
  version: number
}

export type AcademicTeacherLinkEnd = {
  endDate: string
  reason: string
  version: number
}
