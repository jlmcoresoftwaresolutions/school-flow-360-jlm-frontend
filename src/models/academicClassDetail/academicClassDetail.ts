import type { AcademicSubjectRef } from "../academicCatalog/academicCatalog"
import type { AcademicClass } from "../academicClasses/academicClasses"

// The P04 class detail, capacity, history and the academic overview (backend docs/P04_CONTRATO.md,
// slice 3). Each tab is its own call: one failing leaves the others. A tab the caller has no right to
// doesn't exist for them (it doesn't come empty). The enrollment (EPIC 6) doesn't exist yet, so the
// occupation, the seats and the students answer UNAVAILABLE - never zero.

export type AcademicClassTab = "CAPACITY" | "GENERAL" | "HISTORY" | "STUDENTS" | "TEACHERS"

// GET /api/academic/classes/{id}/overview: the class and the tabs the caller may open.
export type AcademicClassOverview = {
  schoolClass: AcademicClass
  tabs: AcademicClassTab[]
}

// GET /api/academic/classes/{id}/general: the class with the names of what it refers to.
export type AcademicClassGeneral = {
  gradeName: string
  periodName: string
  roomName: string | null
  schoolClass: AcademicClass
  stageName: string
  subjects: AcademicSubjectRef[]
  unitName: string
}

// Whether the enrollment answered: UNAVAILABLE is not an empty class.
export type AcademicSourceStatus = "AVAILABLE" | "UNAVAILABLE"

export type AcademicOccupation = {
  asOf: string | null
  status: AcademicSourceStatus
  value: number | null
}

// A student of the class, from the enrollment: no document, health or family data.
export type AcademicClassStudent = {
  enrollmentId: number
  name: string
  status: string
  studentId: number
}

export type AcademicClassStudents = {
  asOf: string | null
  items: AcademicClassStudent[]
  page: number
  size: number
  status: AcademicSourceStatus
  total: number | null
}

export type AcademicClassStudentParams = {
  page?: number
  q?: string
  size?: number
}

export type AcademicCapacityAction = "AUTHORIZE_EXCEPTION" | "REVIEW_CAPACITY"

// GET /api/academic/classes/{id}/capacity (the unit's management only; Professor: 403). With the
// occupation unavailable, `seats` and `excess` come null.
export type AcademicClassCapacity = {
  capacity: number
  classId: number
  eligibleActions: AcademicCapacityAction[]
  exceptionEnabled: boolean
  excess: number | null
  occupation: AcademicOccupation
  queriedAt: string
  seats: number | null
  version: number
}

// Body of POST /api/academic/classes/{id}/capacity-review: a reason of 1 to 500 characters. Lowering
// the limit counts the occupation again (503 when the source doesn't answer; 409 below the enrolled).
export type AcademicCapacityReview = {
  newCapacity: number
  reason: string
  version: number
}

// Body of POST /api/academic/classes/{id}/capacity-exceptions: only the Admin, and only when the
// exception is turned on (off by default: 403 CAPACITY_EXCEPTION_DISABLED to everyone).
export type AcademicCapacityExceptionCreate = {
  quantity: number
  reason: string
  requestRef: string
  validUntil: string
}

export type AcademicCapacityException = {
  authorizedAt: string
  authorizedBy: number
  classId: number
  id: number
  quantity: number
  reason: string
  requestRef: string
  validUntil: string
}

export type AcademicEventCategory = "CALENDAR" | "CAPACITY" | "CONFIG" | "STATUS" | "TEACHER_LINK"

// An event of the class history: the names of the changed fields, and the before and after only where
// the specification asks (the limit, the link dates, the status).
export type AcademicClassEvent = {
  action: string
  actorName: string | null
  actorUserId: number | null
  after: string | null
  before: string | null
  category: AcademicEventCategory
  changedFields: string[]
  id: number
  objectId: number
  objectType: string
  occurredAt: string
  reason: string | null
}

export type AcademicClassHistoryParams = {
  direction?: "asc" | "desc"
  from?: string
  page?: number
  size?: number
  to?: string
  type?: Exclude<AcademicEventCategory, "CALENDAR">
}

export type AcademicOverviewShortcut = "CREATE_CLASS" | "CREATE_PERIOD" | "LINK_TEACHER" | "REVIEW_CAPACITY"

// GET /api/academic/overview: each class counted once in the caller's scope. `contextKey` (u{unit}:p{period})
// lets the screen drop the answer of an earlier context.
export type AcademicOverview = {
  active: number
  capacity: number
  classes: number
  classesWithoutTeacher: number
  contextKey: string
  inactive: number
  inPreparation: number
  occupation: AcademicOccupation
  periodId: number | null
  seats: number | null
  shortcuts: AcademicOverviewShortcut[]
  state: "EMPTY" | "READY"
  unitId: number | null
}

export type AcademicOverviewParams = {
  periodId?: number
  unitId?: number
}
