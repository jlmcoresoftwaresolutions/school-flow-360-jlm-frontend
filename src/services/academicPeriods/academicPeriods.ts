import type {
  AcademicPeriod,
  AcademicPeriodClose,
  AcademicPeriodImpact,
  AcademicPeriodPage,
  AcademicPeriodSearchParams,
  AcademicPeriodWrite,
  ApiResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P04 school periods (backend docs/P04_CONTRATO.md, slice 1; period-controller). Errors common to
// the academic area: 404 ACADEMIC_NOT_FOUND (missing or out of scope), 403 ACCESS_DENIED/SCOPE_DENIED,
// 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.

// NOT USED YET. GET /api/academic/periods: the periods with at least one unit in the caller's scope.
export const listAcademicPeriods = async (
  params?: AcademicPeriodSearchParams,
  config?: RequestConfig,
): Promise<AcademicPeriodPage> => {
  const response = await httpClient.get<ApiResponse<AcademicPeriodPage>>("/api/academic/periods", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/periods: creates the period as CONFIGURED. Errors: 409
// ACADEMIC_DUPLICATE_CODE (name in the year), ACADEMIC_PERIOD_OVERLAP; 422 ACADEMIC_INVALID_RANGE; 403 a
// unit out of scope.
export const createAcademicPeriod = async (
  request: AcademicPeriodWrite,
  config?: RequestConfig,
): Promise<AcademicPeriod> => {
  const response = await httpClient.post<ApiResponse<AcademicPeriod>>("/api/academic/periods", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/periods/{id}.
export const getAcademicPeriod = async (periodId: number, config?: RequestConfig): Promise<AcademicPeriod> => {
  const response = await httpClient.get<ApiResponse<AcademicPeriod>>(`/api/academic/periods/${periodId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/periods/{id}: the whole edition, with `version`. A closed period
// doesn't change (422); with active offers, a unit that has one can't leave nor the kind change (409
// ACADEMIC_DEPENDENCY_ACTIVE).
export const updateAcademicPeriod = async (
  periodId: number,
  request: AcademicPeriodWrite,
  config?: RequestConfig,
): Promise<AcademicPeriod> => {
  const response = await httpClient.put<ApiResponse<AcademicPeriod>>(
    `/api/academic/periods/${periodId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/periods/{id}/impact: what would block closing it.
export const getAcademicPeriodImpact = async (
  periodId: number,
  config?: RequestConfig,
): Promise<AcademicPeriodImpact> => {
  const response = await httpClient.get<ApiResponse<AcademicPeriodImpact>>(
    `/api/academic/periods/${periodId}/impact`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/periods/{id}/activate: only from CONFIGURED, with an active unit.
export const activateAcademicPeriod = async (
  periodId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicPeriod> => {
  const response = await httpClient.post<ApiResponse<AcademicPeriod>>(
    `/api/academic/periods/${periodId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/periods/{id}/close: only from ACTIVE, with a reason; the dependencies
// are checked again on the confirmation (409 ACADEMIC_DEPENDENCY_ACTIVE).
export const closeAcademicPeriod = async (
  periodId: number,
  request: AcademicPeriodClose,
  config?: RequestConfig,
): Promise<AcademicPeriod> => {
  const response = await httpClient.post<ApiResponse<AcademicPeriod>>(
    `/api/academic/periods/${periodId}/close`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
