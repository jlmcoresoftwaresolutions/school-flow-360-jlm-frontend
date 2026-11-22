import type {
  ApiResponse,
  Guardian,
  GuardianCreateRequest,
  GuardianPage,
  GuardianProfile,
  GuardianSearchParams,
  GuardianStateChange,
  GuardianUpdateRequest,
  PersonHistoryPage,
  StudentGuardianLink,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P03 guardians (backend docs/P03_CONTRATO.md, slices 2 to 4). Admin and Secretaria only (a
// Secretaria: its units); a guardian out of reach answers 404 PERSON_NOT_FOUND. Registering a guardian
// never creates an access, an invitation or a link. Editing needs the `version` (428 VERSION_REQUIRED,
// 409 VERSION_CONFLICT).

type GuardianStateAction = "activate" | "inactivate" | "reactivate"

// USED by the guardians page. GET /api/guardians: the guardians in the operator's reach, paged; the
// active students counted are only the ones the operator may see.
export const listGuardians = async (params?: GuardianSearchParams, config?: RequestConfig): Promise<GuardianPage> => {
  const response = await httpClient.get<ApiResponse<GuardianPage>>("/api/guardians", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/guardians/{id}.
export const getGuardian = async (guardianId: number, config?: RequestConfig): Promise<Guardian> => {
  const response = await httpClient.get<ApiResponse<Guardian>>(`/api/guardians/${guardianId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/guardians: registers a guardian in one of the operator's units (active unless
// `activate` is false). Errors: 409 DOCUMENT_IN_USE, DUPLICATE_REVIEW_REQUIRED (the same contact e-mail
// as someone else); 422 NAME_REQUIRED, EMAIL_INVALID, DOCUMENT_TYPE_INVALID, DOCUMENT_INCOMPLETE.
export const createGuardian = async (request: GuardianCreateRequest, config?: RequestConfig): Promise<Guardian> => {
  const response = await httpClient.post<ApiResponse<Guardian>>("/api/guardians", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/guardians/{id}: replaces the editable data.
export const updateGuardian = async (
  guardianId: number,
  request: GuardianUpdateRequest,
  config?: RequestConfig,
): Promise<Guardian> => {
  const response = await httpClient.put<ApiResponse<Guardian>>(`/api/guardians/${guardianId}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/guardians/{id}/activate, /inactivate, /reactivate. Inactivating the only
// guardian of an active student: 422 LAST_GUARDIAN.
export const changeGuardianState = async (
  guardianId: number,
  action: GuardianStateAction,
  request: GuardianStateChange,
  config?: RequestConfig,
): Promise<Guardian> => {
  const response = await httpClient.post<ApiResponse<Guardian>>(
    `/api/guardians/${guardianId}/${action}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/guardians/{id}/profile: the guardian with its links to the students in reach.
export const getGuardianProfile = async (guardianId: number, config?: RequestConfig): Promise<GuardianProfile> => {
  const response = await httpClient.get<ApiResponse<GuardianProfile>>(`/api/guardians/${guardianId}/profile`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/guardians/{id}/history: the registration history, paged.
export const getGuardianHistory = async (
  guardianId: number,
  params?: { page?: number; size?: number },
  config?: RequestConfig,
): Promise<PersonHistoryPage> => {
  const response = await httpClient.get<ApiResponse<PersonHistoryPage>>(`/api/guardians/${guardianId}/history`, {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/guardians/{id}/students: the guardian's links (active and ended), only with the
// students in the operator's reach.
export const listGuardianStudents = async (
  guardianId: number,
  config?: RequestConfig,
): Promise<StudentGuardianLink[]> => {
  const response = await httpClient.get<ApiResponse<StudentGuardianLink[]>>(
    `/api/guardians/${guardianId}/students`,
    config,
  )

  return unwrapApiResponse(response)
}
