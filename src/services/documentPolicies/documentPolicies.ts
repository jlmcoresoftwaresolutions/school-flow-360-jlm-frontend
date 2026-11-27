import type {
  ApiResponse,
  DocumentPolicy,
  DocumentPolicyKind,
  DocumentPolicyState,
  DocumentPolicyWrite,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The document policy of each unit (backend DocumentPolicyController, docs/P06_CONTRATO.md, Fatia A): the
// Admin publishes and withdraws; the Admin and the Secretaria of the unit read. Coordenação, Financeiro and
// the other roles get 403.

// USED by the document requirements page (unit policies tab). GET /api/document-policies?unitId=: the policies of
// the scope the person reads, withdrawn ones included.
export const listDocumentPolicies = async (unitId?: number, config?: RequestConfig): Promise<DocumentPolicy[]> => {
  const response = await httpClient.get<ApiResponse<DocumentPolicy[]>>("/api/document-policies", {
    ...config,
    params: { unitId },
  })

  return unwrapApiResponse(response)
}

// USED by the document requirements page (unit policies tab). GET /api/document-policies/state: the state of
// one scope (PENDING, NO_BLOCKING, USE_CATALOG or INCONSISTENT). Errors: 404 for a unit out of reach.
export const getDocumentPolicyState = async (
  unitId: number,
  stageId: number,
  kind: DocumentPolicyKind,
  config?: RequestConfig,
): Promise<DocumentPolicyState> => {
  const response = await httpClient.get<ApiResponse<DocumentPolicyState>>("/api/document-policies/state", {
    ...config,
    params: { kind, stageId, unitId },
  })

  return unwrapApiResponse(response)
}

// USED by the document requirements page (unit policies tab). PUT /api/document-policies: the Admin publishes a
// scope. Errors: 422 DOCUMENT_POLICY_INVALID (the declaration disagrees with the catalog), 428
// VERSION_REQUIRED, 409 VERSION_CONFLICT, DOCUMENT_POLICY_DUPLICATE (published by someone else meanwhile).
export const publishDocumentPolicy = async (
  request: DocumentPolicyWrite,
  config?: RequestConfig,
): Promise<DocumentPolicy> => {
  const response = await httpClient.put<ApiResponse<DocumentPolicy>>("/api/document-policies", request, config)

  return unwrapApiResponse(response)
}

// USED by the document requirements page (unit policies tab). POST /api/document-policies/{id}/withdraw: the
// Admin withdraws a policy; the scope is pending again and the row is kept. Errors: 404
// DOCUMENT_POLICY_NOT_FOUND, 409 VERSION_CONFLICT.
export const withdrawDocumentPolicy = async (
  policyId: number,
  version: number,
  config?: RequestConfig,
): Promise<DocumentPolicy> => {
  const response = await httpClient.post<ApiResponse<DocumentPolicy>>(
    `/api/document-policies/${policyId}/withdraw`,
    { version },
    config,
  )

  return unwrapApiResponse(response)
}
