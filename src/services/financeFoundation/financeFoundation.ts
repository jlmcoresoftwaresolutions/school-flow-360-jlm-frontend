import type { ApiResponse, FinanceCapabilities, FinanceCommand } from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The foundation of the financial module (backend FinanceFoundationController, docs/P07_CONTRATO.md, Fatia 0).

// USED by the lifecycle event page. GET /api/finance/capabilities: what the person may do in the financial
// module (all false without access).
export const getFinanceCapabilities = async (config?: RequestConfig): Promise<FinanceCapabilities> => {
  const response = await httpClient.get<ApiResponse<FinanceCapabilities>>("/api/finance/capabilities", config)

  return unwrapApiResponse(response)
}

// USED by the financial commands, to recover a lost answer. GET /api/finance/commands/{intentId}: the stored
// result of an intent. Errors: 404 FINANCE_COMMAND_NOT_FOUND (nothing ran, or out of reach), 403
// FINANCE_ACCESS_DENIED.
export const getFinanceCommand = async (intentId: string, config?: RequestConfig): Promise<FinanceCommand> => {
  const response = await httpClient.get<ApiResponse<FinanceCommand>>(
    `/api/finance/commands/${encodeURIComponent(intentId)}`,
    config,
  )

  return unwrapApiResponse(response)
}
