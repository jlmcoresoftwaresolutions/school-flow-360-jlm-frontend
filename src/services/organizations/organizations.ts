import type {
  ApiOrganization,
  ApiResponse,
  CreateOrganizationRequest,
  OrganizationEditable,
  OrganizationSummary,
  UpdateCurrentOrganizationRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The organization endpoints, one function per route, in the backend's own shapes (the names and
// types of models/organizations). services/organization is the page-facing layer: it answers in the
// frontend's shapes for Minha Unidade, and its calls are being moved onto these one at a time. All of
// them are ADMIN only. Prefer the "current" ones to the by-id ones: the backend itself says so.

// NOT USED YET. GET /api/organizations/current/summary: the read-only view of the signed-in user's
// organization with its units (404 when the tenant has no organization yet). The overview could be
// fed by it; for now it reads the mocked organization.
export const getCurrentOrganizationSummary = async (config?: RequestConfig): Promise<OrganizationSummary> => {
  const response = await httpClient.get<ApiResponse<OrganizationSummary>>("/api/organizations/current/summary", config)

  return unwrapApiResponse(response)
}

// USED: Minha Unidade's overview (through services/organization). GET
// /api/organizations/current/editable: the editable fields plus the `version` to send back when saving.
// 404 ("Organization not found.") when the tenant has no organization yet: the backend asks for an
// empty state offering to register it (createOrganization), not an error.
export const getCurrentOrganizationEditable = async (config?: RequestConfig): Promise<OrganizationEditable> => {
  const response = await httpClient.get<ApiResponse<OrganizationEditable>>(
    "/api/organizations/current/editable",
    config,
  )

  return unwrapApiResponse(response)
}

// USED: Minha Unidade's overview (through services/organization), for the institutional and display
// names (orgInstName, orgName), the contacts, the address and the internal notes. PUT
// /api/organizations/current: saves the organization's registration and address and answers the new
// state with the new `version`. It REPLACES every editable field with what the body brings: a field
// left out is saved as null, so always send all of them. 400 for an invalid,
// unknown or non-editable field (or a missing `version`), 409 when the `version` is stale (reload and
// let the user redo the change).
export const updateCurrentOrganization = async (
  request: UpdateCurrentOrganizationRequest,
  config?: RequestConfig,
): Promise<OrganizationEditable> => {
  const response = await httpClient.put<ApiResponse<OrganizationEditable>>(
    "/api/organizations/current",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/organizations: the tenant's organizations (in practice one). The backend
// prefers /current/summary or /current/editable.
export const listOrganizations = async (config?: RequestConfig): Promise<ApiOrganization[]> => {
  const response = await httpClient.get<ApiResponse<ApiOrganization[]>>("/api/organizations", config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/organizations: registers the tenant's organization (201), for when the
// "current" endpoints answer 404, and answers it in the editable shape (with `version`). Each tenant
// takes at most one: a second is refused with 409. 400 for an invalid or unknown field, or an orgOpType
// or orgStatus outside the enum. Nothing in the app registers an organization today.
export const createOrganization = async (
  request: CreateOrganizationRequest,
  config?: RequestConfig,
): Promise<OrganizationEditable> => {
  const response = await httpClient.post<ApiResponse<OrganizationEditable>>("/api/organizations", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/organizations/{id}: the full entity (404 when not found). Prefer
// getCurrentOrganizationEditable.
export const getOrganizationById = async (id: number, config?: RequestConfig): Promise<ApiOrganization> => {
  const response = await httpClient.get<ApiResponse<ApiOrganization>>(`/api/organizations/${id}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/organizations/{id}: the same contract as updateCurrentOrganization, by id.
// Prefer updateCurrentOrganization. Also 404 when not found.
export const updateOrganizationById = async (
  id: number,
  request: UpdateCurrentOrganizationRequest,
  config?: RequestConfig,
): Promise<OrganizationEditable> => {
  const response = await httpClient.put<ApiResponse<OrganizationEditable>>(`/api/organizations/${id}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET, AND NOT FOR A SCREEN. DELETE /api/organizations/{id}: removes the organization. The
// backend calls it destructive and asks that it is not offered in everyday screens.
export const deleteOrganizationById = async (id: number, config?: RequestConfig): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/api/organizations/${id}`, config)
}
