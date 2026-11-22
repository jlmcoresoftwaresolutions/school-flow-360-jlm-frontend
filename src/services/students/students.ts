import type {
  ApiResponse,
  GuardianInvitation,
  GuardianInvitationRequest,
  PersonHistoryPage,
  Student,
  Student360,
  StudentCreateRequest,
  StudentGuardianLink,
  StudentPage,
  StudentSearchParams,
  StudentStateChange,
  StudentUpdateRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P03 students (backend docs/P03_CONTRATO.md, slices 2 to 4). Admin and Secretaria only (a
// Secretaria: its units); a student out of reach answers 404 PERSON_NOT_FOUND. Saving never creates an
// access, an enrollment or a charge. Editing needs the `version` (428 VERSION_REQUIRED, 409 VERSION_CONFLICT).
// The backend has no idempotency here: a create without an answer must be read again before trying again.

type StudentStateAction = "activate" | "discard" | "inactivate" | "reactivate"

// USED by the students page. GET /api/students: the students in the operator's reach, paged (the total
// counts only those), the document masked.
export const listStudents = async (params?: StudentSearchParams, config?: RequestConfig): Promise<StudentPage> => {
  const response = await httpClient.get<ApiResponse<StudentPage>>("/api/students", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/students/{id}: the student, with what still keeps a draft from being activated
// (`activationBlockers`).
export const getStudent = async (studentId: number, config?: RequestConfig): Promise<Student> => {
  const response = await httpClient.get<ApiResponse<Student>>(`/api/students/${studentId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/students: creates the student as a draft, with a generated registration code.
// Errors: 422 UNIT_REQUIRED, NAME_REQUIRED, BIRTH_DATE_FUTURE, EMAIL_INVALID, DOCUMENT_TYPE_INVALID,
// DOCUMENT_INCOMPLETE; 403 for a unit out of reach; 409 DOCUMENT_IN_USE, DUPLICATE_REVIEW_REQUIRED, NICKNAME_IN_USE.
export const createStudent = async (request: StudentCreateRequest, config?: RequestConfig): Promise<Student> => {
  const response = await httpClient.post<ApiResponse<Student>>("/api/students", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. PUT /api/students/{id}: replaces the editable data; a blank document keeps the current one.
export const updateStudent = async (
  studentId: number,
  request: StudentUpdateRequest,
  config?: RequestConfig,
): Promise<Student> => {
  const response = await httpClient.put<ApiResponse<Student>>(`/api/students/${studentId}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/students/{id}/activate, /inactivate, /reactivate, /discard. Activating without
// a guardian: Admin only, with `exceptionReason` (403 ADMIN_EXCEPTION_ONLY, 422 GUARDIAN_REQUIRED,
// EXCEPTION_REASON_INVALID, UNIT_INACTIVE). 409 STATE_INVALID. Reactivating checks everything again and
// doesn't reopen ended links; discarding a draft cancels its open invitations.
export const changeStudentState = async (
  studentId: number,
  action: StudentStateAction,
  request: StudentStateChange,
  config?: RequestConfig,
): Promise<Student> => {
  const response = await httpClient.post<ApiResponse<Student>>(`/api/students/${studentId}/${action}`, request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/students/{id}/profile: the student 360 (the guardians with their links, the
// invitations and the sections the operator may open).
export const getStudentProfile = async (studentId: number, config?: RequestConfig): Promise<Student360> => {
  const response = await httpClient.get<ApiResponse<Student360>>(`/api/students/${studentId}/profile`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/students/{id}/history: the registration history, paged.
export const getStudentHistory = async (
  studentId: number,
  params?: { page?: number; size?: number },
  config?: RequestConfig,
): Promise<PersonHistoryPage> => {
  const response = await httpClient.get<ApiResponse<PersonHistoryPage>>(`/api/students/${studentId}/history`, {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/students/{id}/guardians: the student's links, active and ended.
export const listStudentGuardians = async (
  studentId: number,
  config?: RequestConfig,
): Promise<StudentGuardianLink[]> => {
  const response = await httpClient.get<ApiResponse<StudentGuardianLink[]>>(
    `/api/students/${studentId}/guardians`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/students/{id}/guardian-invitations: the guardians invited from this student.
export const listGuardianInvitations = async (
  studentId: number,
  config?: RequestConfig,
): Promise<GuardianInvitation[]> => {
  const response = await httpClient.get<ApiResponse<GuardianInvitation[]>>(
    `/api/students/${studentId}/guardian-invitations`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/students/{id}/guardian-invitations: invites a guardian by e-mail (48 hours).
// Errors 409: INVITATION_PENDING, GUARDIAN_HAS_ACCESS (link it directly instead), USER_DUPLICATE.
export const inviteGuardian = async (
  studentId: number,
  request: GuardianInvitationRequest,
  config?: RequestConfig,
): Promise<GuardianInvitation> => {
  const response = await httpClient.post<ApiResponse<GuardianInvitation>>(
    `/api/students/${studentId}/guardian-invitations`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/students/{id}/guardian-invitations/{n}/confirm: the school confirms an accepted
// invitation, creating the active link with the guardian's own consent. 409 INVITATION_LINK_STATE_INVALID.
export const confirmGuardianInvitation = async (
  studentId: number,
  invitationLinkId: number,
  config?: RequestConfig,
): Promise<StudentGuardianLink> => {
  const response = await httpClient.post<ApiResponse<StudentGuardianLink>>(
    `/api/students/${studentId}/guardian-invitations/${invitationLinkId}/confirm`,
    null,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/students/{id}/guardian-invitations/{n}/reject: the school rejects it (the
// account stays, the link isn't born). 409 INVITATION_LINK_STATE_INVALID.
export const rejectGuardianInvitation = async (
  studentId: number,
  invitationLinkId: number,
  config?: RequestConfig,
): Promise<GuardianInvitation> => {
  const response = await httpClient.post<ApiResponse<GuardianInvitation>>(
    `/api/students/${studentId}/guardian-invitations/${invitationLinkId}/reject`,
    null,
    config,
  )

  return unwrapApiResponse(response)
}
