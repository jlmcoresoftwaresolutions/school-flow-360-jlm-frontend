// The documents of an enrollment (backend docs/P05_CONTRATO.md, slice 3B): the school's catalog of
// requirements, an enrollment's checklist and the documentary exceptions. A file is never exposed, only
// its metadata; downloading asks for a short link every time.

// Whose document a requirement asks for: the student's, or each signatory's (an adult student with no
// guardian signs for themself).
export type DocumentParty = "SIGNATORY" | "STUDENT"

// The kind of enrollment a requirement applies to.
export type DocumentEnrollmentKind = "ALL" | "NEW" | "REENROLLMENT" | "TRANSFER"

// A line of the checklist. EXCEPTED is covered by an approved exception and is never shown as delivered
// (`document` is null); EXPIRED went past its validity.
export type EnrollmentDocumentStatus = "APPROVED" | "EXCEPTED" | "EXPIRED" | "PENDING" | "RECEIVED" | "REJECTED"

// What the server lets the person do with a line.
export type EnrollmentDocumentAction = "APPROVE" | "ATTACH" | "DOWNLOAD" | "REJECT" | "REQUEST_EXCEPTION" | "UPLOAD"

export type EnrollmentExceptionStatus = "APPROVED" | "DENIED" | "REQUESTED"

// The document attached to a line, as People keeps it: type, file name and dates only.
export type EnrollmentDocumentRef = {
  documentType: string
  documentTypeLabel: string | null
  expiresOn: string | null
  fileName: string | null
  hasFile: boolean
  id: number
  issuedOn: string | null
}

// A documentary exception: the Secretaria or the Admin asks, only the Admin decides, and never the person
// who asked. Approved, it covers the line for 30 days at most (never past the period's end); past that
// without the document approved it is `overdue` and the line blocks again.
export type EnrollmentDocumentException = {
  decidedAt: string | null
  decidedBy: number | null
  decisionReason: string | null
  dueDate: string | null
  id: number
  overdue: boolean
  personId: number | null
  personName: string | null
  reason: string
  requestedAt: string
  requestedBy: number
  requirementCode: string
  requirementId: number
  status: EnrollmentExceptionStatus
  version: number
}

// A line of the checklist: one per requirement that applies, and per person. `satisfied`: approved and
// valid, or covered by an exception in time; `blocking`: mandatory and not satisfied. `itemId` and
// `itemVersion` exist once something was attached.
export type EnrollmentDocumentItem = {
  acceptedTypes: string[]
  blocking: boolean
  code: string
  document: EnrollmentDocumentRef | null
  eligibleActions: EnrollmentDocumentAction[]
  exception: EnrollmentDocumentException | null
  exemptable: boolean
  itemId: number | null
  itemVersion: number | null
  label: string
  mandatory: boolean
  party: DocumentParty
  personId: number | null
  personName: string | null
  rejectReason: string | null
  requirementId: number
  satisfied: boolean
  status: EnrollmentDocumentStatus
  validUntil: string | null
}

// GET /api/enrollments/{id}/documents. `published` false: the school published no requirement for this
// unit, stage and kind yet (nothing is asked). `openCodes`: the mandatory ones still open.
export type EnrollmentDocumentChecklist = {
  enrollmentId: number
  items: EnrollmentDocumentItem[]
  openCodes: string[]
  published: boolean
}

// The fields of POST /api/enrollments/{id}/documents/{requirementId}/file besides the file (multipart):
// the document type (one the line accepts), whose it is, and its dates (yyyy-MM-dd).
export type EnrollmentDocumentUpload = {
  documentType: string
  expiresOn?: string
  issuedOn?: string
  personId?: number
}

// Body of PUT /api/enrollments/{id}/documents/{requirementId}/attach: a document already in People, with
// a stored file and an accepted type.
export type EnrollmentDocumentAttach = {
  personDocumentId: number
  personId?: number
}

// Body of POST /api/enrollments/{id}/documents/items/{itemId}/review: rejecting requires a reason.
export type EnrollmentDocumentReview = {
  decision: "APPROVE" | "REJECT"
  reason?: string
  version: number
}

// Body of POST /api/enrollments/{id}/exceptions.
export type EnrollmentExceptionRequest = {
  personId?: number
  reason: string
  requirementId: number
}

// Body of POST /api/enrollments/{id}/exceptions/{exceptionId}/decision. `dueDate` (yyyy-MM-dd) may only
// shorten the 30 days.
export type EnrollmentExceptionDecision = {
  decision: "APPROVE" | "DENY"
  dueDate?: string
  reason: string
  version: number
}

// A requirement of the school's catalog (Admin writes, Secretaria reads). It is born inactive and asked
// for only once published (`active`). Empty `stageId`/`unitId`: every stage or unit.
export type DocumentRequirement = {
  acceptedTypes: string[]
  active: boolean
  code: string
  enrollmentKind: DocumentEnrollmentKind
  exemptable: boolean
  id: number
  label: string
  mandatory: boolean
  party: DocumentParty
  sortOrder: number
  stageId: number | null
  unitId: number | null
  useDocumentExpiry: boolean
  validFrom: string | null
  validTo: string | null
  validityDays: number | null
  version: number
}

// Body of POST and PUT /api/enrollment-documents/requirements.
export type DocumentRequirementWrite = {
  acceptedTypes: string[]
  code: string
  enrollmentKind: DocumentEnrollmentKind
  exemptable: boolean
  label: string
  mandatory: boolean
  party: DocumentParty
  sortOrder?: number
  stageId?: number | null
  unitId?: number | null
  useDocumentExpiry: boolean
  validFrom?: string | null
  validTo?: string | null
  validityDays?: number | null
  version?: number
}
