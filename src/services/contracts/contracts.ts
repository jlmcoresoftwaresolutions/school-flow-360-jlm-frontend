import type {
  ApiResponse,
  ContractAcceptanceRequest,
  ContractAcceptRequest,
  ContractPresentation,
  ContractTemplate,
  ContractTemplateDecision,
  ContractTemplateWrite,
  EnrollmentContract,
} from "@/models"

import { unwrapApiResponse } from "../httpClient/apiResponse"
import { httpClient, type RequestConfig } from "../httpClient/httpClient"

// The enrollment contract (backend ContractController, docs/P05_CONTRATO.md slice 3C). The models are read
// by the Admin and the Secretaria and written by the Admin only; the contract of an enrollment is operated
// by the Admin and the Secretaria of the unit (the Financeiro and the Coordenação get 403); the signer's
// two calls are public, by the token of the individual link.

// USED by the contract models page. GET /api/contract-templates: every version of the model.
export const listContractTemplates = async (config?: RequestConfig): Promise<ContractTemplate[]> => {
  const response = await httpClient.get<ApiResponse<ContractTemplate[]>>("/api/contract-templates", config)

  return unwrapApiResponse(response)
}

// USED by the contract models page. POST /api/contract-templates: a new draft (a new version of the model).
// Errors: 422 CONTRACT_FIELD_UNKNOWN (a {{field}} that doesn't exist, as a financial one).
export const createContractTemplate = async (
  request: ContractTemplateWrite,
  config?: RequestConfig,
): Promise<ContractTemplate> => {
  const response = await httpClient.post<ApiResponse<ContractTemplate>>("/api/contract-templates", request, config)

  return unwrapApiResponse(response)
}

// USED by the contract models page. PUT /api/contract-templates/{id}: edits a draft, with `version`.
// Errors: 409 CONTRACT_TEMPLATE_NOT_DRAFT, VERSION_CONFLICT; 422 CONTRACT_FIELD_UNKNOWN.
export const updateContractTemplate = async (
  templateId: number,
  request: ContractTemplateWrite,
  config?: RequestConfig,
): Promise<ContractTemplate> => {
  const response = await httpClient.put<ApiResponse<ContractTemplate>>(
    `/api/contract-templates/${templateId}`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the contract models page. POST /api/contract-templates/{id}/approve: approves a draft with the
// legal counsel's reference; the approved one before it is retired. Errors: 422 LEGAL_APPROVAL_REQUIRED;
// 409 CONTRACT_TEMPLATE_NOT_DRAFT, VERSION_CONFLICT.
export const approveContractTemplate = async (
  templateId: number,
  request: ContractTemplateDecision,
  config?: RequestConfig,
): Promise<ContractTemplate> => {
  const response = await httpClient.post<ApiResponse<ContractTemplate>>(
    `/api/contract-templates/${templateId}/approve`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the contract models page. POST /api/contract-templates/{id}/retire: retires the approved model.
// Errors: 409 CONTRACT_TEMPLATE_NOT_APPROVED, VERSION_CONFLICT.
export const retireContractTemplate = async (
  templateId: number,
  request: ContractTemplateDecision,
  config?: RequestConfig,
): Promise<ContractTemplate> => {
  const response = await httpClient.post<ApiResponse<ContractTemplate>>(
    `/api/contract-templates/${templateId}/retire`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's contract tab. POST /api/enrollments/{id}/contract: generates the contract from
// the approved model with what the enrollment keeps (the same text again gives the same contract).
// Errors: 409 CONTRACT_TEMPLATE_NOT_APPROVED, ENROLLMENT_NOT_IN_PREPARATION; 422 CONTRACT_NOT_READY.
export const generateEnrollmentContract = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentContract> => {
  const response = await httpClient.post<ApiResponse<EnrollmentContract>>(
    `/api/enrollments/${enrollmentId}/contract`,
    undefined,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's contract tab. GET /api/enrollments/{id}/contract: the current contract, its
// acceptances and who is still missing. Errors: 404 CONTRACT_NOT_FOUND (none generated yet).
export const getEnrollmentContract = async (
  enrollmentId: number,
  config?: RequestConfig,
): Promise<EnrollmentContract> => {
  const response = await httpClient.get<ApiResponse<EnrollmentContract>>(
    `/api/enrollments/${enrollmentId}/contract`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's contract tab. POST /api/enrollments/{id}/contract/acceptances: asks a signer (or
// every one missing) to accept by a 24-hour individual link; a resend replaces the pending request.
// Errors: 409 CONTRACT_NOT_GENERATED, CONTRACT_OUTDATED; 422 SIGNER_INVALID, SIGNER_WITHOUT_EMAIL.
export const requestContractAcceptance = async (
  enrollmentId: number,
  request: ContractAcceptanceRequest,
  config?: RequestConfig,
): Promise<EnrollmentContract> => {
  const response = await httpClient.post<ApiResponse<EnrollmentContract>>(
    `/api/enrollments/${enrollmentId}/contract/acceptances`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the enrollment's contract tab. POST /api/enrollments/{id}/contract/acceptances/{acceptanceId}/revoke:
// revokes a pending request (an acceptance done is evidence and stays). Errors: 409 ACCEPTANCE_NOT_PENDING.
export const revokeContractAcceptance = async (
  enrollmentId: number,
  acceptanceId: number,
  config?: RequestConfig,
): Promise<EnrollmentContract> => {
  const response = await httpClient.post<ApiResponse<EnrollmentContract>>(
    `/api/enrollments/${enrollmentId}/contract/acceptances/${acceptanceId}/revoke`,
    undefined,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the public acceptance page). GET /api/public/contract-acceptances/{token}: the exact text
// and its hash, without a login and with the tenant of the link. Opening is never accepting.
// Errors: 410 ACCEPTANCE_LINK_INVALID (expired, revoked, replaced, used or no longer the current one).
export const getContractPresentation = async (token: string, config?: RequestConfig): Promise<ContractPresentation> => {
  const response = await httpClient.get<ApiResponse<ContractPresentation>>(
    `/api/public/contract-acceptances/${encodeURIComponent(token)}`,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the public acceptance page). POST /api/public/contract-acceptances/{token}/accept: the
// express acceptance of the version shown. Errors: 422 ACCEPTANCE_CONFIRMATION_REQUIRED; 409
// CONTRACT_VERSION_CHANGED; 410 ACCEPTANCE_LINK_INVALID.
export const acceptContract = async (
  token: string,
  request: ContractAcceptRequest,
  config?: RequestConfig,
): Promise<void> => {
  await httpClient.post(`/api/public/contract-acceptances/${encodeURIComponent(token)}/accept`, request, config)
}
