import type { DocumentEnrollmentKind, DocumentParty } from "@/models"

export const enrollmentKinds: DocumentEnrollmentKind[] = ["ALL", "NEW", "TRANSFER", "REENROLLMENT"]

export const parties: DocumentParty[] = ["STUDENT", "SIGNATORY"]

// The backend's limits: a code of 2 to 40 letters, digits and underscores, a label up to 120 characters.
export const requirementLimits = { code: 40, label: 120, validityDays: 4 }
