// What the financial module says about a lifecycle event (EPIC 8, backend docs/P07_CONTRATO.md, Fatias 2
// and 4): the cancellation cut, with the decisions on the installments that cross it, and the review of a
// transfer, a re-enrollment or a lock of an enrollment with an obligation.

// How an installment fares in a cancellation: PRESERVE stays due (paid, or of a competence that ended
// before the cut), CANCEL is cancelled on the confirmation (a later competence nobody paid),
// DECISION_REQUIRED waits for the Financeiro (the competence that contains the cut, or a later one with a
// payment). After the confirmation it shows what the installment became.
export type FinanceCutClassification = "CANCEL" | "CANCELLED" | "DECISION_REQUIRED" | "PRESERVE" | "SUBSTITUTED"

// KEEP_DUE: stays due as it is. CANCEL: a concession, only by the Admin of the institution (no limit
// published means R$ 0,00), never on an installment with a payment.
export type FinanceCutOutcome = "CANCEL" | "KEEP_DUE"

export type FinanceCutItem = {
  allocatedCents: number
  amountCents: number
  classification: FinanceCutClassification
  competence: string
  decision: FinanceCutOutcome | null
  decisionReason: string | null
  dueDate: string
  installmentNo: number
  needsDecision: boolean
  obligationId: number
  residualCents: number
  titleId: number
  titleVersion: number
}

// GET /api/finance/lifecycle-events/{eventId}/cancellation-review: the cut analysed, nothing applied. An
// enrollment with no obligation has no items (the published "no financial effect" rule answers then).
// `ready`: nothing waits for a decision.
export type FinanceCutReview = {
  cutDate: string
  enrollmentId: number
  eventId: number
  items: FinanceCutItem[]
  pendingDecisionCount: number
  preservedCents: number
  preservedCount: number
  ready: boolean
  toCancelCents: number
  toCancelCount: number
}

// Body of POST /api/finance/lifecycle-events/{eventId}/cut-decisions: the version of the installment that
// was reviewed and why (3 to 300).
export type FinanceCutDecisionRequest = {
  intent: string
  outcome: FinanceCutOutcome
  reason: string
  titleId: number
  titleVersion: number
}

export type FinanceCutDecision = {
  decidedBy: number | null
  eventId: number
  id: number
  outcome: FinanceCutOutcome
  reason: string
  review: FinanceCutReview
  titleId: number
  titleVersion: number
}

// What the financial side does with a transfer, a re-enrollment or a lock: the balance stays with the
// origin and the plan follows (TRANSFER_CONTINUES), the Financeiro reviewed a changed price, payer or
// condition (TRANSFER_REVIEWED), the new period's obligation is born with the confirmation
// (REENROLLMENT_NEW), or the obligation stays as it is (LOCK_KEEPS).
export type FinanceLifecycleMode = "LOCK_KEEPS" | "REENROLLMENT_NEW" | "TRANSFER_CONTINUES" | "TRANSFER_REVIEWED"

// GET /api/finance/lifecycle-events/{eventId}/financial-review. `handled` false: no obligation is involved,
// and the published "no financial effect" rule answers. `blockedCode`: DECISION_PENDING (the Financeiro
// must review the transfer) or PLAN_NOT_CHOSEN (the re-enrollment's plan); `message` is English, never shown.
export type FinanceLifecycleReview = {
  blockedCode: string | null
  destinationObligationId: number | null
  eventId: number
  eventType: string
  handled: boolean
  message: string | null
  mode: FinanceLifecycleMode | null
  originObligationId: number | null
  ready: boolean
  reference: string | null
  reviewRegistered: boolean
}

// Body of POST /api/finance/lifecycle-events/{eventId}/transfer-review: what was checked (3 to 300).
export type FinanceTransferReviewRequest = {
  intent: string
  reason: string
}
