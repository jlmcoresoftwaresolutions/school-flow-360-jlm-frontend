import type {
  ApiResponse,
  Enrollment,
  EnrollmentAbandonRequest,
  EnrollmentClassContext,
  EnrollmentContextRequest,
  EnrollmentGuardianOption,
  EnrollmentHistoryPage,
  EnrollmentHistoryParams,
  EnrollmentPage,
  EnrollmentPartiesRequest,
  EnrollmentSearchParams,
  EnrollmentStartRequest,
  EnrollmentStudentSearchParams,
  PeopleSearchPage,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The EPIC 6 enrollment (backend docs/P05_CONTRATO.md, slices 0 to 2 part 1). Admin operates everywhere,
// the Secretaria in its units; the Financeiro and the Coordenação only read, in their units. An enrollment
// out of reach answers 404 ENROLLMENT_NOT_FOUND, the same as one that doesn't exist. Every change needs
// the `version` (428 VERSION_REQUIRED, 409 VERSION_CONFLICT) and only works in preparation (409
// ENROLLMENT_NOT_IN_PREPARATION). Saving a preparation never creates an account, a charge or an active
// enrollment.

// USED by the enrollments page. GET /api/enrollments: the enrollments in reach, paged (the total counts
// only those). Without `status`, the abandoned preparations are left out.
export const listEnrollments = async (
  params?: EnrollmentSearchParams,
  config?: RequestConfig,
): Promise<EnrollmentPage> => {
  const response = await httpClient.get<ApiResponse<EnrollmentPage>>("/api/enrollments", { ...config, params })

  return unwrapApiResponse(response)
}

// USED by the new enrollment dialog. POST /api/enrollments: starts a preparation (DRAFT) for a student of
// People in a unit. 409 ENROLLMENT_CONFLICT: the student already has a live enrollment there (nothing is
// merged); 422 ENROLLMENT_STUDENT_NOT_FOUND, UNIT_INACTIVE; 403 for a unit out of reach.
export const startEnrollment = async (request: EnrollmentStartRequest, config?: RequestConfig): Promise<Enrollment> => {
  const response = await httpClient.post<ApiResponse<Enrollment>>("/api/enrollments", request, config)

  return unwrapApiResponse(response)
}

// USED by the enrollment page. GET /api/enrollments/{id}: the enrollment with the student, the guardians
// chosen, the class, the pendencies, the stages not evaluated yet and the actions allowed.
export const getEnrollment = async (enrollmentId: number, config?: RequestConfig): Promise<Enrollment> => {
  const response = await httpClient.get<ApiResponse<Enrollment>>(`/api/enrollments/${enrollmentId}`, config)

  return unwrapApiResponse(response)
}

// USED by the new enrollment dialog. GET /api/enrollments/students/search: the students the operator may
// prepare (only the people of their units; Admin and Secretaria). It shares the people search limit (429
// SEARCH_RATE_LIMITED).
export const searchEnrollmentStudents = async (
  params: EnrollmentStudentSearchParams,
  config?: RequestConfig,
): Promise<PeopleSearchPage> => {
  const response = await httpClient.get<ApiResponse<PeopleSearchPage>>("/api/enrollments/students/search", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET (the enrollment's guardians tab). GET /api/enrollments/{id}/guardians: every guardian linked to
// the student in People (active or ended link), with what was chosen for this enrollment.
export const listEnrollmentGuardians = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentGuardianOption[]> => {
  const response = await httpClient.get<ApiResponse<EnrollmentGuardianOption[]>>(
    `/api/enrollments/${enrollmentId}/guardians`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the enrollment's guardians tab). PUT /api/enrollments/{id}/parties: the whole set of guardians
// chosen, each financial and/or signatory explicitly. 422 ENROLLMENT_PARTY_INVALID: a guardian without an
// active link to the student, or not active. The same choice again changes nothing.
export const saveEnrollmentParties = async (
  enrollmentId: number,
  request: EnrollmentPartiesRequest,
  config?: RequestConfig,
): Promise<Enrollment> => {
  const response = await httpClient.put<ApiResponse<Enrollment>>(
    `/api/enrollments/${enrollmentId}/parties`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the enrollment's class tab). GET /api/enrollments/{id}/classes: the active classes of the
// enrollment's unit open for enrollment, each with its limit, the occupation read now and the seats.
export const listEnrollmentClasses = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentClassContext[]> => {
  const response = await httpClient.get<ApiResponse<EnrollmentClassContext[]>>(
    `/api/enrollments/${enrollmentId}/classes`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the enrollment's class tab). PUT /api/enrollments/{id}/context: chooses the class (null takes
// the choice back). Choosing never reserves a seat. 422 ENROLLMENT_CONTEXT_INVALID: a class of another
// unit, missing, or not open for enrollment.
export const saveEnrollmentContext = async (
  enrollmentId: number,
  request: EnrollmentContextRequest,
  config?: RequestConfig,
): Promise<Enrollment> => {
  const response = await httpClient.put<ApiResponse<Enrollment>>(
    `/api/enrollments/${enrollmentId}/context`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment page. POST /api/enrollments/{id}/abandon: gives the preparation up, with a
// reason (1 to 500). It never touches an active enrollment.
export const abandonEnrollment = async (
  enrollmentId: number,
  request: EnrollmentAbandonRequest,
  config?: RequestConfig,
): Promise<Enrollment> => {
  const response = await httpClient.post<ApiResponse<Enrollment>>(
    `/api/enrollments/${enrollmentId}/abandon`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's history tab. GET /api/enrollments/{id}/history: the events, newest first by
// default (`direction=asc` for the oldest first).
export const listEnrollmentHistory = async (
  enrollmentId: number,
  params?: EnrollmentHistoryParams,
  config?: RequestConfig,
): Promise<EnrollmentHistoryPage> => {
  const response = await httpClient.get<ApiResponse<EnrollmentHistoryPage>>(
    `/api/enrollments/${enrollmentId}/history`,
    { ...config, params },
  )

  return unwrapApiResponse(response)
}
