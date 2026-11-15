import type { ApiItemsPage } from "../httpClient/httpClient"
import type { RoleCode } from "../users/users"

// PENDING becomes EXPIRED by itself after 48 h (the backend already reads an overdue PENDING as
// EXPIRED); resending one creates a new invitation and marks the old one SUPERSEDED.
export type InvitationStatus = "ACCEPTED" | "CANCELLED" | "EXPIRED" | "PENDING" | "SUPERSEDED"

// What happened to the e-mail, apart from the invitation's state: SENT only means the provider took
// it (not that it was delivered), UNKNOWN that the provider didn't answer in time.
export type InvitationChannelResult = "FAILED" | "REGISTERED" | "SENT" | "UNKNOWN"

// INVITE came from "Convidar usuário", MANUAL from the manual registration (the same invitation).
export type InvitationOrigin = "INVITE" | "MANUAL"

export type InvitationAssignment = {
  role: RoleCode
  unitId: number | null
}

export type InvitationView = {
  acceptedAt: string | null
  assignments: InvitationAssignment[]
  channelResult: InvitationChannelResult
  createdAt: string
  createdBy: number
  email: string
  expiresAt: string
  fullName: string | null
  id: number
  origin: InvitationOrigin
  phone: string | null
  status: InvitationStatus
}

export type InvitationPage = ApiItemsPage<InvitationView>

// GET /api/invitations's query. `q` searches the e-mail and the name.
export type InvitationSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  q?: string
  roleCode?: RoleCode
  size?: number
  sortBy?: string
  status?: InvitationStatus
  unitId?: number
}
