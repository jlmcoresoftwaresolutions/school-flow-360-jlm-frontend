// The envelope every SchoolFlow360 backend response comes in, success or error: the payload is in
// `data` (null on an error), `status` is "Success"/"Error" and `message` is the backend's own text.
export type ApiResponse<T> = {
  data: T | null
  message: string
  status: string
  tenantId: string
}
