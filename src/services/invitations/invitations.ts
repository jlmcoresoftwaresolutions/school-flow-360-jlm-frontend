import type { ApiResponse, InvitationPage, InvitationSearchParams, InvitationView, NewUserRequest } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P02 invitations (backend docs/P02_CONTRATO.md, 4.2). Admin and Secretaria only; a Secretaria only
// sees invitations granting something in her units, and never an Admin. An invitation is not a user:
// the account only exists once it is accepted. Every route may also answer 401 and 403 ACCESS_DENIED.

// NOT USED YET. GET /api/invitations: invitations in the operator's scope, paged.
export const listInvitations = async (
  params?: InvitationSearchParams,
  config?: RequestConfig,
): Promise<InvitationPage> => {
  const response = await httpClient.get<ApiResponse<InvitationPage>>("/api/invitations", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/invitations: invites a person (48 h, set by the system). Send an
// `idempotencyKey` so a repeated click returns the same invitation without a second e-mail. Errors:
// 409 USER_DUPLICATE, 409 INVITATION_PENDING (resend or cancel the open one), 403 ROLE_NOT_GRANTABLE,
// 422 UNIT_INACTIVE, 404 UNIT_NOT_FOUND, 400 INVALID_REQUEST (e.g. an Admin with a unit).
export const createInvitation = async (request: NewUserRequest, config?: RequestConfig): Promise<InvitationView> => {
  const response = await httpClient.post<ApiResponse<InvitationView>>("/api/invitations", request, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. GET /api/invitations/{id}. Out of scope or missing: 404 INVITATION_NOT_FOUND.
export const getInvitation = async (invitationId: number, config?: RequestConfig): Promise<InvitationView> => {
  const response = await httpClient.get<ApiResponse<InvitationView>>(`/api/invitations/${invitationId}`, config)

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/invitations/{id}/resend: sends a new invitation (only for a PENDING or
// EXPIRED one) and marks this one SUPERSEDED, so its link stops working. Answers the new invitation.
// Errors: 409 INVITATION_STATE_INVALID, 404 INVITATION_NOT_FOUND.
export const resendInvitation = async (invitationId: number, config?: RequestConfig): Promise<InvitationView> => {
  const response = await httpClient.post<ApiResponse<InvitationView>>(
    `/api/invitations/${invitationId}/resend`,
    undefined,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET. POST /api/invitations/{id}/cancel: only a PENDING invitation. Errors: 409
// INVITATION_STATE_INVALID, 404 INVITATION_NOT_FOUND.
export const cancelInvitation = async (invitationId: number, config?: RequestConfig): Promise<InvitationView> => {
  const response = await httpClient.post<ApiResponse<InvitationView>>(
    `/api/invitations/${invitationId}/cancel`,
    undefined,
    config,
  )

  return unwrapApiResponse(response)
}
