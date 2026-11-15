import type { ApiItemsPage, ApiPage } from "../httpClient/httpClient"

// One entry of the backend's audit trail (e.g. a unit deactivated, a branding published).
export type AuditEvent = {
  action: string
  actorUserId: number
  entityId: string
  entityType: string
  id: number
  occurredAt: string
  schoolUnitId: number
  tenantId: string
}

export type AuditEventPage = ApiPage<AuditEvent>

// GET /api/admin/audit's query: both filters are optional; the page defaults to 0 and the size to 20.
export type AuditEventSearchParams = {
  entityId?: string
  entityType?: string
  page?: number
  size?: number
}

// One event of the access audit (GET /api/audit): who did it (only the user's id), what, on which
// entity, in which unit, and when. Kept for 12 months and never changed; it never carries a secret.
export type AccessAuditEvent = {
  action: string
  actorUserId: number | null
  entityId: string | null
  entityType: string | null
  id: number
  occurredAt: string
  schoolUnitId: number | null
}

export type AccessAuditEventPage = ApiItemsPage<AccessAuditEvent>

// GET /api/audit's query. `from` and `to` are yyyy-MM-dd, at most 366 days apart (the last 30 days
// when left out).
export type AccessAuditSearchParams = {
  action?: string
  entityId?: string
  entityType?: string
  from?: string
  page?: number
  size?: number
  to?: string
}
