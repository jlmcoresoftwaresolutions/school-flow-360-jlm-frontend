// The stable codes the backend puts on errors, so a screen never has to read the message (section 5
// of the backend's docs/P02_CONTRATO.md says when each comes). The *_NOT_FOUND codes also mean "out of
// your scope": the backend never tells the two apart. Some errors come without a code.
export type ApiErrorCode =
  | "ACCESS_DENIED"
  | "ASSIGNMENT_NOT_FOUND"
  | "CHALLENGE_INVALID"
  | "CURRENT_PASSWORD_INVALID"
  | "DATA_CONFLICT"
  | "IMPACTS_NOT_CONFIRMED"
  | "INVALID_REQUEST"
  | "INVITATION_ALREADY_USED"
  | "INVITATION_EXPIRED"
  | "INVITATION_INVALID"
  | "INVITATION_NOT_FOUND"
  | "INVITATION_PENDING"
  | "INVITATION_STATE_INVALID"
  | "LAST_ADMIN"
  | "NAME_REQUIRED"
  | "NO_ACTIVE_ASSIGNMENT"
  | "ORGANIZATION_REQUIRED"
  | "OWN_ACCOUNT"
  | "PASSWORD_CHANGE_REQUIRED"
  | "PASSWORD_INVALID"
  | "PASSWORD_UNCHANGED"
  | "ROLE_NOT_GRANTABLE"
  | "SCOPE_DENIED"
  | "SESSION_LIMIT_REACHED"
  | "SESSION_NOT_FOUND"
  | "TENANT_NOT_FOUND"
  | "TERMS_NOT_ACCEPTED"
  | "TERMS_VERSION_INVALID"
  | "UNIT_INACTIVE"
  | "UNIT_NAME_DUPLICATE"
  | "UNIT_NOT_FOUND"
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
