import type { AccessMatrix, AccessMatrixSearchParams, ApiResponse } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// NOT USED YET. GET /api/access-matrix: the responsibilities matrix v2.0 (364 rows, screen and action
// by role), read-only, for Admin and Secretaria only. Reading it grants nothing: the backend decides
// every call. Errors: 401 without a session, 403 for the other roles, 400 for an unknown role.
export const getAccessMatrix = async (
  params?: AccessMatrixSearchParams,
  config?: RequestConfig,
): Promise<AccessMatrix> => {
  const response = await httpClient.get<ApiResponse<AccessMatrix>>("/api/access-matrix", { ...config, params })

  return unwrapApiResponse(response)
}
