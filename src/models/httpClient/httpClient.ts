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

// A page of a paged list, as Spring returns it inside `data`: the items in `content`, `number` is the
// zero-based page index.
export type ApiPage<T> = {
  content: T[]
  number: number
  size: number
  totalElements: number
  totalPages: number
}
