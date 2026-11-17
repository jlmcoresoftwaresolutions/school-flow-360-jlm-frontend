import type { AccessMatrix, ApiResponse, ProfileUpdateRequest, SessionItem, UserContext, UserView } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The signed-in user's own data and sessions; any authenticated user may call these. Errors: 401
// without a valid session.

// USED by the routes (the AppShell's loader). GET /api/me: who the signed-in user is - name, effective
// roles and active assignments - read again on every visit, since roles can change after the login.
export const getMe = async (config?: RequestConfig): Promise<UserContext> => {
  const response = await httpClient.get<ApiResponse<UserContext>>("/api/me", config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/me/sessions: the user's own open sessions, the current one marked.
export const listMySessions = async (config?: RequestConfig): Promise<SessionItem[]> => {
  const response = await httpClient.get<ApiResponse<SessionItem[]>>("/api/me/sessions", config)

  return unwrapApiResponse(response)
}

// NOT USED YET. DELETE /api/me/sessions/{id}: ends one of the user's own sessions. Another person's
// session is a 404 SESSION_NOT_FOUND.
export const endMySession = async (sessionId: string, config?: RequestConfig): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/api/me/sessions/${encodeURIComponent(sessionId)}`, config)
}

// NOT USED YET. GET /api/me/capabilities: "Meu acesso" - the matrix rows of the user's own roles only
// (the units each role applies to come from GET /api/me).
export const getMyCapabilities = async (config?: RequestConfig): Promise<AccessMatrix> => {
  const response = await httpClient.get<ApiResponse<AccessMatrix>>("/api/me/capabilities", config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/me/profile: the user edits their own name and phone, with the `version` from
// GET /api/me. Errors: 428 VERSION_REQUIRED, 409 VERSION_CONFLICT, 422 NAME_REQUIRED, 400 INVALID_REQUEST.
export const updateMyProfile = async (request: ProfileUpdateRequest, config?: RequestConfig): Promise<UserView> => {
  const response = await httpClient.put<ApiResponse<UserView>>("/api/me/profile", request, config)

  return unwrapApiResponse(response)
}
