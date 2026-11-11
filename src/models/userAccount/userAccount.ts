import type { ApiSchoolUnit } from "../schoolUnits/schoolUnits"

// The only roles the backend has so far.
export type UserRole = "ADMIN" | "USER"

export type GrantedAuthority = {
  authority: string
}

// The backend's user, as the Swagger documents it. It exposes Spring Security internals and even the
// `password` field, which is a sign of an entity leaking into the API: never display or store one.
export type User = {
  accountNonExpired: boolean
  accountNonLocked: boolean
  authorities: GrantedAuthority[]
  credentialsNonExpired: boolean
  enabled: boolean
  id: number
  locked: boolean
  password: string
  role: UserRole
  schoolUnit: ApiSchoolUnit | null
  username: string
  email?: string
}

// The `actor` of the account endpoints' bodies: nothing in the Swagger says which User fields are
// needed, so every one is optional.
export type UserActor = Partial<User>

// What PUT /api/admin/users/{userId}/unit changes: the unit the user is tied to.
export type UserSchoolUnitRequest = {
  schoolUnitId: number
}

// What PUT /api/admin/users/{userId}/status changes: whether the account is on and whether it is locked.
export type UserStatusRequest = {
  enabled: boolean
  locked: boolean
}

// The bodies of the two admin endpoints: the change plus the `actor` the Swagger documents (see
// RegisterUserPayload in the auth models for why it is optional and unconfirmed).
export type AssignUserSchoolUnitPayload = {
  request: UserSchoolUnitRequest
  actor?: UserActor
}

export type UpdateUserStatusPayload = {
  request: UserStatusRequest
  actor?: UserActor
}
