import type { ApiResponse, AuthData, LoginRequest } from "@/models"

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
