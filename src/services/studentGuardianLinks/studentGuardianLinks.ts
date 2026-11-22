import type {
  ApiResponse,
  StudentGuardianLink,
  StudentGuardianLinkCreateRequest,
  StudentGuardianLinkEndRequest,
  StudentGuardianLinkUpdateRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P03 student-guardian links (backend docs/P03_CONTRATO.md, slice 3). Admin and Secretaria only. A
// link is only ACTIVE or ENDED and is never deleted; editing needs the `version`.

// NOT USED YET. POST /api/student-guardian-links: links a guardian (by id, or by the reuse proof for one
// of another unit) with the consent confirmed. Errors: 422 CONSENT_REQUIRED, RELATIONSHIP_INVALID,
// STUDENT_INACTIVE, GUARDIAN_INACTIVE, LINK_SELF; 409 LINK_DUPLICATE; 403 REUSE_TOKEN_INVALID.
export const createStudentGuardianLink = async (
  request: StudentGuardianLinkCreateRequest,
  config?: RequestConfig,
): Promise<StudentGuardianLink> => {
  const response = await httpClient.post<ApiResponse<StudentGuardianLink>>(
    "/api/student-guardian-links",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/student-guardian-links/{id}.
export const getStudentGuardianLink = async (linkId: number, config?: RequestConfig): Promise<StudentGuardianLink> => {
  const response = await httpClient.get<ApiResponse<StudentGuardianLink>>(
    `/api/student-guardian-links/${linkId}`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/student-guardian-links/{id}: changes the relationship, the three
// responsibilities and the start date. 409 LINK_ENDED.
export const updateStudentGuardianLink = async (
  linkId: number,
  request: StudentGuardianLinkUpdateRequest,
  config?: RequestConfig,
): Promise<StudentGuardianLink> => {
  const response = await httpClient.put<ApiResponse<StudentGuardianLink>>(
    `/api/student-guardian-links/${linkId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/student-guardian-links/{id}/end: ends the link with a reason. Errors: 409
// LINK_ENDED; 422 REASON_REQUIRED, END_BEFORE_START, LAST_GUARDIAN (the last guardian of an active
// student; only the Admin, with an `exceptionReason`).
export const endStudentGuardianLink = async (
  linkId: number,
  request: StudentGuardianLinkEndRequest,
  config?: RequestConfig,
): Promise<StudentGuardianLink> => {
  const response = await httpClient.post<ApiResponse<StudentGuardianLink>>(
    `/api/student-guardian-links/${linkId}/end`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
