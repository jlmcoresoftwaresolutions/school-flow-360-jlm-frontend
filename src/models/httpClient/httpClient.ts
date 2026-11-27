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
  | "ACCEPTANCE_CONFIRMATION_REQUIRED"
  | "ACCEPTANCE_LINK_INVALID"
  | "ACCEPTANCE_NOT_PENDING"
  | "ACCESS_DENIED"
  | "ADMIN_CANNOT_BE_ANONYMIZED"
  | "ASSIGNMENT_NOT_FOUND"
  | "BIRTH_DATE_FUTURE"
  | "BIRTH_DATE_REQUIRED"
  | "BRANDING_NOT_PUBLISHED"
  | "CANDIDATE_NOT_IN_REVIEW"
  | "CAPACITY_EXCEPTION_CEILING"
  | "CAPACITY_EXCEPTION_DESTINATION_MISSING"
  | "CAPACITY_EXCEPTION_DISABLED"
  | "CAPACITY_EXCEPTION_EXISTS"
  | "CAPACITY_EXCEPTION_NOT_APPLICABLE"
  | "CAPACITY_EXCEPTION_NOT_FOUND"
  | "CAPACITY_EXCEPTION_NOT_NEEDED"
  | "CAPACITY_EXCEPTION_NOT_PUBLISHED"
  | "CHALLENGE_INVALID"
  | "CONFIRMATION_INTENT_REUSED"
  | "CONSENT_REQUIRED"
  | "CONTRACT_FIELD_UNKNOWN"
  | "CONTRACT_MODEL_ROLES_MISSING"
  | "CONTRACT_NOT_FOUND"
  | "CONTRACT_NOT_GENERATED"
  | "CONTRACT_NOT_READY"
  | "CONTRACT_OUTDATED"
  | "CONTRACT_TEMPLATE_NOT_APPROVED"
  | "CONTRACT_TEMPLATE_NOT_DRAFT"
  | "CONTRACT_VERSION_CHANGED"
  | "CURRENT_PASSWORD_INVALID"
  | "DATA_CONFLICT"
  | "DATES_INVALID"
  | "DOCUMENT_ARCHIVED"
  | "DOCUMENT_INCOMPLETE"
  | "DOCUMENT_INVALID"
  | "DOCUMENT_IN_USE"
  | "DOCUMENT_POLICY_DUPLICATE"
  | "DOCUMENT_POLICY_INVALID"
  | "DOCUMENT_POLICY_NOT_FOUND"
  | "DOCUMENT_TYPE_INVALID"
  | "DUPLICATE_REVIEW_NOT_FOUND"
  | "DUPLICATE_REVIEW_REQUIRED"
  | "DUPLICATE_REVIEW_RESOLVED"
  | "DUPLICATE_REVIEW_SIGNALS_MISMATCH"
  | "DUPLICATE_REVIEW_STALE"
  | "EMAIL_INVALID"
  | "END_BEFORE_START"
  | "ENROLLMENT_ALREADY_CONFIRMED"
  | "ENROLLMENT_CONFLICT"
  | "ENROLLMENT_CONTEXT_INVALID"
  | "ENROLLMENT_DOCUMENT_INVALID"
  | "ENROLLMENT_NOT_FOUND"
  | "ENROLLMENT_NOT_IN_PREPARATION"
  | "ENROLLMENT_NOT_READY"
  | "ENROLLMENT_PARTY_INVALID"
  | "ENROLLMENT_PERIOD_CONFLICT"
  | "ENROLLMENT_START_DATE_INVALID"
  | "ENROLLMENT_STUDENT_NOT_FOUND"
  | "EXCEPTION_ALREADY_DECIDED"
  | "EXCEPTION_DEADLINE_INVALID"
  | "EXCEPTION_NOT_ALLOWED"
  | "EXCEPTION_NOT_NEEDED"
  | "EXCEPTION_OPEN"
  | "EXCEPTION_REQUIREMENT_INVALID"
  | "EXCEPTION_SAME_PERSON"
  | "EXPIRY_NOT_APPLICABLE"
  | "FILE_NOT_FOUND"
  | "FILE_REQUIRED"
  | "FILE_TOO_LARGE"
  | "FILE_TYPE_NOT_ALLOWED"
  | "GUARDIAN_ALREADY_LINKED"
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
  | "LEGAL_APPROVAL_REQUIRED"
  | "LIFECYCLE_CONFIRMATION_BLOCKED"
  | "LIFECYCLE_DESTINATION_INVALID"
  | "LIFECYCLE_EVENT_NOT_FOUND"
  | "LIFECYCLE_EVENT_NOT_PREPARED"
  | "LIFECYCLE_EVENT_OPEN"
  | "LIFECYCLE_INTENT_REUSED"
  | "LIFECYCLE_LOCK_NOT_RETURNABLE"
  | "LIFECYCLE_ORIGIN_NOT_ELIGIBLE"
  | "LIFECYCLE_REASON_INVALID"
  | "LINK_DUPLICATE"
  | "LINK_ENDED"
  | "LINK_NOT_FOUND"
  | "LINK_SELF"
  | "LOCK_POLICY_NOT_FOUND"
  | "MUST_BE_INACTIVE"
  | "NAME_REQUIRED"
  | "NICKNAME_INVALID"
  | "NICKNAME_IN_USE"
  | "NOTIFICATION_RESEND_LIMIT"
  | "NOTIFICATION_RESEND_TOO_SOON"
  | "NO_ACTIVE_ASSIGNMENT"
  | "NO_EFFECT_RULE_NOT_FOUND"
  | "ORGANIZATION_INACTIVE"
  | "ORGANIZATION_REQUIRED"
  | "OUTBOX_ITEM_NOT_FOUND"
  | "OUTBOX_NOT_RESENDABLE"
  | "OWN_ACCOUNT"
  | "PASSWORD_CHANGE_REQUIRED"
  | "PASSWORD_INVALID"
  | "PASSWORD_UNCHANGED"
  | "PERSON_ANONYMIZED"
  | "PERSON_NOT_FOUND"
  | "REASON_REQUIRED"
  | "RELATIONSHIP_INVALID"
  | "REQUEST_REF_REQUIRED"
  | "REQUIREMENT_DUPLICATE"
  | "REUSE_TOKEN_INVALID"
  | "ROLE_NOT_GRANTABLE"
  | "SCOPE_DENIED"
  | "SEARCH_RATE_LIMITED"
  | "SESSION_LIMIT_REACHED"
  | "SESSION_NOT_FOUND"
  | "SIGNER_INVALID"
  | "SIGNER_WITHOUT_EMAIL"
  | "STATE_INVALID"
  | "STORAGE_DISABLED"
  | "STRONG_IDENTIFIER_UNIQUE"
  | "STUDENT_INACTIVE"
  | "TEMPLATE_NOT_FOUND"
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
