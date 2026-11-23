import type {
  AnonymizeRequest,
  ApiResponse,
  DuplicateDecisionRequest,
  DuplicateReview,
  DuplicateReviewRequest,
  PeopleSearchPage,
  PeopleSearchParams,
  PersonCheckResult,
  PersonDocument,
  PersonDocumentDownload,
  PersonDocumentRequest,
  PersonSignals,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, toFileFormData, unwrapApiResponse } from "../httpClient"

// The P03 search, exact check, duplicate review, documents and LGPD tools (backend docs/P03_CONTRATO.md,
// slices 1 and 4). Admin and Secretaria only (the LGPD tools: Admin only); every other role gets 403. A
// person out of reach answers 404 PERSON_NOT_FOUND. The search and the check are limited to 30 a minute
// per person (429 SEARCH_RATE_LIMITED) and audited without the typed value.

// USED by the people search page. GET /api/people/search: students and guardians in the operator's reach (a Secretaria:
// its units; an Admin: everyone), the document always masked. 400 for an invalid filter.
export const searchPeople = async (params: PeopleSearchParams, config?: RequestConfig): Promise<PeopleSearchPage> => {
  const response = await httpClient.get<ApiResponse<PeopleSearchPage>>("/api/people/search", { ...config, params })

  return unwrapApiResponse(response)
}

// USED by the guardian picker of a link. POST /api/people/check: whether someone already has these identifiers anywhere in the
// tenant. Out of reach only a partial name, masked identifiers and a proof of reuse come. A name alone
// is not a check (400).
export const checkPerson = async (signals: PersonSignals, config?: RequestConfig): Promise<PersonCheckResult> => {
  const response = await httpClient.post<ApiResponse<PersonCheckResult>>("/api/people/check", signals, config)

  return unwrapApiResponse(response)
}

// USED by the duplicate review. POST /api/people/duplicate-reviews: opens a review of the people found for these signals
// (nobody found: `reviewId` null, `status` NONE).
export const openDuplicateReview = async (
  request: DuplicateReviewRequest,
  config?: RequestConfig,
): Promise<DuplicateReview> => {
  const response = await httpClient.post<ApiResponse<DuplicateReview>>("/api/people/duplicate-reviews", request, config)

  return unwrapApiResponse(response)
}

// USED by the duplicate review. POST /api/people/duplicate-reviews/{id}/decision: REUSE (returns a `reuseRef`) or
// KEEP_SEPARATE. Errors: 409 DUPLICATE_REVIEW_STALE (the people found changed), DUPLICATE_REVIEW_RESOLVED,
// STRONG_IDENTIFIER_UNIQUE (an equal document is never kept separate); 422 JUSTIFICATION_REQUIRED,
// DUPLICATE_REVIEW_SIGNALS_MISMATCH, CANDIDATE_NOT_IN_REVIEW; 403 REUSE_TOKEN_INVALID; 404 DUPLICATE_REVIEW_NOT_FOUND.
export const decideDuplicateReview = async (
  reviewId: number,
  request: DuplicateDecisionRequest,
  config?: RequestConfig,
): Promise<DuplicateReview> => {
  const response = await httpClient.post<ApiResponse<DuplicateReview>>(
    `/api/people/duplicate-reviews/${reviewId}/decision`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/people/duplicate-reviews/{id}/view: the review as it is (send the signals to see
// the candidates of a pending one). Only whoever opened it, or the Admin.
export const viewDuplicateReview = async (
  reviewId: number,
  signals: PersonSignals,
  config?: RequestConfig,
): Promise<DuplicateReview> => {
  const response = await httpClient.post<ApiResponse<DuplicateReview>>(
    `/api/people/duplicate-reviews/${reviewId}/view`,
    signals,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the documents tab. GET /api/people/{personId}/documents: a person's documents, archived ones included.
export const listPersonDocuments = async (personId: number, config?: RequestConfig): Promise<PersonDocument[]> => {
  const response = await httpClient.get<ApiResponse<PersonDocument[]>>(`/api/people/${personId}/documents`, config)

  return unwrapApiResponse(response)
}

// USED by the documents tab. POST /api/people/{personId}/documents: registers a document (without the file yet).
// Errors 422: DOCUMENT_TYPE_INVALID, EXPIRY_NOT_APPLICABLE, DATES_INVALID.
export const createPersonDocument = async (
  personId: number,
  request: PersonDocumentRequest,
  config?: RequestConfig,
): Promise<PersonDocument> => {
  const response = await httpClient.post<ApiResponse<PersonDocument>>(
    `/api/people/${personId}/documents`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the documents tab. POST /api/people/{personId}/documents/{id}/file?version=n: sends (or replaces) the file,
// PDF, JPEG or PNG by its content, up to 10 MB. Errors: 428 VERSION_REQUIRED, 409 VERSION_CONFLICT, 413
// FILE_TOO_LARGE, 415 FILE_TYPE_NOT_ALLOWED, 422 FILE_REQUIRED, 503 STORAGE_DISABLED.
export const uploadPersonDocumentFile = async (
  personId: number,
  documentId: number,
  version: number,
  file: File,
  config?: RequestConfig,
): Promise<PersonDocument> => {
  const response = await httpClient.post<ApiResponse<PersonDocument>>(
    `/api/people/${personId}/documents/${documentId}/file`,
    toFileFormData(file),
    { ...config, params: { version } },
  )

  return unwrapApiResponse(response)
}

// USED by the documents tab. GET /api/people/{personId}/documents/{id}/download: a 5-minute link (never keep it);
// audited. 404 FILE_NOT_FOUND.
export const getPersonDocumentDownload = async (
  personId: number,
  documentId: number,
  config?: RequestConfig,
): Promise<PersonDocumentDownload> => {
  const response = await httpClient.get<ApiResponse<PersonDocumentDownload>>(
    `/api/people/${personId}/documents/${documentId}/download`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the documents tab. POST /api/people/{personId}/documents/{id}/archive?version=n: archives the document
// (never deletes it).
export const archivePersonDocument = async (
  personId: number,
  documentId: number,
  version: number,
  config?: RequestConfig,
): Promise<PersonDocument> => {
  const response = await httpClient.post<ApiResponse<PersonDocument>>(
    `/api/people/${personId}/documents/${documentId}/archive`,
    null,
    { ...config, params: { version } },
  )

  return unwrapApiResponse(response)
}

// USED by the profiles (Admin). POST /api/people/{id}/anonymize: erases an inactive person's personal data, with
// the protocol of the request; no way back. Errors 422: MUST_BE_INACTIVE, REQUEST_REF_REQUIRED,
// ADMIN_CANNOT_BE_ANONYMIZED; afterwards any change answers 409 PERSON_ANONYMIZED.
export const anonymizePerson = async (
  personId: number,
  request: AnonymizeRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post<ApiResponse<null>>(`/api/people/${personId}/anonymize`, request, config)
}

// USED by the profiles (Admin). GET /api/people/{id}/export: everything kept about the person, for the data
// subject's right of access; audited.
export const exportPerson = async (personId: number, config?: RequestConfig): Promise<Record<string, unknown>> => {
  const response = await httpClient.get<ApiResponse<Record<string, unknown>>>(`/api/people/${personId}/export`, config)

  return unwrapApiResponse(response)
}

// USED by the students page (Admin). POST /api/people/maintenance/draft-cleanup: runs now the removal of abandoned
// student drafts (no link, open invitation or document, older than 30 days).
export const cleanUpDraftStudents = async (config?: RequestConfig): Promise<{ removedDrafts: number }> => {
  const response = await httpClient.post<ApiResponse<{ removedDrafts: number }>>(
    "/api/people/maintenance/draft-cleanup",
    null,
    config,
  )

  return unwrapApiResponse(response)
}
