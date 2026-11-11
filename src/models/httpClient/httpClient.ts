// The envelope every SchoolFlow360 backend response comes in, success or error: the payload is in
// `data` (null on an error), `status` is "Success"/"Error" and `message` is the backend's own text.
// `correlationId` identifies the request in the backend's logs, for support.
export type ApiResponse<T> = {
  data: T | null
  message: string
  status: string
  tenantId: string
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
