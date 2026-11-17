import type { Assignment, RoleCode } from "../users/users"

// Who the signed-in user is: the login returns it (as `context`) and GET /api/me reads it again.
// `roles` are the effective ones, already joined across the active assignments; `admin` says whether
// one of them is ADMIN (an Admin can do everything a Secretaria can). An assignment in a unit that was
// inactivated is still listed but grants nothing. `phone` and `version` are for editing the own
// profile (PUT /api/me/profile); a login answered before them may lack both.
export type UserContext = {
  admin: boolean
  assignments: Assignment[]
  email: string
  fullName: string | null
  roles: RoleCode[]
  userId: number
  phone?: string | null
  version?: number
}

// Body of PUT /api/me/profile and PUT /api/users/{id}/profile: a replacement of the only two fields a
// profile edits, with the version read last. The name is required (up to 150); an empty phone removes
// it (up to 30).
export type ProfileUpdateRequest = {
  fullName: string
  phone: string
  version: number
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
