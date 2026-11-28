import type { ApiItemsPage } from "../httpClient/httpClient"

// The core of the financial ledger (EPIC 8, backend docs/P07_CONTRATO.md, Fatia 1): an obligation and its
// installments (titles), the receipts and their allocations to the titles. Money is whole cents in BRL,
// dates are yyyy-MM-dd. Ids only: the student and the parties are read from the enrollment.

// OPEN, PARTIAL (paid in part), SATISFIED (paid), WRITTEN_OFF (the residual written off: not money),
// CANCELLED, SUBSTITUTED (replaced by an agreement). "Overdue" is a condition of the date, never a status.
export type FinanceTitleSituation = "CANCELLED" | "OPEN" | "PARTIAL" | "SATISFIED" | "SUBSTITUTED" | "WRITTEN_OFF"

export type FinanceTitle = {
  allocatedCents: number
  amountCents: number
  calculationMemory: string | null
  competence: string
  currency: string
  dueDate: string
  id: number
  installmentNo: number
  obligationId: number
  // From the day after the due date, while something is still owed.
  overdue: boolean
  partyPersonId: number | null
  residualCents: number
  situation: FinanceTitleSituation
  studentId: number
  unitId: number
  version: number
  writtenOffCents: number
}

export type FinanceTitlePage = ApiItemsPage<FinanceTitle>

// GET /api/finance/titles's query; the scope is applied before counting and paging.
export type FinanceTitleSearchParams = {
  dueFrom?: string
  dueTo?: string
  overdue?: boolean
  page?: number
  situation?: FinanceTitleSituation
  size?: number
  studentId?: number
  unitId?: number
}

// An obligation (one per formal origin: ENROLLMENT:{id}:CONFIRMATION, ENROLLMENT:{id}:REGULARIZATION,
// AGREEMENT:{id}) with its installments.
export type FinanceObligation = {
  basis: string | null
  createdAt: string
  currency: string
  enrollmentId: number | null
  id: number
  originRef: string
  partyPersonId: number | null
  status: string
  studentId: number
  titles: FinanceTitle[]
  totalCents: number
  unitId: number
}

// An allocation of a receipt to a title. COMPENSATED: reversed internally (the original is kept; never a
// refund to the payer).
export type FinanceAllocation = {
  amountCents: number
  compensatedAt: string | null
  compensatedBy: number | null
  compensationReason: string | null
  createdAt: string
  createdBy: number | null
  id: number
  receiptAvailableCents: number | null
  receiptId: number
  status: "APPLIED" | "COMPENSATED"
  titleId: number
  titleResidualCents: number | null
  titleSituation: FinanceTitleSituation | null
}

// GET /api/finance/titles/{id}: the title, its obligation and, for those who read the operations (not the
// Secretaria), its allocations.
export type FinanceTitleDetail = {
  allocations: FinanceAllocation[]
  obligation: FinanceObligation
  title: FinanceTitle
}

// How a manual receipt came in.
export type FinanceReceiptMethod = "BANK_TRANSFER" | "CARD_MACHINE" | "CASH" | "OTHER" | "PIX_MANUAL"

// PENDING: a report or a proof not validated yet, it satisfies nothing. CONFIRMED: it may be allocated.
export type FinanceReceiptStatus = "CONFIRMED" | "PENDING"

// What is registered: REPORTED (still to be validated) or VALIDATED (validated at once).
export type FinanceReceiptNature = "REPORTED" | "VALIDATED"

// A receipt: gross, fee (never the student's debt) and net, what the valid allocations take and what is
// left unallocated (never credit, donation or refund by itself).
export type FinanceReceipt = {
  allocatedCents: number
  allocations: FinanceAllocation[]
  currency: string
  evidenceNote: string | null
  feeCents: number
  grossCents: number
  id: number
  method: FinanceReceiptMethod | string
  netCents: number
  occurredOn: string
  payerPersonId: number | null
  registeredAt: string
  registeredBy: number | null
  source: string
  status: FinanceReceiptStatus
  unallocatedCents: number
  unitId: number
  validatedAt: string | null
  validatedBy: number | null
  version: number
}

export type FinanceReceiptPage = ApiItemsPage<FinanceReceipt>

export type FinanceReceiptSearchParams = {
  page?: number
  size?: number
  status?: FinanceReceiptStatus
  unitId?: number
}

// Body of POST /api/finance/obligations/regularize: one confirmed enrollment with no obligation yet, from
// what was checked (`basis`, 5 to 300). `historical`: an old one no longer in force.
export type FinanceRegularizeRequest = {
  basis: string
  enrollmentId: number
  firstDueDate: string
  historical?: boolean
  installments: number
  intent: string
  partyPersonId: number
  totalCents: number
}

// Body of POST /api/finance/receipts. `occurredOn` never in the future; `evidenceNote` 3 to 300.
export type FinanceReceiptRequest = {
  evidenceNote: string
  feeCents?: number
  grossCents: number
  intent: string
  method: FinanceReceiptMethod
  nature: FinanceReceiptNature
  occurredOn: string
  payerPersonId?: number
  unitId: number
}

// Body of POST /api/finance/allocations: `titleVersion` is the one the operator reviewed.
export type FinanceAllocationRequest = {
  amountCents: number
  intent: string
  receiptId: number
  titleId: number
  titleVersion: number
}
