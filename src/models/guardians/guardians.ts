import type { ApiItemsPage } from "../httpClient/httpClient"
import type { PersonAddress, PersonStatus, UnitRef } from "../people/people"
import type { StudentGuardianLink } from "../studentGuardianLinks/studentGuardianLinks"

// A guardian in the list: masked document and e-mail, how many active students (only the ones the
// operator may see) and whether one of the links is financial.
export type GuardianSummary = {
  activeStudents: number
  fullName: string
  hasFinancialLink: boolean
  id: number
  maskedDocument: string | null
  maskedEmail: string | null
  phone: string | null
  status: PersonStatus
}

export type GuardianPage = ApiItemsPage<GuardianSummary>

// GET /api/guardians's query.
export type GuardianSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: "fullName" | "id"
  status?: PersonStatus
  unitId?: number
}

// A guardian as GET /api/guardians/{id} returns it. It belongs to the unit it was registered in and to
// the units of its students; `hasAccess` says whether it has an account (only through an invitation).
export type Guardian = {
  activeStudents: number
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
  phone: string | null
  socialName: string | null
  status: PersonStatus
  units: UnitRef[]
  updatedAt: string
  version: number
}

// The editable fields of a guardian, as POST and PUT /api/guardians take them (the address flat).
export type GuardianFields = {
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
  phone?: string
  postalCode?: string
  socialName?: string
  state?: string
  street?: string
}

// Body of POST /api/guardians: the unit it is registered in, and whether it is born active (the default).
// It never creates an access, an invitation or a link.
export type GuardianCreateRequest = GuardianFields & {
  activate?: boolean
  unitId: number
}

export type GuardianUpdateRequest = GuardianFields & {
  version: number
}

// Body of the guardian's state changes (activate, inactivate, reactivate).
export type GuardianStateChange = {
  version: number
}

// The guardian's detail: the guardian, its links with the students in the operator's reach, and the
// sections the operator may open.
export type GuardianProfile = {
  guardian: Guardian
  sections: string[]
  students: StudentGuardianLink[]
}
