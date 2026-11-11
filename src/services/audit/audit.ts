import type { ApiResponse, AuditEventPage, AuditEventSearchParams } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// NOT USED YET. GET /api/admin/audit: the audit trail, paged (page 0 and size 20 by default) and
// optionally filtered by the kind and the id of the entity. ADMIN only. There is no access-logs screen
// wired to it yet ("Logs de Acesso" is still a blank page).
export const searchAuditEvents = async (
  params?: AuditEventSearchParams,
  config?: RequestConfig,
): Promise<AuditEventPage> => {
  const response = await httpClient.get<ApiResponse<AuditEventPage>>("/api/admin/audit", { ...config, params })

  return unwrapApiResponse(response)
}
