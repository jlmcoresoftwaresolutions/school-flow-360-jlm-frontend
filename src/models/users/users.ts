import type { ApiItemsPage } from "../httpClient/httpClient"

// The seven business roles of the P02 (backend docs/P02_CONTRATO.md). A person may hold several, each
// in its own assignment. The backend's legacy USER role is read as SECRETARIA and never comes back.
export type RoleCode = "ADMIN" | "ALUNO" | "COORDENACAO" | "FINANCEIRO" | "PROFESSOR" | "RESPONSAVEL" | "SECRETARIA"

export type AssignmentStatus = "ACTIVE" | "REVOKED"

// One role held in one unit. An Admin's assignment has no unit (its reach is the whole tenant). A unit
// turned inactive keeps the assignment but takes its access away (`unitStatus` INACTIVE, `operative`
// false) until the unit is reactivated.
export type Assignment = {
  assignmentId: number
  createdAt: string
  // In force: ACTIVE and, when tied to a unit, that unit is active.
  operative: boolean
  // Where it came from ("INVITATION", "MANUAL", "LEGACY_MIGRATION"...): for reading only.
  origin: string
  role: RoleCode
  status: AssignmentStatus
  unitId: number | null
  unitName: string | null
  // The unit's own status; null for the Admin's unit-less assignment.
  unitStatus: "ACTIVE" | "INACTIVE" | null
}

// A role to grant and the unit it is granted in (none for ADMIN), as the invitation, the manual
// registration and the assignments update take it.
export type AssignmentRequest = {
  roleCode: RoleCode
  schoolUnitId: number | null
}

// An account's state: LOCKED is a temporary block after repeated wrong passwords, separate from
// INACTIVE (turned off by an operator).
export type UserStatus = "ACTIVE" | "INACTIVE" | "LOCKED"

// What the signed-in operator may do to this user, as the backend decides it. EDIT_PROFILE (name and
// phone) comes for the person themselves, the Admin and a Secretaria in scope; on the own account a
// non-Admin gets only that one. TEMPORARY_PASSWORD comes for whoever manages the account, never on the
// own account (not even an Admin's).
export type UserAction =
  | "EDIT_ASSIGNMENTS"
  | "EDIT_PROFILE"
  | "INACTIVATE"
  | "REACTIVATE"
  | "REVOKE"
  | "TEMPORARY_PASSWORD"

// A user as GET /api/users and /api/users/{id} return it. Never carries a password. `nickname` is the
// sign-in name every account has; `email` is null for a person who signs in only with it.
export type UserView = {
  assignments: Assignment[]
  eligibleActions: UserAction[]
  email: string | null
  enabled: boolean
  fullName: string | null
  id: number
  locked: boolean
  nickname: string
  phone: string | null
  roles: RoleCode[]
  status: UserStatus
  version: number
}

export type UserPage = ApiItemsPage<UserView>

// GET /api/users's query. `q` searches the name and the e-mail.
export type UserSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  roleCode?: RoleCode
  size?: number
  sortBy?: string
  status?: "ACTIVE" | "INACTIVE"
  unitId?: number
}

// Body of POST /api/users (manual registration) and POST /api/invitations: both create an invitation
// (48 h, set by the system); the account only exists once the person accepts it and sets a password.
export type NewUserRequest = {
  assignments: AssignmentRequest[]
  email: string
  fullName?: string
  phone?: string
}

// Body of PUT /api/users/{id}/assignments: replaces the whole set, with the user's version.
export type UserAssignmentsRequest = {
  assignments: AssignmentRequest[]
  version: number
}

// Body of POST /api/users/{id}/revoke: some assignments, or all of them when `assignmentIds` is left
// out; `confirm` acknowledges the impact (without it, 422 IMPACTS_NOT_CONFIRMED).
export type RevokeAssignmentsRequest = {
  confirm: boolean
  assignmentIds?: number[]
}

// What a change of assignments did: the user after it, the assignments before and after (as text) and
// how many of the user's sessions were ended.
export type UserAssignmentsChange = {
  after: string[]
  before: string[]
  sessionsRevoked: number
  user: UserView
}

// What POST /api/users/{id}/temporary-password answers: the password, shown only in this answer and
// never again, and until when it works (7 days by default). The person must change it at the first
// sign-in.
export type TemporaryPassword = {
  expiresAt: string
  temporaryPassword: string
}
