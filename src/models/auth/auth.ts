import type { UserActor } from "../userAccount/userAccount"

export type PasswordRecoveryRequest = {
  email: string
}

// `token` is the one from the reset link e-mailed by /password-recovery/request.
export type PasswordRecoveryTokenValidationRequest = {
  token: string
}

export type PasswordRecoveryConfirmationRequest = {
  newPassword: string
  token: string
}

// Body of POST /api/auth/refresh.
export type RefreshTokenRequest = {
  refreshToken: string
}

// What POST /api/auth/register creates: an account tied to a school unit.
export type RegisterUserRequest = {
  email: string
  password: string
  schoolUnitId: number
}

// The body POST /api/auth/register documents: the request plus an `actor` (a whole User). The actor
// is most likely the authenticated principal that the Swagger shows by mistake (the backend should
// take it from the token); this is unconfirmed, so it is optional here and nothing should send it
// until the backend team says so.
export type RegisterUserPayload = {
  request: RegisterUserRequest
  actor?: UserActor
}

export type LoginRequest = {
  email: string
  password: string
}

// What /api/auth/login (and /api/auth/refresh) return. `token` is the access token to send as
// `Authorization: Bearer`; `accessToken` is the one the refresh endpoint hands back, so it is
// optional here. `expiresAt` is an ISO date-time.
export type AuthData = {
  expiresAt: string
  refreshToken: string
  token: string
  accessToken?: string | null
}
