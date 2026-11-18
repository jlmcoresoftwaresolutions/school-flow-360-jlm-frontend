import type {
  AccessAuditEventPage,
  AccessAuditSearchParams,
  ApiResponse,
  AuditEventPage,
  AuditEventSearchParams,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// USED by the audit page. GET /api/audit: the P02 access audit of the whole tenant, paged, for the Admin only.
// Errors: 401, 403 ACCESS_DENIED (any other role, the Secretaria included), 400 INVALID_REQUEST (a
// period over 366 days).
export const listAccessAuditEvents = async (
  params?: AccessAuditSearchParams,
  config?: RequestConfig,
): Promise<AccessAuditEventPage> => {
  const response = await httpClient.get<ApiResponse<AccessAuditEventPage>>("/api/audit", { ...config, params })

  return unwrapApiResponse(response)
}

// NOT USED, AND ON ITS WAY OUT (replaced by GET /api/audit). GET /api/admin/audit: the audit trail, paged (page 0 and size 20 by default) and
// optionally filtered by the kind and the id of the entity. ADMIN only. There is no access-logs screen
// wired to it yet ("Logs de Acesso" is still a blank page).
export const searchAuditEvents = async (
  params?: AuditEventSearchParams,
  config?: RequestConfig,
): Promise<AuditEventPage> => {
  const response = await httpClient.get<ApiResponse<AuditEventPage>>("/api/admin/audit", { ...config, params })

  return unwrapApiResponse(response)
}
