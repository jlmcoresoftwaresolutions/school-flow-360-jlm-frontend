import type { ApiResponse, OrganizationFileLink } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, toFileFormData, unwrapApiResponse } from "../httpClient"

// The one document the backend keeps per organization (PDF, DOCX, PNG or JPG). ADMIN only. None of these
// is used yet: no screen attaches a file to the organization.

// NOT USED YET. GET /api/organizations/{id}/file: a temporary download link (5 minutes by default) -
// there is no direct download through the API, and the link must not be stored. 404 when the
// organization has no file.
export const getOrganizationFileLink = async (id: number, config?: RequestConfig): Promise<OrganizationFileLink> => {
  const response = await httpClient.get<ApiResponse<OrganizationFileLink>>(`/api/organizations/${id}/file`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/organizations/{id}/file: stores the file (201, no payload), replacing the
// previous one. PDF, DOCX, PNG or JPG/JPEG up to 10 MB, and the declared type must match the extension:
// 413 when larger, 415 for a type or extension not allowed, 400 for a missing or empty file.
export const uploadOrganizationFile = async (id: number, file: File, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>(`/api/organizations/${id}/file`, toFileFormData(file), config)
}

// NOT USED YET. DELETE /api/organizations/{id}/file: deletes the file from storage and clears the
// reference (404 when there is none).
export const deleteOrganizationFile = async (id: number, config?: RequestConfig): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/api/organizations/${id}/file`, config)
}
