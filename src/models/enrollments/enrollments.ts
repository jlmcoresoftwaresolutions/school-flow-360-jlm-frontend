import type { ApiItemsPage } from "../httpClient/httpClient"
import type { PersonStatus } from "../people/people"

// The EPIC 6 enrollment (backend docs/P05_CONTRATO.md, slices 0 to 3A). DRAFT is a preparation;
// PENDING and BLOCKED will be stored once the confirmation exists; ACTIVE is a confirmed enrollment;
// LOCKED, CANCELLED, COMPLETED and TRANSFERRED belong to the P06 lifecycle (reserved); ABANDONED is a
// preparation given up.
export type EnrollmentStatus =
  | "ABANDONED"
  | "ACTIVE"
  | "BLOCKED"
  | "CANCELLED"
  | "COMPLETED"
  | "DRAFT"
  | "LOCKED"
  | "PENDING"
  | "TRANSFERRED"

// What the server lets the person do with this enrollment (only in preparation, only where they operate).
// CONFIRM comes only for a preparation with no pendency left.
export type EnrollmentAction = "ABANDON" | "CHOOSE_CONTEXT" | "CHOOSE_PARTIES" | "CONFIRM" | "SET_START_DATE"

// The kind of enrollment, which decides the documents it asks for.
export type EnrollmentKind = "NEW" | "REENROLLMENT" | "TRANSFER"

// The stages later slices add: not evaluated yet, so never read as fulfilled (RN39).
export type EnrollmentStage = "ACADEMIC_CONTEXT" | "CONTRACT" | "DOCUMENTS" | "FINANCIAL_CONDITIONS"

// The student, read again from People every time. `eligible`: only an active student can be confirmed;
// the preparation may start with any (DP-01).
export type EnrollmentStudent = {
  code: string | null
  eligible: boolean
  id: number
  name: string
  status: PersonStatus
}

// A guardian chosen for the enrollment, with the roles chosen explicitly (never from the kinship).
// `linkActive` false: the link ended after the choice, and its roles no longer count.
export type EnrollmentParty = {
  financial: boolean
  guardianId: number
  guardianName: string
  linkActive: boolean
  linkId: number | null
  relationshipCode: string | null
  signatory: boolean
}

// What still keeps the preparation from being confirmed, worked out by the server on every read. The
// `message` is the backend's own text (English): the screen labels each pendency by its code.
export type EnrollmentPendency = {
  category: string
  code: string
  message: string
}

// The class's occupation as the enrollment source reported it. UNAVAILABLE has no value: it is not zero.
export type EnrollmentOccupation = {
  asOf: string | null
  status: "AVAILABLE" | "UNAVAILABLE"
  value: number | null
}

// A class of the enrollment's unit, with the seats read now. Seats are information, never a reservation.
export type EnrollmentClassContext = {
  capacity: number
  classId: number
  classStatus: string
  code: string
  eligible: boolean
  name: string
  occupation: EnrollmentOccupation
  // Free seats; null when the occupation is unknown.
  seats: number | null
  shift: string | null
}

// An enrollment as the list and the detail answer it. `enrollmentNumber` (AAAA-NNNNNN) and `confirmedAt`
// come only once it is confirmed; `startDate` (yyyy-MM-dd) once chosen. `inactive`: a preparation not
// saved for 30 days (opening it doesn't count), still resumable.
export type Enrollment = {
  abandonReason: string | null
  classContext: EnrollmentClassContext | null
  confirmedAt: string | null
  createdAt: string
  eligibleActions: EnrollmentAction[]
  enrollmentNumber: string | null
  id: number
  inactive: boolean
  kind: EnrollmentKind
  notEvaluated: EnrollmentStage[]
  parties: EnrollmentParty[]
  pendencies: EnrollmentPendency[]
  startDate: string | null
  status: EnrollmentStatus
  student: EnrollmentStudent
  unitId: number
  unitName: string | null
  updatedAt: string
  version: number
}

export type EnrollmentPage = ApiItemsPage<Enrollment>

// GET /api/enrollments's query. Without `status`, the abandoned preparations are left out.
export type EnrollmentSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: "createdAt" | "id" | "status" | "updatedAt"
  status?: EnrollmentStatus
  unitId?: number
}

// GET /api/enrollments/students/search's query: the students the operator may prepare (their units only).
export type EnrollmentStudentSearchParams = {
  page?: number
  q?: string
  size?: number
  unitId?: number
}

// Body of POST /api/enrollments: starts a preparation (DRAFT).
// `kind` picks the school's document requirements that apply (NEW when left out).
export type EnrollmentStartRequest = {
  kind?: EnrollmentKind
  studentId: number
  unitId: number
}

// A guardian linked to the student in People (active or ended link), with the choice made for this
// enrollment. An ended link can't be chosen.
export type EnrollmentGuardianOption = {
  chosen: boolean
  contactAuthorized: boolean
  financial: boolean
  financialResponsible: boolean
  guardianId: number
  guardianName: string
  linkId: number
  linkStatus: "ACTIVE" | "ENDED"
  pedagogicalResponsible: boolean
  relationshipCode: string
  signatory: boolean
}

export type EnrollmentPartyChoice = {
  financial: boolean
  guardianId: number
  signatory: boolean
}

// Body of PUT /api/enrollments/{id}/parties: the whole set of guardians chosen.
export type EnrollmentPartiesRequest = {
  parties: EnrollmentPartyChoice[]
  version: number
}

// Body of PUT /api/enrollments/{id}/context: the class chosen, or null to take the choice back.
export type EnrollmentContextRequest = {
  classId: number | null
  version: number
}

// Body of PUT /api/enrollments/{id}/start-date: today or a later day (yyyy-MM-dd) within the class's
// period, never in the past; null takes the date back. The class must be chosen first.
export type EnrollmentStartDateRequest = {
  startDate: string | null
  version: number
}

// Body of POST /api/enrollments/{id}/confirm. `intent` is an opaque id made by the screen (up to 64
// characters), one per attempt the person understands as one: sending it again gives the same result.
export type EnrollmentConfirmRequest = {
  intent: string
  version: number
}

// Body of POST /api/enrollments/{id}/abandon: the reason (1 to 500 characters).
export type EnrollmentAbandonRequest = {
  reason: string
  version: number
}

// An event of the enrollment's history (PREPARATION, PARTY, CONTEXT or STATUS): who, when, the reason
// and the names of the fields changed; before and after only for a change of status. Never personal values.
export type EnrollmentHistoryEvent = {
  action: string
  actorName: string | null
  actorUserId: number | null
  afterValue: string | null
  beforeValue: string | null
  category: string
  changedFields: string | null
  id: number
  occurredAt: string
  reason: string | null
}

export type EnrollmentHistoryPage = ApiItemsPage<EnrollmentHistoryEvent>

// What a student or a guardian sees of an enrollment (GET /api/enrollments/mine, backend slice 3C): a
// preparation is only IN_PREPARATION, never in detail; the start date and the class come only once it is
// confirmed. Never documents, contract text, financial data, pendencies nor the school's history.
export type MyEnrollmentStatus =
  | Exclude<EnrollmentStatus, "ABANDONED" | "BLOCKED" | "DRAFT" | "PENDING">
  | "IN_PREPARATION"

export type MyEnrollment = {
  className: string | null
  enrollmentNumber: string | null
  id: number
  startDate: string | null
  status: MyEnrollmentStatus
  studentId: number
  studentName: string | null
  unitName: string | null
}

export type EnrollmentHistoryParams = {
  direction?: "asc" | "desc"
  page?: number
  size?: number
}
