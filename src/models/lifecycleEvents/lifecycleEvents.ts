import type { ApiItemsPage } from "../httpClient/httpClient"

// The lifecycle events of an enrollment (EPIC 7, backend docs/P06_CONTRATO.md, foundation): a transfer to
// another unit, a re-enrollment in a new period, a cancellation and a lock. An event is prepared, read,
// given up and recovered by its intent; none is confirmed yet (the confirmation answers 422
// LIFECYCLE_CONFIRMATION_BLOCKED with what still blocks it, until the financial contract, the policies and
// the integrations are proven).
export type LifecycleEventType = "CANCELLATION" | "LOCK" | "REENROLLMENT" | "TRANSFER"

// PREPARED is open for review; CONFIRMED will come with the confirmation; ABANDONED was given up.
export type LifecycleEventStatus = "ABANDONED" | "CONFIRMED" | "PREPARED"

// What the server lets the person do with the event: only a prepared one, where they operate (a transfer
// needs both units). CONFIRM is offered so the screen can show why it is blocked.
export type LifecycleEventAction = "ABANDON" | "CONFIRM"

// What still stops the confirmation, read now (never stored). The `message` is the backend's own text
// (English): the screen labels each blocker by its code.
export type LifecycleBlocker = {
  code: string
  message: string
}

// Who reacts to the event once it is confirmed: the seat, the finance and (transfer, re-enrollment) the
// contract before the success; the class diary and the notification after it.
export type LifecycleConsumer = "CONTRACT" | "DIARY" | "FINANCIAL" | "NOTIFICATION" | "SEAT"

export type LifecycleConsequenceStatus = "APPLIED" | "FAILED" | "NOT_APPLICABLE" | "PENDING"

export type LifecycleConsequence = {
  attempts: number
  consumer: LifecycleConsumer
  lastErrorCode: string | null
  mandatory: boolean
  status: LifecycleConsequenceStatus
}

// A reason of the versioned catalog of an event type. `requiresJustification`: "Other" and the
// institutional decision ask for a short text (never sensitive data).
export type LifecycleReason = {
  catalogVersion: number
  code: string
  eventType: LifecycleEventType
  label: string
  requiresJustification: boolean
}

// An event as the list and the detail answer it. Ids only: the student and the enrollments are read from
// their own endpoints. `destinationEnrollmentId`: the destination preparation of a transfer or a
// re-enrollment (a normal enrollment in preparation, where the class is chosen).
export type LifecycleEvent = {
  abandonedAt: string | null
  abandonedBy: number | null
  abandonReason: string | null
  blockers: LifecycleBlocker[]
  confirmationAvailable: boolean
  confirmedAt: string | null
  consequences: LifecycleConsequence[]
  destinationEnrollmentId: number | null
  destinationUnitId: number | null
  eligibleActions: LifecycleEventAction[]
  eventType: LifecycleEventType
  id: number
  intent: string
  justification: string | null
  originEnrollmentId: number
  originUnitId: number
  preparedAt: string
  preparedBy: number | null
  reasonCatalogVersion: number
  reasonCode: string
  status: LifecycleEventStatus
  studentId: number
  version: number
}

export type LifecycleEventPage = ApiItemsPage<LifecycleEvent>

// GET /api/lifecycle-events's query: the events of the person's units (either end of a transfer).
export type LifecycleEventSearchParams = {
  direction?: "asc" | "desc"
  page?: number
  size?: number
  sortBy?: "id" | "preparedAt" | "status" | "updatedAt"
  status?: LifecycleEventStatus
  studentId?: number
  type?: LifecycleEventType
}

// Body of POST /api/lifecycle-events. `intent` is an opaque id made by the screen (1 to 64 characters), one
// per attempt the person understands as one: the same intent and content give the same event back.
// `destinationUnitId`: required for a transfer (another unit), optional for a re-enrollment (the origin's
// unit by default), never for a cancellation or a lock. `justification`: up to 500 characters.
export type LifecycleEventPrepareRequest = {
  destinationUnitId?: number
  eventType: LifecycleEventType
  intent: string
  justification?: string
  originEnrollmentId: number
  reasonCode: string
}

// Body of POST /api/lifecycle-events/{id}/abandon: the reason (1 to 500 characters).
export type LifecycleEventAbandonRequest = {
  reason: string
  version: number
}

// Body of POST /api/lifecycle-events/{id}/confirm.
export type LifecycleEventConfirmRequest = {
  intent: string
  version: number
}
