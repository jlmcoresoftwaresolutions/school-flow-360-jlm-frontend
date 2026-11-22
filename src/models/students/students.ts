import type { ApiItemsPage } from "../httpClient/httpClient"
import type { PersonAddress, PersonStatus, UnitRef } from "../people/people"
import type { GuardianInvitation, StudentGuardianLink } from "../studentGuardianLinks/studentGuardianLinks"

// What still keeps a draft student from being activated.
export type ActivationBlocker =
  | "BIRTH_DATE_REQUIRED"
  | "NAME_REQUIRED"
  | "NO_GUARDIAN"
  | "UNIT_INACTIVE"
  | "UNIT_REQUIRED"

// A student in the list: the registration code (ALU-000001, not an enrollment number), the reference
// unit, how many active guardians and whether one of them is financially responsible.
export type StudentSummary = {
  activeGuardians: number
  fullName: string
  hasFinancialGuardian: boolean
  id: number
  maskedDocument: string | null
  referenceUnit: UnitRef | null
  status: PersonStatus
  studentCode: string
}

export type StudentPage = ApiItemsPage<StudentSummary>

// GET /api/students's query.
export type StudentSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: "fullName" | "id"
  status?: PersonStatus
  unitId?: number
}

// A student as GET /api/students/{id} returns it. `hasAccess` says whether the student has an account
// (given by the school with a temporary password, signing in with the nickname); saving never creates one.
export type Student = {
  activatedByException: boolean
  activationBlockers: ActivationBlocker[]
  activeGuardians: number
  address: PersonAddress | null
  birthDate: string | null
  contactEmail: string | null
  createdAt: string
  documentType: string | null
  fullName: string
  hasAccess: boolean
  id: number
  loginEmail: string | null
  maskedDocument: string | null
  nickname: string | null
  observation: string | null
  phone: string | null
  referenceUnit: UnitRef | null
  socialName: string | null
  status: PersonStatus
  studentCode: string
  updatedAt: string
  version: number
}

// The editable fields of a student, as POST and PUT /api/students take them (the address flat). A blank
// document keeps the current one on an update. `duplicateReviewId` points at a review decided
// KEEP_SEPARATE for the same data.
export type StudentFields = {
  addressNumber?: string
  birthDate?: string
  city?: string
  complement?: string
  contactEmail?: string
  documentNumber?: string
  documentType?: string
  duplicateReviewId?: number
  fullName: string
  neighborhood?: string
  observation?: string
  phone?: string
  postalCode?: string
  referenceUnitId: number
  socialName?: string
  state?: string
  street?: string
}

// Body of POST /api/students: the nickname is suggested by the backend and may be changed.
export type StudentCreateRequest = StudentFields & {
  nickname?: string
}

export type StudentUpdateRequest = StudentFields & {
  version: number
}

// Body of the state changes (activate, inactivate, reactivate, discard). Only an Admin activates without
// a guardian, with an `exceptionReason` of 10 to 500 characters.
export type StudentStateChange = {
  exceptionReason?: string
  version: number
}

// The student 360: the identity, each guardian with its own link (active and ended), the invitations,
// and the sections the operator may open (a section without the right doesn't come).
export type Student360 = {
  guardianInvitations: GuardianInvitation[]
  guardians: Student360Guardian[]
  sections: string[]
  student: Student
}

export type Student360Guardian = {
  guardian: Student360GuardianSummary
  link: StudentGuardianLink
}

// The guardian as the student 360 shows it: masked, with what the list also says about it.
export type Student360GuardianSummary = {
  activeStudents: number
  fullName: string
  hasFinancialLink: boolean
  id: number
  maskedDocument: string | null
  maskedEmail: string | null
  phone: string | null
  status: PersonStatus
}

// What a guardian (or the student) sees of their own students (GET /api/me/students): only active links,
// with the responsibilities of their own link; no document, address or other guardians.
export type SelfStudent = {
  birthDate: string | null
  contactAuthorized: boolean | null
  financialResponsible: boolean | null
  fullName: string
  id: number
  pedagogicalResponsible: boolean | null
  referenceUnit: UnitRef | null
  relationshipCode: string | null
  socialName: string | null
  studentCode: string
}
