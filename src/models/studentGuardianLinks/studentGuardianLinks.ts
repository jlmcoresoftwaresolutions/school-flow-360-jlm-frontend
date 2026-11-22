import type { PersonRef } from "../people/people"

export type LinkStatus = "ACTIVE" | "ENDED"

// A student-guardian link: the relationship (from the catalog) and three independent responsibilities.
// It is only ACTIVE or ENDED, never deleted; the consent to process the child's data is recorded on it.
export type StudentGuardianLink = {
  consentAt: string | null
  consentTermsVersion: string | null
  contactAuthorized: boolean
  endDate: string | null
  endReason: string | null
  financialResponsible: boolean
  guardian: PersonRef
  id: number
  pedagogicalResponsible: boolean
  relationshipCode: string
  relationshipLabel: string
  startDate: string | null
  status: LinkStatus
  student: PersonRef
  version: number
}

// Body of POST /api/student-guardian-links: the guardian by id, or by the `reuseRef` the exact check
// gave (for a guardian of another unit). Left out, the responsibilities are: pedagogical yes, financial
// no, contact yes. The consent must be confirmed.
export type StudentGuardianLinkCreateRequest = {
  consentConfirmed: boolean
  contactAuthorized?: boolean
  financialResponsible?: boolean
  guardianId?: number
  pedagogicalResponsible?: boolean
  relationshipCode: string
  reuseRef?: string
  startDate?: string
  studentId: number
}

// Body of PUT /api/student-guardian-links/{id}.
export type StudentGuardianLinkUpdateRequest = {
  contactAuthorized: boolean
  financialResponsible: boolean
  pedagogicalResponsible: boolean
  relationshipCode: string
  startDate?: string
  version: number
}

// Body of POST /api/student-guardian-links/{id}/end: a reason is required; ending the last guardian of
// an active student needs the Admin's `exceptionReason`.
export type StudentGuardianLinkEndRequest = {
  endDate?: string
  exceptionReason?: string
  reason: string
  version: number
}

export type GuardianInvitationStatus =
  | "AWAITING_CONFIRMATION"
  | "CANCELLED"
  | "CONFIRMED"
  | "REJECTED"
  | "WAITING_ACCEPTANCE"

// A guardian invited from a student. Once the guardian accepts, the school confirms (which creates the
// active link) or rejects it.
export type GuardianInvitation = {
  channelResult: string | null
  contactAuthorized: boolean
  email: string
  expiresAt: string | null
  financialResponsible: boolean
  guardianId: number | null
  guardianName: string | null
  id: number
  invitationId: number | null
  invitationStatus: string | null
  linkId: number | null
  pedagogicalResponsible: boolean
  relationshipCode: string
  status: GuardianInvitationStatus
  studentId: number
}

// Body of POST /api/students/{id}/guardian-invitations: a guardian already registered goes by
// `guardianId` (or `reuseRef`), so the account is tied to that same person.
export type GuardianInvitationRequest = {
  contactAuthorized?: boolean
  email: string
  financialResponsible?: boolean
  fullName?: string
  guardianId?: number
  pedagogicalResponsible?: boolean
  relationshipCode: string
  reuseRef?: string
}
