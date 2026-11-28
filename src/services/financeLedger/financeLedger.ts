import type {
  ApiResponse,
  FinanceAllocation,
  FinanceAllocationRequest,
  FinanceObligation,
  FinanceReceipt,
  FinanceReceiptPage,
  FinanceReceiptRequest,
  FinanceReceiptSearchParams,
  FinanceRegularizeRequest,
  FinanceTitleDetail,
  FinanceTitlePage,
  FinanceTitleSearchParams,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The core of the financial ledger (backend FinanceLedgerController, docs/P07_CONTRATO.md, Fatia 1). The
// Admin and the Financeiro of the unit operate; the Secretaria reads the titles, never the payments.

// USED by the enrollment page. POST /api/finance/obligations/regularize: regularizes one confirmed enrollment
// with no obligation yet. Errors: 409 FINANCE_ORIGIN_ALREADY_REGISTERED (goes to a check), 422
// FINANCE_ENROLLMENT_NOT_ELIGIBLE, FINANCE_PARTY_NOT_ELIGIBLE, FINANCE_AMOUNT_INVALID, 400.
export const regularizeFinanceObligation = async (
  request: FinanceRegularizeRequest,
  config?: RequestConfig,
): Promise<FinanceObligation> => {
  const response = await httpClient.post<ApiResponse<FinanceObligation>>(
    "/api/finance/obligations/regularize",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// NOT USED YET (the title detail brings its obligation). GET /api/finance/obligations/{id}.
export const getFinanceObligation = async (
  obligationId: number,
  config?: RequestConfig,
): Promise<FinanceObligation> => {
  const response = await httpClient.get<ApiResponse<FinanceObligation>>(
    `/api/finance/obligations/${obligationId}`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the tuition page. GET /api/finance/titles: the installments in reach, page by page.
export const listFinanceTitles = async (
  params?: FinanceTitleSearchParams,
  config?: RequestConfig,
): Promise<FinanceTitlePage> => {
  const response = await httpClient.get<ApiResponse<FinanceTitlePage>>("/api/finance/titles", { ...config, params })

  return unwrapApiResponse(response)
}

// USED by the title page. GET /api/finance/titles/{id}: the title, its obligation and (for the operations'
// readers) its allocations. Errors: 404 FINANCE_OBJECT_NOT_FOUND.
export const getFinanceTitle = async (titleId: number, config?: RequestConfig): Promise<FinanceTitleDetail> => {
  const response = await httpClient.get<ApiResponse<FinanceTitleDetail>>(`/api/finance/titles/${titleId}`, config)

  return unwrapApiResponse(response)
}

// USED by the receipts page. POST /api/finance/receipts: registers a manual receipt (REPORTED, still to be
// validated, or VALIDATED). Errors: 422 FINANCE_AMOUNT_INVALID, 400.
export const registerFinanceReceipt = async (
  request: FinanceReceiptRequest,
  config?: RequestConfig,
): Promise<FinanceReceipt> => {
  const response = await httpClient.post<ApiResponse<FinanceReceipt>>("/api/finance/receipts", request, config)

  return unwrapApiResponse(response)
}

// USED by the receipts page. POST /api/finance/receipts/{id}/validate: confirms a PENDING receipt. Errors:
// 409 FINANCE_RECEIPT_ALREADY_CONFIRMED.
export const validateFinanceReceipt = async (
  receiptId: number,
  intent: string,
  config?: RequestConfig,
): Promise<FinanceReceipt> => {
  const response = await httpClient.post<ApiResponse<FinanceReceipt>>(
    `/api/finance/receipts/${receiptId}/validate`,
    { intent },
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the receipts page and the allocation dialog. GET /api/finance/receipts: the receipts (Admin and
// Financeiro), with what was allocated and what is left.
export const listFinanceReceipts = async (
  params?: FinanceReceiptSearchParams,
  config?: RequestConfig,
): Promise<FinanceReceiptPage> => {
  const response = await httpClient.get<ApiResponse<FinanceReceiptPage>>("/api/finance/receipts", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// NOT USED YET (the list brings each receipt whole). GET /api/finance/receipts/{id}.
export const getFinanceReceipt = async (receiptId: number, config?: RequestConfig): Promise<FinanceReceipt> => {
  const response = await httpClient.get<ApiResponse<FinanceReceipt>>(`/api/finance/receipts/${receiptId}`, config)

  return unwrapApiResponse(response)
}

// USED by the title page. POST /api/finance/allocations: allocates part of a confirmed receipt to a title.
// Errors: 422 FINANCE_RECEIPT_NOT_CONFIRMED, FINANCE_TITLE_NOT_PAYABLE, FINANCE_UNIT_MISMATCH,
// FINANCE_ALLOCATION_EXCEEDS_RECEIPT, FINANCE_ALLOCATION_EXCEEDS_TITLE; 409 FINANCE_TITLE_VERSION_STALE.
export const allocateFinanceReceipt = async (
  request: FinanceAllocationRequest,
  config?: RequestConfig,
): Promise<FinanceAllocation> => {
  const response = await httpClient.post<ApiResponse<FinanceAllocation>>("/api/finance/allocations", request, config)

  return unwrapApiResponse(response)
}

// USED by the title page. POST /api/finance/allocations/{id}/reverse: internal compensation (the original
// is kept and marked, the title's residual comes back; never a refund). Errors: 409
// FINANCE_ALLOCATION_NOT_APPLIED.
export const reverseFinanceAllocation = async (
  allocationId: number,
  intent: string,
  reason: string,
  config?: RequestConfig,
): Promise<FinanceAllocation> => {
  const response = await httpClient.post<ApiResponse<FinanceAllocation>>(
    `/api/finance/allocations/${allocationId}/reverse`,
    { intent, reason },
    config,
  )

  return unwrapApiResponse(response)
}
