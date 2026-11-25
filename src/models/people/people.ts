import type { ApiItemsPage } from "../httpClient/httpClient"

// The P03 people (backend docs/P03_CONTRATO.md): students and guardians are people (rows of the users
// table) with a role of their own. Admin and Secretaria only; a person out of the operator's reach
// answers 404 PERSON_NOT_FOUND, the same as one that doesn't exist. Documents and e-mails come masked.

// A student's or a guardian's registration status. A student is a draft until activated; a guardian is
// born active unless asked otherwise.
export type PersonStatus = "ACTIVE" | "DRAFT" | "INACTIVE"

// What kind of person: a person may be both (a guardian who is also a student).
export type PersonType = "GUARDIAN" | "STUDENT"

export type UnitRef = {
  id: number
  name: string
}

// A person in a link or an event: the student's `code` is its registration code (ALU-000001).
export type PersonRef = {
  code: string | null
  id: number
  name: string
}

// The address as the backend returns it (the bodies send the same fields flat, with `addressNumber`).
export type PersonAddress = {
  city: string | null
  complement: string | null
  neighborhood: string | null
  number: string | null
  postalCode: string | null
  state: string | null
  street: string | null
}

// One event of a person's registration history: what happened, who did it and when, with only the
// names of the fields changed (`details`); a link also keeps its non-sensitive before and after. For a
// Secretaria, an Admin appears as "Administracao".
export type PersonHistoryItem = {
  action: string
  actorName: string | null
  details: string | null
  entityId: string | null
  entityType: string | null
  id: number
  occurredAt: string
  result: string | null
}

export type PersonHistoryPage = ApiItemsPage<PersonHistoryItem>

// GET /api/people/search's query: `q` matches a name (without accents), an exact document or e-mail, a
// nickname or a student code.
export type PeopleSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  size?: number
  sortBy?: "fullName" | "id"
  status?: PersonStatus
  type?: "ANY" | PersonType
  unitId?: number
}

// What of a person matched the searched term: the name (without accents), or an exact document, e-mail
// (of login or contact), nickname or student code.
export type PeopleSearchMatch = "DOCUMENT" | "EMAIL" | "NAME" | "NICKNAME" | "STUDENT_CODE"

// One person found by the search, within the operator's reach. `matchedBy` says what matched the search.
export type PeopleSearchItem = {
  fullName: string
  guardianStatus: PersonStatus | null
  id: number
  matchedBy: PeopleSearchMatch[]
  maskedDocument: string | null
  nickname: string | null
  studentCode: string | null
  studentStatus: PersonStatus | null
  types: PersonType[]
  units: UnitRef[]
}

export type PeopleSearchPage = ApiItemsPage<PeopleSearchItem>

// The identifiers checked against the whole tenant (every unit): an e-mail, a document, a student code,
// or a name with a birth date (a name alone is not a valid check, 400).
export type PersonSignals = {
  birthDate?: string
  documentNumber?: string
  documentType?: string
  email?: string
  fullName?: string
  studentCode?: string
}

export type DuplicateStrength = "STRONG" | "WEAK"

// Why a candidate matched: an equal document, e-mail or student code (strong), or the same name with the
// same birth date (weak).
export type DuplicateSignal = "DOCUMENT" | "EMAIL" | "NAME_BIRTH" | "STUDENT_CODE"

// Someone the check found. Out of the operator's reach only a partial name and masked identifiers come,
// with a `ref` (the proof of reuse, valid 15 minutes); `id` and `fullName` only when `inScope`.
export type PersonCandidate = {
  fullName: string | null
  id: number | null
  inScope: boolean
  maskedDocument: string | null
  maskedEmail: string | null
  partialName: string | null
  ref: string
  signals: DuplicateSignal[]
  strong: boolean
  types: PersonType[]
}

export type PersonCheckResult = {
  candidates: PersonCandidate[]
  found: boolean
  strength: DuplicateStrength | null
}

export type DuplicateReviewKind = PersonType

export type DuplicateDecision = "KEEP_SEPARATE" | "REUSE"

// Body of POST /api/people/duplicate-reviews.
export type DuplicateReviewRequest = {
  kind: DuplicateReviewKind
  signals: PersonSignals
}

// Body of POST /api/people/duplicate-reviews/{id}/decision: REUSE needs the candidate's `ref`; keeping a
// strong signal separate needs a justification of 10 characters or more. The signals are sent again
// (the backend compares them and searches again).
export type DuplicateDecisionRequest = {
  candidateRef?: string
  decision: DuplicateDecision
  justification?: string
  signals: PersonSignals
}

// A duplicate review. Nobody found: `reviewId` null and `status` NONE. REUSE returns a `reuseRef`.
export type DuplicateReview = {
  candidates: PersonCandidate[]
  decidedAt: string | null
  decision: DuplicateDecision | null
  justification: string | null
  kind: DuplicateReviewKind
  reuseRef: string | null
  reviewId: number | null
  signals: string[]
  status: string
  strength: DuplicateStrength | null
}

export type PersonDocumentStatus = "ARCHIVED" | "EXPIRED" | "NO_FILE" | "VALID"

// A personal document. The number only comes masked; the file key never leaves the server.
export type PersonDocument = {
  contentType: string | null
  documentType: string
  documentTypeLabel: string
  expiresOn: string | null
  fileName: string | null
  fileSize: number | null
  hasFile: boolean
  id: number
  issuedOn: string | null
  maskedNumber: string | null
  status: PersonDocumentStatus
  version: number
}

// Body of POST /api/people/{personId}/documents. The expiry only for the types that have one.
export type PersonDocumentRequest = {
  documentNumber?: string
  documentType: string
  expiresOn?: string
  issuedOn?: string
}

// A document's download link: it lasts `expiresInSeconds` (300), so it is never kept.
export type PersonDocumentDownload = {
  expiresInSeconds: number
  fileName: string
  url: string
}

// Body of POST /api/people/{id}/anonymize: the protocol of the data subject's request (3 to 60 characters).
export type AnonymizeRequest = {
  requestRef: string
}

// What POST /api/people/maintenance/draft-cleanup answers: how many drafts were deleted, and the backend's
// retention in days (only a draft untouched for longer, with no link, open invitation or document, goes).
export type DraftCleanupResult = {
  removedDrafts: number
  retentionDays: number
}
