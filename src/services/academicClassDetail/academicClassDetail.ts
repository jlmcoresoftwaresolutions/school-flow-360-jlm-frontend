import type {
  AcademicCapacityException,
  AcademicCapacityExceptionCreate,
  AcademicCapacityReview,
  AcademicClassCapacity,
  AcademicClassEvent,
  AcademicClassGeneral,
  AcademicClassHistoryParams,
  AcademicClassOverview,
  AcademicClassStudentParams,
  AcademicClassStudents,
  AcademicOverview,
  AcademicOverviewParams,
  ApiItemsPage,
  ApiResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P04 class detail, capacity, history and the academic overview (backend docs/P04_CONTRATO.md, slice
// 3; class-detail-controller). Each tab is its own call. Common errors: 404 ACADEMIC_NOT_FOUND, 403
// ACCESS_DENIED/SCOPE_DENIED. The enrollment doesn't exist yet: the occupation and the students answer
// UNAVAILABLE, never zero.

// NOT USED YET. GET /api/academic/overview: the academic overview of the caller's scope, narrowed by unit
// and period (a unit out of scope: 404).
export const getAcademicOverview = async (
  params?: AcademicOverviewParams,
  config?: RequestConfig,
): Promise<AcademicOverview> => {
  const response = await httpClient.get<ApiResponse<AcademicOverview>>("/api/academic/overview", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/classes/{id}/overview: the class and the tabs the caller may open.
export const getAcademicClassOverview = async (
  classId: number,
  config?: RequestConfig,
): Promise<AcademicClassOverview> => {
  const response = await httpClient.get<ApiResponse<AcademicClassOverview>>(
    `/api/academic/classes/${classId}/overview`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/classes/{id}/general: the class with the names it refers to.
export const getAcademicClassGeneral = async (
  classId: number,
  config?: RequestConfig,
): Promise<AcademicClassGeneral> => {
  const response = await httpClient.get<ApiResponse<AcademicClassGeneral>>(
    `/api/academic/classes/${classId}/general`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/classes/{id}/students: the enrollment's list (UNAVAILABLE is not an empty
// class). Nothing adds or removes a student from here.
export const listAcademicClassStudents = async (
  classId: number,
  params?: AcademicClassStudentParams,
  config?: RequestConfig,
): Promise<AcademicClassStudents> => {
  const response = await httpClient.get<ApiResponse<AcademicClassStudents>>(
    `/api/academic/classes/${classId}/students`,
    { ...config, params },
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/classes/{id}/capacity: the unit's management only (Professor: 403).
export const getAcademicClassCapacity = async (
  classId: number,
  config?: RequestConfig,
): Promise<AcademicClassCapacity> => {
  const response = await httpClient.get<ApiResponse<AcademicClassCapacity>>(
    `/api/academic/classes/${classId}/capacity`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/classes/{id}/capacity-review: raising the limit needs no count; lowering
// it counts the occupation again (503 ACADEMIC_SOURCE_UNAVAILABLE; 409 ACADEMIC_CAPACITY_BELOW_OCCUPATION);
// an inactive class is 422.
export const reviewAcademicClassCapacity = async (
  classId: number,
  request: AcademicCapacityReview,
  config?: RequestConfig,
): Promise<AcademicClassCapacity> => {
  const response = await httpClient.post<ApiResponse<AcademicClassCapacity>>(
    `/api/academic/classes/${classId}/capacity-review`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/classes/{id}/capacity-exceptions: the Admin only, and only when the
// exception is turned on; off (the default), 403 CAPACITY_EXCEPTION_DISABLED to everyone.
export const authorizeAcademicCapacityException = async (
  classId: number,
  request: AcademicCapacityExceptionCreate,
  config?: RequestConfig,
): Promise<AcademicCapacityException> => {
  const response = await httpClient.post<ApiResponse<AcademicCapacityException>>(
    `/api/academic/classes/${classId}/capacity-exceptions`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/classes/{id}/history: the class history, newest first (the unit's
// management only; Professor: 403). An inverted range is 422; an unknown type 400.
export const listAcademicClassHistory = async (
  classId: number,
  params?: AcademicClassHistoryParams,
  config?: RequestConfig,
): Promise<ApiItemsPage<AcademicClassEvent>> => {
  const response = await httpClient.get<ApiResponse<ApiItemsPage<AcademicClassEvent>>>(
    `/api/academic/classes/${classId}/history`,
    { ...config, params },
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/classes/{id}/history/{eventId}: one event (of another class: 404).
export const getAcademicClassEvent = async (
  classId: number,
  eventId: number,
  config?: RequestConfig,
): Promise<AcademicClassEvent> => {
  const response = await httpClient.get<ApiResponse<AcademicClassEvent>>(
    `/api/academic/classes/${classId}/history/${eventId}`,
    config,
  )

  return unwrapApiResponse(response)
}
