import type { InvitationAssignment } from "../invitations/invitations"
import type { SessionItem, UserContext } from "../me/me"

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
  sessions: SessionLimitSession[]
}

// One of the sessions the login's 409 lists. Less than GET /api/me/sessions says: neither its expiry
// nor which one is current (none is: the person isn't signed in yet).
export type SessionLimitSession = Pick<SessionItem, "createdAt" | "id" | "userAgent">

// Body of POST /api/auth/session-limit/replace: ends that session (one of the person's own) and signs in.
export type SessionReplaceRequest = {
  challengeToken: string
  sessionId: string
}

// Body of POST /api/auth/invitations/validate, with the token from the invitation link.
export type InvitationTokenRequest = {
  token: string
}

// A role an invitation grants, with the unit's name. `unitId` and `unitName` are null for an Admin
// (the whole institution); `unitName` is also null when the unit can't be found.
export type InvitationValidationAssignment = InvitationAssignment & {
  unitName: string | null
}

// A valid invitation link: the invited e-mail (masked), until when the link works, the name and phone
// the invitation already carries (to prefill the screen), whether the screen must ask for the name
// (the invitation came without one), the institution (the tenant's organization: its institutional
// and display names, null when none is registered), what the account will be able to do and where,
// and the Terms of Use version in force (to show, and to send back when accepting). Any invalid link
// (unknown, expired, cancelled, used) is a 404 INVITATION_INVALID instead.
export type InvitationValidation = {
  assignments: InvitationValidationAssignment[]
  email: string
  expiresAt: string
  fullName: string | null
  institutionName: string | null
  nameRequired: boolean
  organizationName: string | null
  phone: string | null
  termsVersion: string
  valid: boolean
}

// Body of POST /api/auth/invitations/accept: the account is created with this password (12 to 128).
// `fullName` (up to 150) and `phone` (up to 30) fill or replace the invitation's own; every account
// has a name, so without one in the invitation `fullName` is required (422 NAME_REQUIRED). The Terms of
// Use must be accepted: `termsAccepted` true and `termsVersion` the one validate returned (otherwise
// 422 TERMS_NOT_ACCEPTED or TERMS_VERSION_INVALID, and the invitation stays usable).
export type AcceptInvitationRequest = {
  password: string
  termsAccepted: boolean
  termsVersion: string
  token: string
  fullName?: string
  phone?: string
}
