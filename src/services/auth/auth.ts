import type {
  ApiResponse,
  AuthData,
  LoginRequest,
  PasswordRecoveryConfirmationRequest,
  PasswordRecoveryRequest,
  PasswordRecoveryTokenValidationRequest,
  RefreshTokenRequest,
  RegisterUserPayload,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// USED by the login page. POST /api/auth/login. Signs in with e-mail and password. Wrong credentials come back as a 401, which axios rejects, so
// the caller tells them apart from other failures by the error's response status.
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

// NOT USED YET. POST /api/auth/refresh: trades the refresh token for new tokens when the access token
// expires (a 401). The app does not renew sessions yet: an expired one sends the user to the login. As
// with login, the new access token is `token`.
export const refreshSession = async (request: RefreshTokenRequest, config?: RequestConfig): Promise<AuthData> => {
  const response = await httpClient.post<ApiResponse<AuthData>>("/api/auth/refresh", request, config)
  const authData = response.data.data

  if (!authData?.token) throw new Error("The refresh response has no token.")

  return authData
}

// NOT USED, AND NOT MEANT TO BE (there is no self-signup: accounts will come from invitations). POST
// /api/auth/register: creates an account tied to a school unit. The backend answers 201, though the
// Swagger documents 200. See RegisterUserPayload about the `actor` it documents.
export const registerUser = async (payload: RegisterUserPayload, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/register", payload, config)
}
