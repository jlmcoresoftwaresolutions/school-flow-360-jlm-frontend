import type {
  ApiResponse,
  DocumentRequirement,
  DocumentRequirementWrite,
  EnrollmentDocumentAttach,
  EnrollmentDocumentChecklist,
  EnrollmentDocumentException,
  EnrollmentDocumentReview,
  EnrollmentDocumentUpload,
  EnrollmentExceptionDecision,
  EnrollmentExceptionRequest,
  PersonDocumentDownload,
} from "@/models"

import { toFileFormData, unwrapApiResponse } from "../httpClient/apiResponse"
import { httpClient, type RequestConfig } from "../httpClient/httpClient"

// The documents of an enrollment (backend EnrollmentDocumentController, docs/P05_CONTRATO.md slice 3B):
// the checklist of an enrollment, its files and checks, the documentary exceptions and the school's
// catalog of requirements. Only the Admin and the Secretaria of the unit reach them; the Financeiro and
// the Coordenação get 403 (they see only the DOCUMENTS_PENDING pendency on the enrollment).

// USED by the enrollment's documents tab. GET /api/enrollments/{id}/documents: one line per requirement that
// applies and per person, with its status, validity and what the person may do.
export const getEnrollmentDocuments = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentDocumentChecklist> => {
  const response = await httpClient.get<ApiResponse<EnrollmentDocumentChecklist>>(
    `/api/enrollments/${enrollmentId}/documents`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. POST /api/enrollments/{id}/documents/{requirementId}/file
// (multipart): registers the person's document with its file and attaches it to the line, which the school
// still has to check. Errors: 503 STORAGE_DISABLED (nothing stored), 413 FILE_TOO_LARGE,
// 415 FILE_TYPE_NOT_ALLOWED, 422 ENROLLMENT_DOCUMENT_INVALID.
export const uploadEnrollmentDocument = async (
  enrollmentId: number,
  requirementId: number,
  fields: EnrollmentDocumentUpload,
  file: File,
  config?: RequestConfig,
): Promise<EnrollmentDocumentChecklist> => {
  const body = toFileFormData(file)
  body.append("documentType", fields.documentType)
  if (fields.personId !== undefined) body.append("personId", String(fields.personId))
  if (fields.issuedOn) body.append("issuedOn", fields.issuedOn)
  if (fields.expiresOn) body.append("expiresOn", fields.expiresOn)
  const response = await httpClient.post<ApiResponse<EnrollmentDocumentChecklist>>(
    `/api/enrollments/${enrollmentId}/documents/${requirementId}/file`,
    body,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the tab only sends new files for now). PUT /api/enrollments/{id}/documents/{requirementId}/attach:
// attaches a document already registered in People (with a stored file and an accepted type).
// Errors: 422 ENROLLMENT_DOCUMENT_INVALID.
export const attachEnrollmentDocument = async (
  enrollmentId: number,
  requirementId: number,
  request: EnrollmentDocumentAttach,
  config?: RequestConfig,
): Promise<EnrollmentDocumentChecklist> => {
  const response = await httpClient.put<ApiResponse<EnrollmentDocumentChecklist>>(
    `/api/enrollments/${enrollmentId}/documents/${requirementId}/attach`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. POST /api/enrollments/{id}/documents/items/{itemId}/review: the school
// approves or rejects (with a reason) the document of a line. Approving an expired one is 422.
// Errors: 409 VERSION_CONFLICT, 422 ENROLLMENT_DOCUMENT_INVALID.
export const reviewEnrollmentDocument = async (
  enrollmentId: number,
  itemId: number,
  request: EnrollmentDocumentReview,
  config?: RequestConfig,
): Promise<EnrollmentDocumentChecklist> => {
  const response = await httpClient.post<ApiResponse<EnrollmentDocumentChecklist>>(
    `/api/enrollments/${enrollmentId}/documents/items/${itemId}/review`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. GET /api/enrollments/{id}/documents/items/{itemId}/download: a 5-minute
// link to the file (audited), asked for every time and never kept.
export const getEnrollmentDocumentDownload = async (
  enrollmentId: number,
  itemId: number,
  config?: RequestConfig,
): Promise<PersonDocumentDownload> => {
  const response = await httpClient.get<ApiResponse<PersonDocumentDownload>>(
    `/api/enrollments/${enrollmentId}/documents/items/${itemId}/download`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. GET /api/enrollments/{id}/exceptions: the documentary exceptions.
export const listEnrollmentExceptions = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentDocumentException[]> => {
  const response = await httpClient.get<ApiResponse<EnrollmentDocumentException[]>>(
    `/api/enrollments/${enrollmentId}/exceptions`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. POST /api/enrollments/{id}/exceptions: the Secretaria or the Admin asks
// for an exception, with a reason. Errors: 422 EXCEPTION_NOT_ALLOWED (legal obligation or proof of
// representation), EXCEPTION_NOT_NEEDED, EXCEPTION_REQUIREMENT_INVALID, 409 EXCEPTION_OPEN.
export const requestEnrollmentException = async (
  enrollmentId: number,
  request: EnrollmentExceptionRequest,
  config?: RequestConfig,
): Promise<EnrollmentDocumentException> => {
  const response = await httpClient.post<ApiResponse<EnrollmentDocumentException>>(
    `/api/enrollments/${enrollmentId}/exceptions`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's documents tab. POST /api/enrollments/{id}/exceptions/{exceptionId}/decision: only the
// Admin decides, never the person who asked. Errors: 422 EXCEPTION_SAME_PERSON,
// EXCEPTION_DEADLINE_INVALID, 409 EXCEPTION_ALREADY_DECIDED, VERSION_CONFLICT, 403.
export const decideEnrollmentException = async (
  enrollmentId: number,
  exceptionId: number,
  request: EnrollmentExceptionDecision,
  config?: RequestConfig,
): Promise<EnrollmentDocumentException> => {
  const response = await httpClient.post<ApiResponse<EnrollmentDocumentException>>(
    `/api/enrollments/${enrollmentId}/exceptions/${exceptionId}/decision`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the document requirements page. GET /api/enrollment-documents/requirements: the school's catalog (Admin and Secretaria read).
export const listDocumentRequirements = async (config?: RequestConfig): Promise<DocumentRequirement[]> => {
  const response = await httpClient.get<ApiResponse<DocumentRequirement[]>>(
    "/api/enrollment-documents/requirements",
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the document requirements page. POST /api/enrollment-documents/requirements: Admin only; born inactive.
// Errors: 409 REQUIREMENT_DUPLICATE.
export const createDocumentRequirement = async (
  request: DocumentRequirementWrite,
  config?: RequestConfig,
): Promise<DocumentRequirement> => {
  const response = await httpClient.post<ApiResponse<DocumentRequirement>>(
    "/api/enrollment-documents/requirements",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the document requirements page. PUT /api/enrollment-documents/requirements/{id}: Admin only, with `version`.
export const updateDocumentRequirement = async (
  requirementId: number,
  request: DocumentRequirementWrite,
  config?: RequestConfig,
): Promise<DocumentRequirement> => {
  const response = await httpClient.put<ApiResponse<DocumentRequirement>>(
    `/api/enrollment-documents/requirements/${requirementId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the document requirements page. POST /api/enrollment-documents/requirements/{id}/activate or /inactivate: publishes or
// withdraws a requirement (never deleted). Admin only.
export const setDocumentRequirementActive = async (
  requirementId: number,
  active: boolean,
  version: number,
  config?: RequestConfig,
): Promise<DocumentRequirement> => {
  const response = await httpClient.post<ApiResponse<DocumentRequirement>>(
    `/api/enrollment-documents/requirements/${requirementId}/${active ? "activate" : "inactivate"}`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}
