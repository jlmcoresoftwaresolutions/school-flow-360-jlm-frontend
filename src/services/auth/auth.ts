import type {
  ApiResponse,
  AuthData,
  LoginRequest,
  PasswordRecoveryConfirmationRequest,
  PasswordRecoveryRequest,
  PasswordRecoveryTokenValidationRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// Signs in with e-mail and password. Wrong credentials come back as a 401, which axios rejects, so
// the caller tells them apart from other failures by the error's response status.
export const login = async (credentials: LoginRequest, config?: RequestConfig): Promise<AuthData> => {
  const response = await httpClient.post<ApiResponse<AuthData>>("/api/auth/login", credentials, config)
  const authData = response.data.data

  if (!authData?.token) throw new Error("The login response has no token.")

  return authData
}

// Asks the backend to e-mail a password reset link. The backend answers the same way (202, a generic
// message) whether or not the address has an account, so nothing about the account is learned here;
// only a failure to reach it (network, 5xx) rejects.
export const requestPasswordRecovery = async (
  request: PasswordRecoveryRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/password-recovery/request", request, config)
}

// Whether a reset link's token can still be used (it expires and works only once). Unlike every other
// endpoint, this one answers with a bare boolean instead of the ApiResponse envelope.
export const validatePasswordRecoveryToken = async (
  request: PasswordRecoveryTokenValidationRequest,
  config?: RequestConfig,
): Promise<boolean> => {
  const response = await httpClient.post<boolean>("/api/auth/password-recovery/validate", request, config)

  return response.data === true
}

// Sets the new password and uses the token up. An invalid or expired token, or a password outside the
// 12-128 character policy, comes back as a 400.
export const confirmPasswordRecovery = async (
  request: PasswordRecoveryConfirmationRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/auth/password-recovery/confirm", request, config)
}
