import type { SessionItem, UserContext } from "../me/me"
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

// What /api/auth/login, /api/auth/refresh and /api/auth/session-limit/replace return. `token` is the
// access token to send as `Authorization: Bearer` (valid for 1 h; `accessToken` repeats it);
// `expiresAt`, its expiry as an ISO date-time. The refresh token lasts 7 days and changes on every
// refresh. The login also says who signed in (`context`); a refresh doesn't.
export type AuthData = {
  expiresAt: string
  refreshToken: string
  token: string
  accessToken?: string | null
  context?: UserContext | null
}

// The data of the login's 409 SESSION_LIMIT_REACHED: the right password, but 5 sessions already open.
// The person picks one of `sessions` to end; `challengeToken` (single use, valid for
// `challengeExpiresInSeconds`) proves the password was checked.
export type SessionLimitChallenge = {
  challengeExpiresInSeconds: number
  challengeToken: string
  sessions: SessionItem[]
}

// Body of POST /api/auth/session-limit/replace: ends that session (one of the person's own) and signs in.
export type SessionReplaceRequest = {
  challengeToken: string
  sessionId: string
}

// Body of POST /api/auth/invitations/validate, with the token from the invitation link.
export type InvitationTokenRequest = {
  token: string
}

// A valid invitation link: the invited e-mail (masked) and until when the link works. Any invalid link
// (unknown, expired, cancelled, used) is a 404 INVITATION_INVALID instead.
export type InvitationValidation = {
  email: string
  expiresAt: string
  valid: boolean
}

// Body of POST /api/auth/invitations/accept: the account is created with this password (12 to 128).
export type AcceptInvitationRequest = {
  password: string
  token: string
}
