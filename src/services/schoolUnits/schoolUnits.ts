import type {
  ActivateSchoolUnitRequest,
  ApiPage,
  ApiResponse,
  ApiSchoolUnit,
  ApiSchoolUnitListParams,
  CreateSchoolUnitRequest,
  DeactivateSchoolUnitRequest,
  SchoolUnitDeactivationCheck,
  SchoolUnitDetail,
  SchoolUnitsConsolidated,
  SchoolUnitsConsolidatedParams,
  UpdateSchoolUnitRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The school-unit endpoints, one function per route, in the backend's own shapes (models/schoolUnits).
// All of them are ADMIN only, and a unit that does not exist or is out of the user's scope answers 404
// either way. services/organization is the page-facing layer for Minha Unidade: it maps these to the
// frontend's SchoolUnit, and its calls are being moved onto these one at a time (only the list is).
// Units are never deleted, only deactivated, which keeps their history.

// USED: Minha Unidade's list (through services/organization). GET /api/school-units: the tenant's
// units, with a name search, a status filter, sorting and paging, answered as a Spring page of full
// units (with their `version`). The sort is stable, so consecutive pages neither repeat nor skip an
// item. 400 for page < 0, size outside 1..100, a sortBy other than unitName or operationalStatus, a
// direction other than asc or desc, or a status other than ACTIVE or INACTIVE. The Swagger documents the
// response as a bare object, so its shape comes from the description.
export const searchSchoolUnits = async (
  params?: ApiSchoolUnitListParams,
  config?: RequestConfig,
): Promise<ApiPage<ApiSchoolUnit>> => {
  const response = await httpClient.get<ApiResponse<ApiPage<ApiSchoolUnit>>>("/api/school-units", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/school-units/consolidated: totals and a summary per unit, only over the units
// the user may see (for now an ADMIN sees all). `totals` comes null when `metricsAvailable` is false:
// show "unavailable", never 0. 400 for a status other than ACTIVE or INACTIVE. The ids go as repeated
// `unitIds=1&unitIds=2` parameters, the form the backend reads.
export const getSchoolUnitsConsolidated = async (
  params?: SchoolUnitsConsolidatedParams,
  config?: RequestConfig,
): Promise<SchoolUnitsConsolidated> => {
  const response = await httpClient.get<ApiResponse<SchoolUnitsConsolidated>>("/api/school-units/consolidated", {
    ...config,
    params,
    paramsSerializer: { indexes: null },
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/school-units/{id}: a unit's detail, with the `version` to keep and send back
// when editing, deactivating or activating it.
export const getSchoolUnitById = async (id: number, config?: RequestConfig): Promise<SchoolUnitDetail> => {
  const response = await httpClient.get<ApiResponse<SchoolUnitDetail>>(`/api/school-units/${id}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET (the page registers units against the mock). POST /api/school-units: creates a unit of
// the tenant's organization (201), which starts ACTIVE. The name must be unique in the tenant, ignoring
// case and the spaces around it (409 otherwise, or when the tenant does not have exactly one
// organization); every field is required and is trimmed. 400 for a missing field, an invalid e-mail or
// a limit exceeded. Creating a unit gives nobody access to it.
export const addSchoolUnit = async (
  request: CreateSchoolUnitRequest,
  config?: RequestConfig,
): Promise<ApiSchoolUnit> => {
  const response = await httpClient.post<ApiResponse<ApiSchoolUnit>>("/api/school-units", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET (the page edits units against the mock). PUT /api/school-units/{id}: changes the name,
// address, e-mail and phone, and answers the new detail with the new `version`. It does not change the
// organization or the status (an `organization` or `operationalStatus` sent is ignored). 409 when the
// `version` is stale (the message tells it from a name already used by another unit): reload the detail.
// 400 for a missing field, an invalid e-mail, a limit exceeded or a missing `version`.
export const editSchoolUnit = async (
  id: number,
  request: UpdateSchoolUnitRequest,
  config?: RequestConfig,
): Promise<SchoolUnitDetail> => {
  const response = await httpClient.put<ApiResponse<SchoolUnitDetail>>(`/api/school-units/${id}`, request, config)

  return unwrapApiResponse(response)
}

// NEVER FOR A SCREEN. DELETE /api/school-units/{id}: always answers 409, because deleting would erase
// the unit's history; it only exists to explain that. Do not show a delete button: use
// deactivateSchoolUnit.
export const removeSchoolUnit = async (id: number, config?: RequestConfig): Promise<void> => {
  await httpClient.delete<ApiResponse<null>>(`/api/school-units/${id}`, config)
}

// NOT USED YET. GET /api/school-units/{id}/deactivation-check: read-only, to call BEFORE deactivating
// to show what would be affected (the users tied to the unit) and to get the `version` to send.
export const checkSchoolUnitDeactivation = async (
  id: number,
  config?: RequestConfig,
): Promise<SchoolUnitDeactivationCheck> => {
  const response = await httpClient.get<ApiResponse<SchoolUnitDeactivationCheck>>(
    `/api/school-units/${id}/deactivation-check`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the page inactivates units against the mock, asking a reason the backend does not
// have). POST /api/school-units/{id}/deactivate: marks the unit INACTIVE without deleting any data, link
// or audit record (it records a DEACTIVATE event), and does not change or block its users. Recommended
// flow: checkSchoolUnitDeactivation, show the impacts, then call this with the `version` it gave. When
// users are tied to the unit and `confirmImpacts` is not true, 409 and nothing changes (409 also when
// the `version` is stale). Already inactive: 200 with the current state.
export const deactivateSchoolUnit = async (
  id: number,
  request: DeactivateSchoolUnitRequest,
  config?: RequestConfig,
): Promise<SchoolUnitDetail> => {
  const response = await httpClient.post<ApiResponse<SchoolUnitDetail>>(
    `/api/school-units/${id}/deactivate`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the page has no reactivation). POST /api/school-units/{id}/activate: brings an INACTIVE
// unit back to ACTIVE and records an ACTIVATE audit event. 409 when the unit changed since it was read
// (stale `version`): reload. Already active: 200 with the current state and no audit event.
export const activateSchoolUnit = async (
  id: number,
  request: ActivateSchoolUnitRequest,
  config?: RequestConfig,
): Promise<SchoolUnitDetail> => {
  const response = await httpClient.post<ApiResponse<SchoolUnitDetail>>(
    `/api/school-units/${id}/activate`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
