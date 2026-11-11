import type { ApiResponse, TenantRegistrationRequest } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient } from "../httpClient"

// NOT USED YET. POST /api/tenants/register: opens a new school (tenant). Nothing in the app signs a
// school up today (tenants are provisioned by the product team), so no screen calls it.
export const registerTenant = async (request: TenantRegistrationRequest, config?: RequestConfig): Promise<void> => {
  await httpClient.post<ApiResponse<null>>("/api/tenants/register", request, config)
}
