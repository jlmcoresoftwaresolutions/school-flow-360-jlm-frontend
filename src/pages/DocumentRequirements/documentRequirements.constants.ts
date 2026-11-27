import type { DocumentEnrollmentKind, DocumentParty, DocumentPolicyKind, DocumentPolicyMode } from "@/models"

export const enrollmentKinds: DocumentEnrollmentKind[] = ["ALL", "NEW", "TRANSFER", "REENROLLMENT"]

export const parties: DocumentParty[] = ["STUDENT", "SIGNATORY"]

// The backend's limits: a code of 2 to 40 letters, digits and underscores, a label up to 120 characters.
export const requirementLimits = { code: 40, label: 120, validityDays: 4 }

// The requirements the backend never lets be waived, whatever the Admin sends (P06, V45): the identity of
// who signs and the proof of representation are outside the administrative waiver.
export const neverWaivedCodes = ["REPRESENTATION_PROOF", "SIGNATORY_ID"]

// The kinds a unit publishes its document policy for, in the order the tab shows them.
export const policyKinds: DocumentPolicyKind[] = ["NEW", "TRANSFER", "REENROLLMENT"]

export const policyModes: DocumentPolicyMode[] = ["USE_CATALOG", "NO_BLOCKING_REQUIREMENTS"]

// The backend's limit for the note of a policy.
export const policyNoteMax = 300
