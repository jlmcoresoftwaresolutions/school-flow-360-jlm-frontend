import type { AccessMatrix, ApiResponse } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// NOT USED YET. GET /api/access-matrix: what the backend enforces today, for any signed-in user to
// read (reading it grants nothing). `published` stays false until the matrix v2.0 (JLM-208) is
// approved. Errors: 401 without a session.
export const getAccessMatrix = async (config?: RequestConfig): Promise<AccessMatrix> => {
  const response = await httpClient.get<ApiResponse<AccessMatrix>>("/api/access-matrix", config)

  return unwrapApiResponse(response)
}
