import type {
  AcademicClass,
  AcademicClassCreate,
  AcademicClassImpact,
  AcademicClassPage,
  AcademicClassSearchParams,
  AcademicClassStateChange,
  AcademicClassUpdate,
  AcademicTeacher,
  AcademicTeacherLink,
  AcademicTeacherLinkCreate,
  AcademicTeacherLinkEnd,
  AcademicTeacherLinkUpdate,
  ApiResponse,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P04 classes and teacher links (backend docs/P04_CONTRATO.md, slice 2; class-controller). A
// Professor only sees the classes where they have a current link (404 otherwise). Common errors: 404
// ACADEMIC_NOT_FOUND, 403 ACCESS_DENIED/SCOPE_DENIED, 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.

// USED. GET /api/academic/classes: the classes in the caller's scope.
export const listAcademicClasses = async (
  params?: AcademicClassSearchParams,
  config?: RequestConfig,
): Promise<AcademicClassPage> => {
  const response = await httpClient.get<ApiResponse<AcademicClassPage>>("/api/academic/classes", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/classes: creates the class in PREPARATION, inside an existing active
// offer. Errors: 422 ACADEMIC_FIELD_INCOMPATIBLE (no such offer, a room of another unit, a subject not of
// the offer...); 409 ACADEMIC_DUPLICATE_CODE (code in the unit and period).
export const createAcademicClass = async (
  request: AcademicClassCreate,
  config?: RequestConfig,
): Promise<AcademicClass> => {
  const response = await httpClient.post<ApiResponse<AcademicClass>>("/api/academic/classes", request, config)

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/classes/{id}.
export const getAcademicClass = async (classId: number, config?: RequestConfig): Promise<AcademicClass> => {
  const response = await httpClient.get<ApiResponse<AcademicClass>>(`/api/academic/classes/${classId}`, config)

  return unwrapApiResponse(response)
}

// USED. PUT /api/academic/classes/{id}: the name, the shift and the room, with `version`.
export const updateAcademicClass = async (
  classId: number,
  request: AcademicClassUpdate,
  config?: RequestConfig,
): Promise<AcademicClass> => {
  const response = await httpClient.put<ApiResponse<AcademicClass>>(`/api/academic/classes/${classId}`, request, config)

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/classes/{id}/impact: what stops activating and what blocks inactivating.
export const getAcademicClassImpact = async (classId: number, config?: RequestConfig): Promise<AcademicClassImpact> => {
  const response = await httpClient.get<ApiResponse<AcademicClassImpact>>(
    `/api/academic/classes/${classId}/impact`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/classes/{id}/activate: 422 ACADEMIC_NOT_ELIGIBLE naming what stops it.
export const activateAcademicClass = async (
  classId: number,
  request: AcademicClassStateChange,
  config?: RequestConfig,
): Promise<AcademicClass> => {
  const response = await httpClient.post<ApiResponse<AcademicClass>>(
    `/api/academic/classes/${classId}/activate`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/classes/{id}/inactivate: checks again the teacher links, the
// enrollments and the enrollment source: while the enrollment (EPIC 6) doesn't exist it is 503
// ACADEMIC_SOURCE_UNAVAILABLE (the silence doesn't prove there is no student); 409 ACADEMIC_DEPENDENCY_ACTIVE.
export const inactivateAcademicClass = async (
  classId: number,
  request: AcademicClassStateChange,
  config?: RequestConfig,
): Promise<AcademicClass> => {
  const response = await httpClient.post<ApiResponse<AcademicClass>>(
    `/api/academic/classes/${classId}/inactivate`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/teachers/search: the active Professors of the unit (at least 2
// characters); the unit's management only.
export const searchAcademicTeachers = async (
  params: { q: string; unitId: number },
  config?: RequestConfig,
): Promise<AcademicTeacher[]> => {
  const response = await httpClient.get<ApiResponse<AcademicTeacher[]>>("/api/academic/teachers/search", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED. GET /api/academic/classes/{id}/teachers: the links of the class (a Professor: only theirs).
export const listAcademicTeacherLinks = async (
  classId: number,
  config?: RequestConfig,
): Promise<AcademicTeacherLink[]> => {
  const response = await httpClient.get<ApiResponse<AcademicTeacherLink[]>>(
    `/api/academic/classes/${classId}/teachers`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/classes/{id}/teachers: links a Professor of the unit to a subject of
// the class. Errors: 422 ACADEMIC_INVALID_RANGE (outside the period); 409 ACADEMIC_DUPLICATE_CODE (the same
// teacher in overlapping dates), ACADEMIC_JOINT_REQUIRED; 403 a date in the past without being the Admin
// or the Coordenação; 400 a date in the past without a reason.
export const createAcademicTeacherLink = async (
  classId: number,
  request: AcademicTeacherLinkCreate,
  config?: RequestConfig,
): Promise<AcademicTeacherLink> => {
  const response = await httpClient.post<ApiResponse<AcademicTeacherLink>>(
    `/api/academic/classes/${classId}/teachers`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. PUT /api/academic/teacher-links/{id}: the dates and `joint` of a link not ended.
export const updateAcademicTeacherLink = async (
  linkId: number,
  request: AcademicTeacherLinkUpdate,
  config?: RequestConfig,
): Promise<AcademicTeacherLink> => {
  const response = await httpClient.put<ApiResponse<AcademicTeacherLink>>(
    `/api/academic/teacher-links/${linkId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED. POST /api/academic/teacher-links/{id}/end: ends it with a reason, deleting nothing; ending
// again returns it as it is.
export const endAcademicTeacherLink = async (
  linkId: number,
  request: AcademicTeacherLinkEnd,
  config?: RequestConfig,
): Promise<AcademicTeacherLink> => {
  const response = await httpClient.post<ApiResponse<AcademicTeacherLink>>(
    `/api/academic/teacher-links/${linkId}/end`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
