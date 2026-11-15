import type {
  AcceptInvitationRequest,
  ApiResponse,
  AuthData,
  InvitationTokenRequest,
  InvitationValidation,
  LoginRequest,
  PasswordRecoveryConfirmationRequest,
  PasswordRecoveryRequest,
  PasswordRecoveryTokenValidationRequest,
  RefreshTokenRequest,
  RegisterUserPayload,
  SessionReplaceRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// USED by the login page. POST /api/auth/login. Signs in with e-mail and password, and says who signed
// in (`context`). Wrong credentials come back as a 401, which axios rejects, so the caller tells them
// apart from other failures by the error's response status. Also: 429 with Retry-After after repeated
// wrong passwords, and 409 SESSION_LIMIT_REACHED when 5 sessions are open, its data a
// SessionLimitChallenge (see replaceSessionAtLimit).
export const login = async (credentials: LoginRequest, config?: RequestConfig): Promise<AuthData> => {
  const response = await httpClient.post<ApiResponse<AuthData>>("/api/auth/login", credentials, config)
  const authData = response.data.data

  if (!authData?.token) throw new Error("The login response has no token.")

  return authData
}

// USED by the forgot-password page. POST /api/auth/password-recovery/request. Asks the backend to e-mail a password reset link. The backend answers the same way (202, a generic
// message) whether or not the address has an account, so nothing about the account is learned here;
// only a failure to reach it (network, 5xx) rejects.
export const requestPasswordRecovery = async (
  request: PasswordRecoveryRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/password-recovery/request", request, config)
}

// USED by the reset-password page. POST /api/auth/password-recovery/validate. Whether a reset link's token can still be used (it expires and works only once). Unlike every other
// endpoint, this one answers with a bare boolean instead of the ApiResponse envelope.
export const validatePasswordRecoveryToken = async (
  request: PasswordRecoveryTokenValidationRequest,
  config?: RequestConfig,
): Promise<boolean> => {
  const response = await httpClient.post<boolean>("/api/auth/password-recovery/validate", request, config)

  return response.data === true
}

// USED by the reset-password page. POST /api/auth/password-recovery/confirm. Sets the new password and uses the token up. An invalid or expired token, or a password outside the
// 12-128 character policy, comes back as a 400.
export const confirmPasswordRecovery = async (
  request: PasswordRecoveryConfirmationRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/password-recovery/confirm", request, config)
}

// USED by the sign-out route. POST /api/auth/logout. Tells the backend to end the session of this access token. It takes the token explicitly so the
// caller can clear the stored session first and still sign this request.
export const logout = async (token: string, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/logout", undefined, {
    ...config,
    headers: { Authorization: `Bearer ${token}` },
  })
}

// USED by the httpClient (renewSession). POST /api/auth/refresh: trades the refresh token for new
// tokens when the access token (1 h) expires; the refresh token itself changes on every call and lasts
// 7 days. No `context` comes back. An invalid, expired or revoked refresh token is a 401.
export const refreshSession = async (request: RefreshTokenRequest, config?: RequestConfig): Promise<AuthData> => {
  const response = await httpClient.post<ApiResponse<AuthData>>("/api/auth/refresh", request, config)
  const authData = response.data.data

  if (!authData?.token) throw new Error("The refresh response has no token.")

  return authData
}

// USED by the login page (SessionLimitDialog). POST /api/auth/session-limit/replace: after the login's 409 SESSION_LIMIT_REACHED,
// ends the chosen session (one of the person's own) and signs in, answering like the login. Errors: 401
// CHALLENGE_INVALID (used, expired or unknown challenge), 404 SESSION_NOT_FOUND (the challenge is not
// used up, so another session can be picked).
export const replaceSessionAtLimit = async (
  request: SessionReplaceRequest,
  config?: RequestConfig,
): Promise<AuthData> => {
  const response = await httpClient.post<ApiResponse<AuthData>>("/api/auth/session-limit/replace", request, config)
  const authData = response.data.data

  if (!authData?.token) throw new Error("The session replacement response has no token.")

  return authData
}

// USED by the accept-invitation page. POST /api/auth/invitations/validate: whether an invitation link can still be used, with
// the invited e-mail (masked) and its expiry. Pass the link's tenant as `tenantId`. Any unusable link -
// unknown, expired, cancelled, superseded or used - is the same 404 INVITATION_INVALID.
export const validateInvitation = async (
  request: InvitationTokenRequest,
  config?: RequestConfig,
): Promise<InvitationValidation> => {
  const response = await httpClient.post<ApiResponse<InvitationValidation>>(
    "/api/auth/invitations/validate",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the accept-invitation page. POST /api/auth/invitations/accept: creates the account with the person's own password
// (201); they then sign in normally. Pass the link's tenant as `tenantId`. Errors: 422 WEAK_PASSWORD
// (the invitation stays usable), 422 INVITATION_EXPIRED, 409 INVITATION_ALREADY_USED, 404
// INVITATION_INVALID, 409 USER_DUPLICATE, 422 UNIT_INACTIVE.
export const acceptInvitation = async (request: AcceptInvitationRequest, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/invitations/accept", request, config)
}

// NOT USED, AND NOT MEANT TO BE (there is no self-signup: accounts will come from invitations). POST
// /api/auth/register: creates an account tied to a school unit. The backend answers 201, though the
// Swagger documents 200. See RegisterUserPayload about the `actor` it documents.
export const registerUser = async (payload: RegisterUserPayload, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/register", payload, config)
}
