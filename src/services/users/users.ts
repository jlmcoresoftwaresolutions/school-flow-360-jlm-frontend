import type {
  ApiResponse,
  InvitationView,
  NewUserRequest,
  ProfileUpdateRequest,
  RevokeAssignmentsRequest,
  TemporaryPassword,
  UserAssignmentsChange,
  UserAssignmentsRequest,
  UserPage,
  UserSearchParams,
  UserView,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The P02 user administration (backend docs/P02_CONTRATO.md, 4.2). Admin and Secretaria only: an Admin
// sees the whole tenant, a Secretaria only its units and never an Admin. The signed-in user is taken
// from the token. Every route may also answer 401 (no session) and 403 ACCESS_DENIED (a role without access to users).

// USED by the user list. GET /api/users: users in the operator's scope, paged; never returns a
// password. The list's users come without `eligibleActions` (only the detail has them).
export const listUsers = async (params?: UserSearchParams, config?: RequestConfig): Promise<UserPage> => {
  const response = await httpClient.get<ApiResponse<UserPage>>("/api/users", { ...config, params })

  return unwrapApiResponse(response)
}

// USED by the users and invitations pages. POST /api/users: manual registration. It creates the same 48 h invitation as
// POST /api/invitations (origin MANUAL), without a password: the person sets theirs on accepting.
// Send an `idempotencyKey` so a repeated click returns the same invitation. Errors: 409 USER_DUPLICATE,
// 409 INVITATION_PENDING, 403 ROLE_NOT_GRANTABLE, 422 UNIT_INACTIVE, 404 UNIT_NOT_FOUND, 400 INVALID_REQUEST.
export const createUser = async (request: NewUserRequest, config?: RequestConfig): Promise<InvitationView> => {
  const response = await httpClient.post<ApiResponse<InvitationView>>("/api/users", request, config)

  return unwrapApiResponse(response)
}

// USED by the user details. GET /api/users/{id}: one user, with the actions the operator may take on them
// (`eligibleActions`). Out of scope or missing: 404 USER_NOT_FOUND.
export const getUser = async (userId: number, config?: RequestConfig): Promise<UserView> => {
  const response = await httpClient.get<ApiResponse<UserView>>(`/api/users/${userId}`, config)

  return unwrapApiResponse(response)
}

// USED by the access change (user details). PUT /api/users/{id}/assignments: replaces the user's roles and units (with the version
// read) and ends the user's sessions. Errors: 409 VERSION_CONFLICT, 428 VERSION_REQUIRED, 409 LAST_ADMIN,
// 403 ROLE_NOT_GRANTABLE or SCOPE_DENIED, 422 UNIT_INACTIVE, 404 USER_NOT_FOUND.
export const updateUserAssignments = async (
  userId: number,
  request: UserAssignmentsRequest,
  config?: RequestConfig,
): Promise<UserAssignmentsChange> => {
  const response = await httpClient.put<ApiResponse<UserAssignmentsChange>>(
    `/api/users/${userId}/assignments`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the profile edit (user details). PUT /api/users/{id}/profile: changes a user's name and phone (nothing else), with the
// user's version. An Admin edits any account; a Secretaria only non-Admin accounts whose active units are
// all its own. Errors: 403 SCOPE_DENIED (an account shared with a unit out of reach), 404 USER_NOT_FOUND,
// 428 VERSION_REQUIRED, 409 VERSION_CONFLICT, 422 NAME_REQUIRED, 400 INVALID_REQUEST.
export const updateUserProfile = async (
  userId: number,
  request: ProfileUpdateRequest,
  config?: RequestConfig,
): Promise<UserView> => {
  const response = await httpClient.put<ApiResponse<UserView>>(`/api/users/${userId}/profile`, request, config)

  return unwrapApiResponse(response)
}

// USED by the access revocation (user details). POST /api/users/{id}/revoke: revokes some assignments, or all of them. Errors: 422
// IMPACTS_NOT_CONFIRMED without `confirm`, 404 ASSIGNMENT_NOT_FOUND, 409 LAST_ADMIN, 403 SCOPE_DENIED.
export const revokeUserAssignments = async (
  userId: number,
  request: RevokeAssignmentsRequest,
  config?: RequestConfig,
): Promise<UserAssignmentsChange> => {
  const response = await httpClient.post<ApiResponse<UserAssignmentsChange>>(
    `/api/users/${userId}/revoke`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the account status dialog (user details). POST /api/users/{id}/inactivate: turns the account off and ends its sessions;
// repeating it changes nothing. Errors: 409 LAST_ADMIN, 403 SCOPE_DENIED (not all of the user's units
// are in the operator's scope), 404 USER_NOT_FOUND.
export const inactivateUser = async (userId: number, config?: RequestConfig): Promise<UserView> => {
  const response = await httpClient.post<ApiResponse<UserView>>(`/api/users/${userId}/inactivate`, undefined, config)

  return unwrapApiResponse(response)
}

// USED by the account status dialog (user details). POST /api/users/{id}/reactivate: turns the account back on. Errors: 422
// NO_ACTIVE_ASSIGNMENT (the user has no active role left), 403 SCOPE_DENIED, 404 USER_NOT_FOUND.
export const reactivateUser = async (userId: number, config?: RequestConfig): Promise<UserView> => {
  const response = await httpClient.post<ApiResponse<UserView>>(`/api/users/${userId}/reactivate`, undefined, config)

  return unwrapApiResponse(response)
}

// USED by the temporary password dialog (user details). POST /api/users/{id}/temporary-password: a
// 14-character password, shown only in this answer, valid for 7 days; it ends the person's sessions
// and makes them create their own at the next sign-in. It also gives access to someone who had no
// password. Same reach as inactivating (the Admin, or a Secretaria for people only in its units).
// Errors: 422 OWN_ACCOUNT (the own account uses the password change), 403 SCOPE_DENIED, 404
// USER_NOT_FOUND.
export const issueTemporaryPassword = async (userId: number, config?: RequestConfig): Promise<TemporaryPassword> => {
  const response = await httpClient.post<ApiResponse<TemporaryPassword>>(
    `/api/users/${userId}/temporary-password`,
    undefined,
    config,
  )

  return unwrapApiResponse(response)
}
