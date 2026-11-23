// The stable codes the backend puts on errors, so a screen never has to read the message (section 5
// of the backend's docs/P02_CONTRATO.md says when each comes). The *_NOT_FOUND codes also mean "out of
// your scope": the backend never tells the two apart. Some errors come without a code.
export type ApiErrorCode =
  | "ACADEMIC_CAPACITY_BELOW_OCCUPATION"
  | "ACADEMIC_DEPENDENCY_ACTIVE"
  | "ACADEMIC_DUPLICATE_CODE"
  | "ACADEMIC_FIELD_INCOMPATIBLE"
  | "ACADEMIC_INVALID_RANGE"
  | "ACADEMIC_JOINT_REQUIRED"
  | "ACADEMIC_NOT_ELIGIBLE"
  | "ACADEMIC_NOT_FOUND"
  | "ACADEMIC_PERIOD_OVERLAP"
  | "ACADEMIC_SOURCE_UNAVAILABLE"
  | "ACCESS_DENIED"
  | "ADMIN_CANNOT_BE_ANONYMIZED"
  | "ADMIN_EXCEPTION_ONLY"
  | "ASSIGNMENT_NOT_FOUND"
  | "BIRTH_DATE_FUTURE"
  | "BIRTH_DATE_REQUIRED"
  | "CANDIDATE_NOT_IN_REVIEW"
  | "CAPACITY_EXCEPTION_DISABLED"
  | "CHALLENGE_INVALID"
  | "CONSENT_REQUIRED"
  | "CURRENT_PASSWORD_INVALID"
  | "DATA_CONFLICT"
  | "DATES_INVALID"
  | "DOCUMENT_ARCHIVED"
  | "DOCUMENT_INCOMPLETE"
  | "DOCUMENT_INVALID"
  | "DOCUMENT_IN_USE"
  | "DOCUMENT_TYPE_INVALID"
  | "DUPLICATE_REVIEW_NOT_FOUND"
  | "DUPLICATE_REVIEW_REQUIRED"
  | "DUPLICATE_REVIEW_RESOLVED"
  | "DUPLICATE_REVIEW_SIGNALS_MISMATCH"
  | "DUPLICATE_REVIEW_STALE"
  | "EMAIL_INVALID"
  | "END_BEFORE_START"
  | "EXCEPTION_REASON_INVALID"
  | "EXPIRY_NOT_APPLICABLE"
  | "FILE_NOT_FOUND"
  | "FILE_REQUIRED"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_NOT_ALLOWED"
  | "GUARDIAN_HAS_ACCESS"
  | "GUARDIAN_INACTIVE"
  | "GUARDIAN_REQUIRED"
  | "IMPACTS_NOT_CONFIRMED"
  | "INVALID_REQUEST"
  | "INVITATION_ALREADY_USED"
  | "INVITATION_EXPIRED"
  | "INVITATION_INVALID"
  | "INVITATION_LINK_STATE_INVALID"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_PENDING"
  | "INVITATION_STATE_INVALID"
  | "JUSTIFICATION_REQUIRED"
  | "LAST_ADMIN"
  | "LAST_GUARDIAN"
  | "LINK_DUPLICATE"
  | "LINK_ENDED"
  | "LINK_NOT_FOUND"
  | "LINK_SELF"
  | "MUST_BE_INACTIVE"
  | "NAME_REQUIRED"
  | "NICKNAME_IN_USE"
  | "NO_ACTIVE_ASSIGNMENT"
  | "ORGANIZATION_REQUIRED"
  | "OWN_ACCOUNT"
  | "PASSWORD_CHANGE_REQUIRED"
  | "PASSWORD_INVALID"
  | "PASSWORD_UNCHANGED"
  | "PERSON_ANONYMIZED"
  | "PERSON_NOT_FOUND"
  | "REASON_REQUIRED"
  | "RELATIONSHIP_INVALID"
  | "REQUEST_REF_REQUIRED"
  | "REUSE_TOKEN_INVALID"
  | "ROLE_NOT_GRANTABLE"
  | "SCOPE_DENIED"
  | "SEARCH_RATE_LIMITED"
  | "SESSION_LIMIT_REACHED"
  | "SESSION_NOT_FOUND"
  | "STATE_INVALID"
  | "STORAGE_DISABLED"
  | "STRONG_IDENTIFIER_UNIQUE"
  | "STUDENT_INACTIVE"
  | "TENANT_NOT_FOUND"
  | "TERMS_NOT_ACCEPTED"
  | "TERMS_VERSION_INVALID"
  | "UNIT_INACTIVE"
  | "UNIT_NAME_DUPLICATE"
  | "UNIT_NOT_FOUND"
  | "UNIT_REQUIRED"
  | "USER_DUPLICATE"
  | "USER_NOT_FOUND"
  | "VERSION_CONFLICT"
  | "VERSION_REQUIRED"
  | "WEAK_PASSWORD"

// The envelope every SchoolFlow360 backend response comes in, success or error: the payload is in
// `data` (null on an error), `status` is "Success"/"Error" and `message` is the backend's own text.
// `code` is the error's stable code, when it has one. `correlationId` identifies the request in the
// backend's logs, for support.
export type ApiResponse<T> = {
  data: T | null
  message: string
  status: string
  tenantId: string
  code?: ApiErrorCode | null
  correlationId?: string
}

// A page of the P02 lists (users, invitations, the access audit): a simpler shape than Spring's, with
// the items in `items` and `page` zero-based.
export type ApiItemsPage<T> = {
  items: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

// Spring's sort descriptor inside a page.
export type ApiSort = {
  empty: boolean
  sorted: boolean
  unsorted: boolean
}

// Spring's pageable descriptor inside a page.
export type ApiPageable = {
  offset: number
  pageNumber: number
  pageSize: number
  paged: boolean
  sort: ApiSort
  unpaged: boolean
}

// A page of a paged list, as Spring returns it inside `data`: the items in `content`, `number` is the
// zero-based page index. The descriptors after the first five are only sometimes documented.
export type ApiPage<T> = {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
  empty?: boolean
  first?: boolean
  last?: boolean
  numberOfElements?: number
  pageable?: ApiPageable
  sort?: ApiSort
}
