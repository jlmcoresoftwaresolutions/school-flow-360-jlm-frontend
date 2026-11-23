import type {
  AcademicCatalogImpact,
  AcademicCatalogMatches,
  AcademicCatalogSearchParams,
  AcademicGrade,
  AcademicGradePage,
  AcademicGradeSearchParams,
  AcademicGradeWrite,
  AcademicOffer,
  AcademicOfferCreate,
  AcademicOfferPage,
  AcademicOfferSearchParams,
  AcademicOfferSubjects,
  AcademicRoom,
  AcademicRoomWrite,
  AcademicShift,
  AcademicStage,
  AcademicStagePage,
  AcademicStageWrite,
  AcademicSubject,
  AcademicSubjectPage,
  AcademicSubjectWrite,
  ApiResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P04 academic catalog (backend docs/P04_CONTRATO.md, slice 1; academic-catalog-controller): stages,
// grades, subjects, the pre-creation search, offers, rooms and shifts. Admin, Secretaria and Coordenação
// manage it (the per-unit items in their units); a Professor only reads. Common errors: 404
// ACADEMIC_NOT_FOUND, 403 ACCESS_DENIED/SCOPE_DENIED, 428 VERSION_REQUIRED, 409 VERSION_CONFLICT; a name or
// code repeated in its scope is 409 ACADEMIC_DUPLICATE_CODE, and an inactivation with something
// depending on it 409 ACADEMIC_DEPENDENCY_ACTIVE.

// NOT USED YET. GET /api/academic/stages: the stages of the institution.
export const listAcademicStages = async (
  params?: AcademicCatalogSearchParams,
  config?: RequestConfig,
): Promise<AcademicStagePage> => {
  const response = await httpClient.get<ApiResponse<AcademicStagePage>>("/api/academic/stages", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/stages: a level of the institution (`name`, `sortOrder` ≥ 0); the name is unique.
export const createAcademicStage = async (
  request: AcademicStageWrite,
  config?: RequestConfig,
): Promise<AcademicStage> => {
  const response = await httpClient.post<ApiResponse<AcademicStage>>("/api/academic/stages", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/stages/{id}.
export const getAcademicStage = async (stageId: number, config?: RequestConfig): Promise<AcademicStage> => {
  const response = await httpClient.get<ApiResponse<AcademicStage>>(`/api/academic/stages/${stageId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/stages/{id}: the edition, with `version`.
export const updateAcademicStage = async (
  stageId: number,
  request: AcademicStageWrite,
  config?: RequestConfig,
): Promise<AcademicStage> => {
  const response = await httpClient.put<ApiResponse<AcademicStage>>(`/api/academic/stages/${stageId}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/stages/{id}/impact: what would block inactivating it.
export const getAcademicStageImpact = async (
  stageId: number,
  config?: RequestConfig,
): Promise<AcademicCatalogImpact> => {
  const response = await httpClient.get<ApiResponse<AcademicCatalogImpact>>(
    `/api/academic/stages/${stageId}/impact`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/stages/{id}/inactivate: refused while something depends on it.
export const inactivateAcademicStage = async (
  stageId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicStage> => {
  const response = await httpClient.post<ApiResponse<AcademicStage>>(
    `/api/academic/stages/${stageId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/stages/{id}/activate.
export const activateAcademicStage = async (
  stageId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicStage> => {
  const response = await httpClient.post<ApiResponse<AcademicStage>>(
    `/api/academic/stages/${stageId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/grades: the grades of the institution.
export const listAcademicGrades = async (
  params?: AcademicGradeSearchParams,
  config?: RequestConfig,
): Promise<AcademicGradePage> => {
  const response = await httpClient.get<ApiResponse<AcademicGradePage>>("/api/academic/grades", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/grades: a grade of one stage, fixed when created (another stage is 422 ACADEMIC_FIELD_INCOMPATIBLE); the name is unique in the stage.
export const createAcademicGrade = async (
  request: AcademicGradeWrite,
  config?: RequestConfig,
): Promise<AcademicGrade> => {
  const response = await httpClient.post<ApiResponse<AcademicGrade>>("/api/academic/grades", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/grades/{id}.
export const getAcademicGrade = async (gradeId: number, config?: RequestConfig): Promise<AcademicGrade> => {
  const response = await httpClient.get<ApiResponse<AcademicGrade>>(`/api/academic/grades/${gradeId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/grades/{id}: the edition, with `version`.
export const updateAcademicGrade = async (
  gradeId: number,
  request: AcademicGradeWrite,
  config?: RequestConfig,
): Promise<AcademicGrade> => {
  const response = await httpClient.put<ApiResponse<AcademicGrade>>(`/api/academic/grades/${gradeId}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/grades/{id}/impact: what would block inactivating it.
export const getAcademicGradeImpact = async (
  gradeId: number,
  config?: RequestConfig,
): Promise<AcademicCatalogImpact> => {
  const response = await httpClient.get<ApiResponse<AcademicCatalogImpact>>(
    `/api/academic/grades/${gradeId}/impact`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/grades/{id}/inactivate: refused while something depends on it.
export const inactivateAcademicGrade = async (
  gradeId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicGrade> => {
  const response = await httpClient.post<ApiResponse<AcademicGrade>>(
    `/api/academic/grades/${gradeId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/grades/{id}/activate.
export const activateAcademicGrade = async (
  gradeId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicGrade> => {
  const response = await httpClient.post<ApiResponse<AcademicGrade>>(
    `/api/academic/grades/${gradeId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/subjects: the subjects of the institution.
export const listAcademicSubjects = async (
  params?: AcademicCatalogSearchParams,
  config?: RequestConfig,
): Promise<AcademicSubjectPage> => {
  const response = await httpClient.get<ApiResponse<AcademicSubjectPage>>("/api/academic/subjects", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/subjects: a subject of the institution; the code is unique without case, accents or repeated spaces.
export const createAcademicSubject = async (
  request: AcademicSubjectWrite,
  config?: RequestConfig,
): Promise<AcademicSubject> => {
  const response = await httpClient.post<ApiResponse<AcademicSubject>>("/api/academic/subjects", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/subjects/{id}.
export const getAcademicSubject = async (subjectId: number, config?: RequestConfig): Promise<AcademicSubject> => {
  const response = await httpClient.get<ApiResponse<AcademicSubject>>(`/api/academic/subjects/${subjectId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/subjects/{id}: the edition, with `version`.
export const updateAcademicSubject = async (
  subjectId: number,
  request: AcademicSubjectWrite,
  config?: RequestConfig,
): Promise<AcademicSubject> => {
  const response = await httpClient.put<ApiResponse<AcademicSubject>>(
    `/api/academic/subjects/${subjectId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/subjects/{id}/impact: what would block inactivating it.
export const getAcademicSubjectImpact = async (
  subjectId: number,
  config?: RequestConfig,
): Promise<AcademicCatalogImpact> => {
  const response = await httpClient.get<ApiResponse<AcademicCatalogImpact>>(
    `/api/academic/subjects/${subjectId}/impact`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/subjects/{id}/inactivate: refused while something depends on it.
export const inactivateAcademicSubject = async (
  subjectId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicSubject> => {
  const response = await httpClient.post<ApiResponse<AcademicSubject>>(
    `/api/academic/subjects/${subjectId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/subjects/{id}/activate.
export const activateAcademicSubject = async (
  subjectId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicSubject> => {
  const response = await httpClient.post<ApiResponse<AcademicSubject>>(
    `/api/academic/subjects/${subjectId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/catalog/search: the similar stages, grades and subjects before creating one (at least 2 characters).
export const searchAcademicCatalog = async (q: string, config?: RequestConfig): Promise<AcademicCatalogMatches> => {
  const response = await httpClient.get<ApiResponse<AcademicCatalogMatches>>("/api/academic/catalog/search", {
    ...config,
    params: { q },
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/offers: the offers in the caller's scope.
export const listAcademicOffers = async (
  params?: AcademicOfferSearchParams,
  config?: RequestConfig,
): Promise<AcademicOfferPage> => {
  const response = await httpClient.get<ApiResponse<AcademicOfferPage>>("/api/academic/offers", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/offers/{id}.
export const getAcademicOffer = async (offerId: number, config?: RequestConfig): Promise<AcademicOffer> => {
  const response = await httpClient.get<ApiResponse<AcademicOffer>>(`/api/academic/offers/${offerId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/offers: the unit must be in the period, active and in scope; the period not closed; the grade and its stage active; the combination is unique.
export const createAcademicOffer = async (
  request: AcademicOfferCreate,
  config?: RequestConfig,
): Promise<AcademicOffer> => {
  const response = await httpClient.post<ApiResponse<AcademicOffer>>("/api/academic/offers", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/offers/{id}/subjects: replaces the list (only active subjects).
export const setAcademicOfferSubjects = async (
  offerId: number,
  request: AcademicOfferSubjects,
  config?: RequestConfig,
): Promise<AcademicOffer> => {
  const response = await httpClient.put<ApiResponse<AcademicOffer>>(
    `/api/academic/offers/${offerId}/subjects`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/offers/{id}/inactivate: refused while a class is in preparation or active.
export const inactivateAcademicOffer = async (
  offerId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicOffer> => {
  const response = await httpClient.post<ApiResponse<AcademicOffer>>(
    `/api/academic/offers/${offerId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/offers/{id}/activate: the period must not be closed.
export const activateAcademicOffer = async (
  offerId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicOffer> => {
  const response = await httpClient.post<ApiResponse<AcademicOffer>>(
    `/api/academic/offers/${offerId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/rooms: the physical rooms of a unit.
export const listAcademicRooms = async (
  params: { unitId: number },
  config?: RequestConfig,
): Promise<AcademicRoom[]> => {
  const response = await httpClient.get<ApiResponse<AcademicRoom[]>>("/api/academic/rooms", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/rooms: the name is unique in the unit.
export const createAcademicRoom = async (request: AcademicRoomWrite, config?: RequestConfig): Promise<AcademicRoom> => {
  const response = await httpClient.post<ApiResponse<AcademicRoom>>("/api/academic/rooms", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/academic/rooms/{id}: renames it (the room never changes unit).
export const updateAcademicRoom = async (
  roomId: number,
  request: AcademicRoomWrite,
  config?: RequestConfig,
): Promise<AcademicRoom> => {
  const response = await httpClient.put<ApiResponse<AcademicRoom>>(`/api/academic/rooms/${roomId}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/rooms/{id}/inactivate: refused while a class in preparation or active uses it.
export const inactivateAcademicRoom = async (
  roomId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicRoom> => {
  const response = await httpClient.post<ApiResponse<AcademicRoom>>(
    `/api/academic/rooms/${roomId}/inactivate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/academic/rooms/{id}/activate.
export const activateAcademicRoom = async (
  roomId: number,
  version: number,
  config?: RequestConfig,
): Promise<AcademicRoom> => {
  const response = await httpClient.post<ApiResponse<AcademicRoom>>(
    `/api/academic/rooms/${roomId}/activate`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/academic/shifts: the fixed shifts (MANHA, TARDE, NOITE, INTEGRAL).
export const listAcademicShifts = async (config?: RequestConfig): Promise<AcademicShift[]> => {
  const response = await httpClient.get<ApiResponse<AcademicShift[]>>("/api/academic/shifts", config)

  return unwrapApiResponse(response)
}
