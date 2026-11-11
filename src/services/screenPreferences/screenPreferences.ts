import type { ApiResponse, ScreenPreference, ScreenPreferenceInput, ScreenPreferenceUpdate } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// LEGACY (the backend tags these "legado"): the old branding endpoints. The current ones are the
// draft/publish flow in services/branding; nothing here is used, and nothing should start to be. All of
// them are ADMIN only (they answer 403 otherwise, and 401 without a token).

// NOT USED YET, AND LEGACY. POST /api/screen-preferences: creates a preference (201). displayName is
// required (max 100) and colors are #RRGGBB (400 otherwise); an organization, logo or published data
// sent is ignored.
export const createScreenPreference = async (
  input: ScreenPreferenceInput,
  config?: RequestConfig,
): Promise<ScreenPreference> => {
  const response = await httpClient.post<ApiResponse<ScreenPreference>>("/api/screen-preferences", input, config)

  return unwrapApiResponse(response)
}

// NOT USED YET, AND LEGACY. GET /api/screen-preferences/{id}: a preference, without its logo or
// published data (404 when not found).
export const getScreenPreference = async (id: number, config?: RequestConfig): Promise<ScreenPreference> => {
  const response = await httpClient.get<ApiResponse<ScreenPreference>>(`/api/screen-preferences/${id}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET, AND LEGACY. GET /api/screen-preferences/organization/{orgId}: the preference tied to an
// organization (404 when there is none).
export const getScreenPreferenceByOrganization = async (
  orgId: number,
  config?: RequestConfig,
): Promise<ScreenPreference> => {
  const response = await httpClient.get<ApiResponse<ScreenPreference>>(
    `/api/screen-preferences/organization/${orgId}`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET, AND LEGACY. PUT /api/screen-preferences/{id}: updates a preference. It needs the
// `version` (428 when missing, 409 when stale, 400 for an invalid field, 404 when not found); its logo,
// organization and published data are kept and cannot be changed here.
export const updateScreenPreference = async (
  id: number,
  update: ScreenPreferenceUpdate,
  config?: RequestConfig,
): Promise<ScreenPreference> => {
  const response = await httpClient.put<ApiResponse<ScreenPreference>>(`/api/screen-preferences/${id}`, update, config)

  return unwrapApiResponse(response)
}

// NOT USED YET, AND LEGACY. DELETE /api/screen-preferences/{id}: removes the row (404 when not found).
// A logo already uploaded to storage is NOT deleted by this.
export const deleteScreenPreference = async (id: number, config?: RequestConfig): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/api/screen-preferences/${id}`, config)
}
