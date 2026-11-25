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

// SUCCESS: the action was done. DENIED: a signed-in person was refused with a 403 (action
// ACCESS_DENIED, entityType ENDPOINT, entityId the method and path). A refusal has no unit, so only an
// Admin sees them; a refusal answered with a 404 (to hide that something exists) isn't recorded.
export type AccessAuditResult = "DENIED" | "SUCCESS"

// One event of the access audit (GET /api/audit): who did it, what, on which entity, in which unit,
// with which result and when. Kept for 5 years (backend V38) and never changed; it never carries a secret. The
// audit is the Admin's only, so the actor's name and e-mail come filled in. `details` names the fields
// a change touched (e.g. "fields=fullName,phone"), never their values.
export type AccessAuditEvent = {
  action: string
  actorEmail: string | null
  actorName: string | null
  actorUserId: number | null
  details: string | null
  entityId: string | null
  entityType: string | null
  id: number
  occurredAt: string
  result: AccessAuditResult
  schoolUnitId: number | null
}

export type AccessAuditEventPage = ApiItemsPage<AccessAuditEvent>

// GET /api/audit's query. `from` and `to` are yyyy-MM-dd, at most 366 days apart (the last 30 days
// when left out).
export type AccessAuditSearchParams = {
  action?: string
  actorUserId?: number
  entityId?: string
  entityType?: string
  from?: string
  page?: number
  result?: AccessAuditResult
  schoolUnitId?: number
  size?: number
  to?: string
}
