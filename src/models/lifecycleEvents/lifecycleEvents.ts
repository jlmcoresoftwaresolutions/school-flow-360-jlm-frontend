import type { ApiItemsPage } from "../httpClient/httpClient"

// The lifecycle events of an enrollment (EPIC 7, backend docs/P06_CONTRATO.md): a transfer to another
// unit, a re-enrollment in a new period, a cancellation and a lock. An event is prepared, read, given up,
// recovered by its intent and confirmed in one local transaction (Fatia H); the confirmation answers 422
// LIFECYCLE_CONFIRMATION_BLOCKED, changing nothing, while something still blocks it (the policies the
// school publishes: financial, documents, contract, lock, capacity).
export type LifecycleEventType = "CANCELLATION" | "LOCK" | "REENROLLMENT" | "TRANSFER"

// PREPARED is open for review; CONFIRMED was confirmed; ABANDONED was given up.
export type LifecycleEventStatus = "ABANDONED" | "CONFIRMED" | "PREPARED"

// What the server lets the person do with the event: ABANDON and CONFIRM on a prepared one, where they
// operate (a transfer needs both units; CONFIRM comes even while blocked, so the screen can show why);
// RETURN on a confirmed lock not returned yet, for the Coordenação of the unit or the Admin. A lock, and a
// cancellation by institutional decision, are confirmed only by the Admin.
export type LifecycleEventAction = "ABANDON" | "CONFIRM" | "RETURN"

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
  confirmedBy: number | null
  consequences: LifecycleConsequence[]
  destinationEnrollmentId: number | null
  // The start date of the destination (yyyy-MM-dd), recorded on the confirmation.
  destinationStartDate: string | null
  destinationUnitId: number | null
  // A cancellation's effective date (yyyy-MM-dd), the cut the finance counts; null = the day it is confirmed.
  effectiveDate: string | null
  eligibleActions: LifecycleEventAction[]
  eventType: LifecycleEventType
  id: number
  intent: string
  justification: string | null
  // How many calendar days a lock was asked for.
  lockDays: number | null
  originEnrollmentId: number
  originUnitId: number
  preparedAt: string
  preparedBy: number | null
  reasonCatalogVersion: number
  reasonCode: string
  // When a confirmed lock was returned (the enrollment is active again).
  returnedAt: string | null
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
  // Cancellation only (yyyy-MM-dd): from 30 days before to 30 days after today; empty = the day it is confirmed.
  effectiveDate?: string
  eventType: LifecycleEventType
  intent: string
  justification?: string
  // Lock only: 1 to 366 calendar days, within the lock policy of the unit and stage.
  lockDays?: number
  originEnrollmentId: number
  reasonCode: string
}

// Body of POST /api/lifecycle-events/{id}/abandon: the reason (1 to 500 characters).
export type LifecycleEventAbandonRequest = {
  reason: string
  version: number
}

// Body of POST /api/lifecycle-events/{id}/confirm and /return: one intent per attempt the person
// understands as one (the same intent gives the same result back).
export type LifecycleEventConfirmRequest = {
  intent: string
  version: number
}

// Whether a unit lets the lifecycle events use the capacity exception (Fatia C, V47). `enabled` is false
// also when nothing was published; `version` and `publishedAt` are null then.
export type LifecycleCapacityPolicy = {
  enabled: boolean
  publishedAt: string | null
  unitId: number
  version: number | null
}

// Body of PUT /api/lifecycle-events/capacity-policy (Admin). `version` is required once the unit published.
export type LifecycleCapacityPolicyWrite = {
  enabled: boolean
  unitId: number
  version?: number
}

// AVAILABLE until used or 24 hours after the approval; CONSUMED once the confirmation takes the seat.
export type LifecycleCapacityAuthorizationStatus = "AVAILABLE" | "CONSUMED" | "EXPIRED"

// The one authorization of an event for a seat above the destination class's capacity (Admin, with a
// reason): tied to the event (its intent) and to the destination class, valid 24 hours, used once, and the
// class never goes above capacity + 1. Renewing it is preparing a new event.
export type LifecycleCapacityAuthorization = {
  authorizedAt: string
  authorizedBy: number | null
  classId: number
  eventId: number
  expiresAt: string
  id: number
  reason: string
  status: LifecycleCapacityAuthorizationStatus
}

// What comes after the commit of a confirmation (or of a lock's return): the projection in the class diary
// and one notification per signer or payer.
export type LifecycleOutboxConsumer = "DIARY" | "NOTIFICATION"

export type LifecycleOutboxKind = "CONFIRMATION" | "LOCK_RETURN"

export type LifecycleOutboxStatus = "APPLIED" | "FAILED" | "PENDING"

// An item of the outbox. `recipientEmail` comes masked; `lastErrorCode`: EMAIL_MISSING, TEMPLATE_MISSING,
// DELIVERY_FAILED... The diary stays PENDING until its module exists, never counted as applied.
export type LifecycleOutboxItem = {
  appliedAt: string | null
  attempts: number
  consumer: LifecycleOutboxConsumer
  id: number
  kind: LifecycleOutboxKind
  lastAttemptAt: string | null
  lastErrorCode: string | null
  recipientEmail: string | null
  recipientId: number | null
  status: LifecycleOutboxStatus
}

// What a rectification may correct: only the reason or the justification, never the state, the seat, the
// number or the financial effect.
export type LifecycleRectifiableField = "JUSTIFICATION" | "REASON"

// A correction of an event: a new related fact; the original stays in the event.
export type LifecycleRectification = {
  field: LifecycleRectifiableField
  id: number
  newValue: string
  oldValue: string | null
  reason: string
  rectifiedAt: string
  rectifiedBy: number | null
}

// Body of POST /api/lifecycle-events/{id}/rectify (Admin): the new value (a reason code of the event's
// catalog, or a justification up to 500) and why it is corrected (1 to 500).
export type LifecycleRectifyRequest = {
  field: LifecycleRectifiableField
  newValue: string
  reason: string
}

// GET /api/lifecycle-events/{id}/evidence (Admin, audited): everything that proves the event.
export type LifecycleEvidence = Record<string, unknown>

// The maximum length of a lock, per unit and stage (Admin publishes; withdrawn = not active).
export type LifecycleLockPolicy = {
  active: boolean
  id: number
  maxDays: number
  note: string | null
  publishedAt: string
  stageId: number
  unitId: number
  version: number
}

// Body of PUT /api/lifecycle-policies/lock. `maxDays` 1 to 366, `note` up to 300.
export type LifecycleLockPolicyWrite = {
  maxDays: number
  note?: string
  stageId: number
  unitId: number
  version?: number
}

// The institutional rule that an event type changes no obligation, payment or instrument, for one offer of
// the unit (or the whole unit, `offerId` null). It is what lifts FINANCIAL_POLICY_PENDING today.
export type LifecycleNoEffectRule = {
  active: boolean
  eventType: LifecycleEventType
  evidence: string
  id: number
  offerId: number | null
  publishedAt: string
  ruleRef: string
  unitId: number
  version: number
}

// Body of PUT /api/lifecycle-policies/financial-no-effect. `ruleRef` up to 200, `evidence` up to 500.
export type LifecycleNoEffectRuleWrite = {
  eventType: LifecycleEventType
  evidence: string
  offerId?: number
  ruleRef: string
  unitId: number
  version?: number
}

// Which notification a text is for: one per event type, plus the lock's return.
export type LifecycleTemplateType = LifecycleEventType | "LOCK_RETURN"

// The subject and text of a notification, published data the Admin edits.
export type LifecycleNotificationTemplate = {
  body: string
  eventType: LifecycleTemplateType
  subject: string
  updatedAt: string | null
  version: number
}

// Body of PUT /api/lifecycle-policies/notification-templates/{eventType}: subject up to 160, text up to 4000.
export type LifecycleNotificationTemplateWrite = {
  body: string
  subject: string
  version: number
}
