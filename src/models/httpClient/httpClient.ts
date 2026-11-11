// The stable codes the backend puts on some errors, so a screen never has to read the message:
// VERSION_CONFLICT (the record changed since it was read), UNIT_NAME_DUPLICATE (another unit of the
// tenant has that name), IMPACTS_NOT_CONFIRMED (a unit with users deactivated without confirmImpacts),
// ORGANIZATION_REQUIRED (the tenant has no organization for the unit) and DATA_CONFLICT (another
// integrity conflict). Other errors come without a code.
export type ApiErrorCode =
  | "DATA_CONFLICT"
  | "IMPACTS_NOT_CONFIRMED"
  | "ORGANIZATION_REQUIRED"
  | "UNIT_NAME_DUPLICATE"
  | "VERSION_CONFLICT"

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
