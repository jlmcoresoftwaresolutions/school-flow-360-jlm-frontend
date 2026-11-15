import type { Assignment, RoleCode } from "../users/users"

// Who the signed-in user is: the login returns it (as `context`) and GET /api/me reads it again.
// `roles` are the effective ones, already joined across the active assignments; `admin` says whether
// one of them is ADMIN (an Admin can do everything a Secretaria can).
export type UserContext = {
  admin: boolean
  assignments: Assignment[]
  email: string
  fullName: string | null
  roles: RoleCode[]
  userId: number
}

// One of the signed-in user's open sessions. `userAgent` is the browser's own description, as sent
// when the session started; `current` marks the session making the request.
export type SessionItem = {
  createdAt: string
  current: boolean
  expiresAt: string
  id: string
  userAgent: string | null
}
