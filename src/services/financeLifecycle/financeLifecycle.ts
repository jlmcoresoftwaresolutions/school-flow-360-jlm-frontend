import type {
  ApiResponse,
  FinanceCutDecision,
  FinanceCutDecisionRequest,
  FinanceCutReview,
  FinanceLifecycleReview,
  FinanceTransferReviewRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// What the financial module says about a lifecycle event (backend FinanceCutController,
// docs/P07_CONTRATO.md, Fatias 2 and 4). The Admin, the Financeiro and the Secretaria of the origin unit
// read; only the Admin and the Financeiro decide.

// USED by the lifecycle event page. GET /api/finance/lifecycle-events/{eventId}/cancellation-review: the cut
// of a cancellation analysed, nothing applied. Errors: 422 FINANCE_EVENT_NOT_OPEN (not a cancellation), 404
// FINANCE_OBJECT_NOT_FOUND, 403 FINANCE_ACCESS_DENIED.
export const getFinanceCancellationReview = async (
  eventId: number,
  config?: RequestConfig,
): Promise<FinanceCutReview> => {
  const response = await httpClient.get<ApiResponse<FinanceCutReview>>(
    `/api/finance/lifecycle-events/${eventId}/cancellation-review`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle event page. POST /api/finance/lifecycle-events/{eventId}/cut-decisions: decides an
// installment that crosses the cut. Errors: 403 FINANCE_DECISION_REQUIRES_ADMIN (CANCEL by the Financeiro),
// 422 FINANCE_CANCEL_NEEDS_UNPAID, FINANCE_DECISION_NOT_NEEDED, FINANCE_EVENT_NOT_OPEN, 409
// FINANCE_TITLE_VERSION_STALE, FINANCE_INTENT_REUSED, FINANCE_COMMAND_IN_PROGRESS.
export const decideFinanceCut = async (
  eventId: number,
  request: FinanceCutDecisionRequest,
  config?: RequestConfig,
): Promise<FinanceCutDecision> => {
  const response = await httpClient.post<ApiResponse<FinanceCutDecision>>(
    `/api/finance/lifecycle-events/${eventId}/cut-decisions`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle event page. GET /api/finance/lifecycle-events/{eventId}/financial-review: what the
// financial side says about a transfer, a re-enrollment or a lock. Errors: 404, 403 FINANCE_ACCESS_DENIED.
export const getFinanceLifecycleReview = async (
  eventId: number,
  config?: RequestConfig,
): Promise<FinanceLifecycleReview> => {
  const response = await httpClient.get<ApiResponse<FinanceLifecycleReview>>(
    `/api/finance/lifecycle-events/${eventId}/financial-review`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the lifecycle event page. POST /api/finance/lifecycle-events/{eventId}/transfer-review: the
// Financeiro (or the Admin) of the origin unit records the review of a transfer whose price, payer or
// conditions changed. Errors: 422 FINANCE_REVIEW_NOT_NEEDED, FINANCE_EVENT_NOT_OPEN, 403.
export const registerFinanceTransferReview = async (
  eventId: number,
  request: FinanceTransferReviewRequest,
  config?: RequestConfig,
): Promise<FinanceLifecycleReview> => {
  const response = await httpClient.post<ApiResponse<FinanceLifecycleReview>>(
    `/api/finance/lifecycle-events/${eventId}/transfer-review`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}
