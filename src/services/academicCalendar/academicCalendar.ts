import type {
  AcademicCalendarContext,
  AcademicCalendarItem,
  AcademicCalendarItemPage,
  AcademicCalendarItemParams,
  AcademicCalendarItemWrite,
  AcademicCalendarPreview,
  AcademicCalendarPublish,
  AcademicCalendarPublished,
  AcademicCalendarVersion,
  AcademicCalendarWithdraw,
  ApiResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P04 basic calendar (backend docs/P04_CONTRATO.md, slice 4; calendar-controller). The preparation is
// the management's (Admin, Secretaria, Coordenação, in their units); publishing and withdrawing, the Admin's
// and the unit's Coordenação's (403 before any read for anyone else). Common errors: 404 ACADEMIC_NOT_FOUND,
// 403 ACCESS_DENIED/SCOPE_DENIED, 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.

// USED. GET /api/academic/calendar/items: the items being prepared.
export const listAcademicCalendarItems = async (
  params?: AcademicCalendarItemParams,
  config?: RequestConfig,
): Promise<AcademicCalendarItemPage> => {
  const response = await httpClient.get<ApiResponse<AcademicCalendarItemPage>>("/api/academic/calendar/items", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/calendar/items: saving never publishes. Errors: 422
// ACADEMIC_INVALID_RANGE (dates outside the period), a closed period; 403 a unit out of scope.
export const createAcademicCalendarItem = async (
  request: AcademicCalendarItemWrite,
  config?: RequestConfig,
): Promise<AcademicCalendarItem> => {
  const response = await httpClient.post<ApiResponse<AcademicCalendarItem>>(
    "/api/academic/calendar/items",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/calendar/items/{id}.
export const getAcademicCalendarItem = async (
  itemId: number,
  config?: RequestConfig,
): Promise<AcademicCalendarItem> => {
  const response = await httpClient.get<ApiResponse<AcademicCalendarItem>>(
    `/api/academic/calendar/items/${itemId}`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. PUT /api/academic/calendar/items/{id}: changes only the preparation (the published
// version doesn't change); the caller needs every unit of the item in scope.
export const updateAcademicCalendarItem = async (
  itemId: number,
  request: AcademicCalendarItemWrite,
  config?: RequestConfig,
): Promise<AcademicCalendarItem> => {
  const response = await httpClient.put<ApiResponse<AcademicCalendarItem>>(
    `/api/academic/calendar/items/${itemId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/calendar/items/{id}/inactivate: takes it out of the preparation (nothing
// is deleted; the published version keeps it).
export const removeAcademicCalendarItem = async (
  itemId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicCalendarItem> => {
  const response = await httpClient.post<ApiResponse<AcademicCalendarItem>>(
    `/api/academic/calendar/items/${itemId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/calendar/preview: what would be published for a unit and period.
export const previewAcademicCalendar = async (
  params: Required<AcademicCalendarContext>,
  config?: RequestConfig,
): Promise<AcademicCalendarPreview> => {
  const response = await httpClient.get<ApiResponse<AcademicCalendarPreview>>("/api/academic/calendar/preview", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/calendar/publish: a closed snapshot per unit, all or nothing (409
// VERSION_CONFLICT when a revision changed; 422 nothing to publish).
export const publishAcademicCalendar = async (
  request: AcademicCalendarPublish,
  config?: RequestConfig,
): Promise<AcademicCalendarVersion[]> => {
  const response = await httpClient.post<ApiResponse<AcademicCalendarVersion[]>>(
    "/api/academic/calendar/publish",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/calendar/versions: the versions of a unit, newest first.
export const listAcademicCalendarVersions = async (
  params: Required<AcademicCalendarContext>,
  config?: RequestConfig,
): Promise<AcademicCalendarVersion[]> => {
  const response = await httpClient.get<ApiResponse<AcademicCalendarVersion[]>>("/api/academic/calendar/versions", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/calendar/versions/{id}/withdraw: only the published version, with a
// reason; the version is kept (WITHDRAWN).
export const withdrawAcademicCalendarVersion = async (
  versionId: number,
  request: AcademicCalendarWithdraw,
  config?: RequestConfig,
): Promise<AcademicCalendarVersion> => {
  const response = await httpClient.post<ApiResponse<AcademicCalendarVersion>>(
    `/api/academic/calendar/versions/${versionId}/withdraw`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/calendar/published: the published calendar of the caller's own context
// (the Aluno and the Responsável: their students' reference unit). Nothing published is NOT_PUBLISHED, an
// answer, not a failure.
export const getPublishedAcademicCalendar = async (
  params?: AcademicCalendarContext,
  config?: RequestConfig,
): Promise<AcademicCalendarPublished> => {
  const response = await httpClient.get<ApiResponse<AcademicCalendarPublished>>("/api/academic/calendar/published", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}
