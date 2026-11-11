import type { ApiPage } from "../httpClient/httpClient"

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
