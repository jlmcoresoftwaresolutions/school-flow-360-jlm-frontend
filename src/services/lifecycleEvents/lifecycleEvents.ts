import type {
  ApiResponse,
  LifecycleCapacityAuthorization,
  LifecycleCapacityPolicy,
  LifecycleCapacityPolicyWrite,
  LifecycleEvent,
  LifecycleEventAbandonRequest,
  LifecycleEventConfirmRequest,
  LifecycleEventPage,
  LifecycleEventPrepareRequest,
  LifecycleEventSearchParams,
  LifecycleEventType,
  LifecycleEvidence,
  LifecycleOutboxItem,
  LifecycleReason,
  LifecycleRectification,
  LifecycleRectifyRequest,
  LifecycleReturnRequest,
} from "@/models"

import type { RequestConfig } from "../httpClient"
import { httpClient, unwrapApiResponse } from "../httpClient"

// The lifecycle events of an enrollment (EPIC 7, backend docs/P06_CONTRATO.md, conferred on `cef9293`):
// prepare, read, give up and recover by intent. The Admin and the Secretaria operate (a transfer needs both
// units), the Coordenação and the Financeiro only read. An event outside both of the person's ends answers
// 404 LIFECYCLE_EVENT_NOT_FOUND, the same as one that doesn't exist. Preparing never changes the origin
// enrollment nor holds a seat.

// USED by the prepare dialog and the event page. GET /api/lifecycle-events/reasons?type=: the reasons of
// the event type in the current catalog version, and whether each asks for a justification.
export const listLifecycleReasons = async (
  type: LifecycleEventType,
  config?: RequestConfig,
): Promise<LifecycleReason[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleReason[]>>("/api/lifecycle-events/reasons", {
    ...config,
    params: { type },
  })

  return unwrapApiResponse(response)
}

// USED by the enrollment page (the events of its student). GET /api/lifecycle-events: the events in reach,
// paged, filtered by type, status and student.
export const listLifecycleEvents = async (
  params?: LifecycleEventSearchParams,
  config?: RequestConfig,
): Promise<LifecycleEventPage> => {
  const response = await httpClient.get<ApiResponse<LifecycleEventPage>>("/api/lifecycle-events", {
    ...config,
    params,
  })

  return unwrapApiResponse(response)
}

// USED by the prepare dialog. POST /api/lifecycle-events (201): prepares an event on an origin enrollment;
// a transfer or a re-enrollment also creates the destination preparation. Errors: 422
// LIFECYCLE_ORIGIN_NOT_ELIGIBLE, LIFECYCLE_REASON_INVALID, LIFECYCLE_DESTINATION_INVALID, UNIT_INACTIVE;
// 409 LIFECYCLE_EVENT_OPEN (another one is prepared on this origin), LIFECYCLE_INTENT_REUSED,
// ENROLLMENT_CONFLICT (a destination preparation without a class already exists there); 403 out of reach.
export const prepareLifecycleEvent = async (
  request: LifecycleEventPrepareRequest,
  config?: RequestConfig,
): Promise<LifecycleEvent> => {
  const response = await httpClient.post<ApiResponse<LifecycleEvent>>("/api/lifecycle-events", request, config)

  return unwrapApiResponse(response)
}

// USED by the event page. GET /api/lifecycle-events/{id}: the event with its blockers, consequences and
// actions, worked out now.
export const getLifecycleEvent = async (eventId: number, config?: RequestConfig): Promise<LifecycleEvent> => {
  const response = await httpClient.get<ApiResponse<LifecycleEvent>>(`/api/lifecycle-events/${eventId}`, config)

  return unwrapApiResponse(response)
}

// USED by the prepare dialog. GET /api/lifecycle-events/by-intent/{intent}: the event an intent already
// sent produced, so a lost answer is recovered without preparing again (404 when nothing was created).
export const getLifecycleEventByIntent = async (intent: string, config?: RequestConfig): Promise<LifecycleEvent> => {
  const response = await httpClient.get<ApiResponse<LifecycleEvent>>(
    `/api/lifecycle-events/by-intent/${encodeURIComponent(intent)}`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/abandon: gives a prepared event up, with a reason
// (1 to 500), and its destination preparation with it; the origin enrollment is never touched. Errors: 409
// LIFECYCLE_EVENT_NOT_PREPARED, 409 VERSION_CONFLICT.
export const abandonLifecycleEvent = async (
  eventId: number,
  request: LifecycleEventAbandonRequest,
  config?: RequestConfig,
): Promise<LifecycleEvent> => {
  const response = await httpClient.post<ApiResponse<LifecycleEvent>>(
    `/api/lifecycle-events/${eventId}/abandon`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/confirm: confirms the event in one local transaction
// (origin, destination, seat, number and the mandatory consequences together). Errors: 422
// LIFECYCLE_CONFIRMATION_BLOCKED (something still blocks it; nothing changed), 409 VERSION_CONFLICT,
// LIFECYCLE_EVENT_NOT_PREPARED, LIFECYCLE_INTENT_REUSED, 403 (a lock or an institutional cancellation by
// someone other than the Admin).
export const confirmLifecycleEvent = async (
  eventId: number,
  request: LifecycleEventConfirmRequest,
  config?: RequestConfig,
): Promise<LifecycleEvent> => {
  const response = await httpClient.post<ApiResponse<LifecycleEvent>>(
    `/api/lifecycle-events/${eventId}/confirm`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the units tab of Minha Organização and the event page. GET /api/lifecycle-events/capacity-policy?unitId=:
// whether the unit enabled the capacity exception for transfers and re-enrollments (Admin and Secretaria
// of the unit). Errors: 404 for a unit out of reach.
export const getLifecycleCapacityPolicy = async (
  unitId: number,
  config?: RequestConfig,
): Promise<LifecycleCapacityPolicy> => {
  const response = await httpClient.get<ApiResponse<LifecycleCapacityPolicy>>("/api/lifecycle-events/capacity-policy", {
    ...config,
    params: { unitId },
  })

  return unwrapApiResponse(response)
}

// USED by the units tab of Minha Organização. PUT /api/lifecycle-events/capacity-policy: the Admin publishes it
// per unit. Errors: 403, 428 VERSION_REQUIRED, 409 VERSION_CONFLICT.
export const publishLifecycleCapacityPolicy = async (
  request: LifecycleCapacityPolicyWrite,
  config?: RequestConfig,
): Promise<LifecycleCapacityPolicy> => {
  const response = await httpClient.put<ApiResponse<LifecycleCapacityPolicy>>(
    "/api/lifecycle-events/capacity-policy",
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/capacity-exception (201): the Admin authorizes one
// seat above the destination class's limit for this event (reason 1 to 500 characters). Errors: 403; 422
// CAPACITY_EXCEPTION_NOT_APPLICABLE, CAPACITY_EXCEPTION_DESTINATION_MISSING, CAPACITY_EXCEPTION_NOT_NEEDED,
// CAPACITY_EXCEPTION_CEILING; 409 CAPACITY_EXCEPTION_NOT_PUBLISHED, CAPACITY_EXCEPTION_DISABLED,
// CAPACITY_EXCEPTION_EXISTS, LIFECYCLE_EVENT_NOT_PREPARED.
export const authorizeLifecycleCapacity = async (
  eventId: number,
  reason: string,
  config?: RequestConfig,
): Promise<LifecycleCapacityAuthorization> => {
  const response = await httpClient.post<ApiResponse<LifecycleCapacityAuthorization>>(
    `/api/lifecycle-events/${eventId}/capacity-exception`,
    { reason },
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. GET /api/lifecycle-events/{id}/capacity-exception: the event's authorization and its
// status. Errors: 404 CAPACITY_EXCEPTION_NOT_FOUND (none was given), LIFECYCLE_EVENT_NOT_FOUND.
export const getLifecycleCapacityAuthorization = async (
  eventId: number,
  config?: RequestConfig,
): Promise<LifecycleCapacityAuthorization> => {
  const response = await httpClient.get<ApiResponse<LifecycleCapacityAuthorization>>(
    `/api/lifecycle-events/${eventId}/capacity-exception`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/return: returns a confirmed lock (the enrollment is
// active again), validated by the Coordenação of the unit or the Admin, recording when the family asked and
// the attendance's reference. Errors: 400 (no request day, a future one, no reference), 409
// LIFECYCLE_LOCK_NOT_RETURNABLE, VERSION_CONFLICT, LIFECYCLE_INTENT_REUSED; 422
// LIFECYCLE_CONFIRMATION_BLOCKED (institution or unit inactive, the return's text not published); 403.
export const returnLifecycleLock = async (
  eventId: number,
  request: LifecycleReturnRequest,
  config?: RequestConfig,
): Promise<LifecycleEvent> => {
  const response = await httpClient.post<ApiResponse<LifecycleEvent>>(
    `/api/lifecycle-events/${eventId}/return`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. GET /api/lifecycle-events/{id}/outbox: the diary projection and the notifications of
// a confirmed event (Secretaria and Admin of the units; others get 403).
export const listLifecycleOutbox = async (eventId: number, config?: RequestConfig): Promise<LifecycleOutboxItem[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleOutboxItem[]>>(
    `/api/lifecycle-events/${eventId}/outbox`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/outbox/{outboxId}/resend: sends one notification
// again, with no new event (Secretaria or Admin; up to 3 attempts, 10 minutes apart). Errors: 409
// NOTIFICATION_RESEND_LIMIT, NOTIFICATION_RESEND_TOO_SOON; 422 OUTBOX_NOT_RESENDABLE.
export const resendLifecycleNotification = async (
  eventId: number,
  outboxId: number,
  config?: RequestConfig,
): Promise<LifecycleOutboxItem> => {
  const response = await httpClient.post<ApiResponse<LifecycleOutboxItem>>(
    `/api/lifecycle-events/${eventId}/outbox/${outboxId}/resend`,
    {},
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/reprocess: the Admin applies again only what failed,
// after treating the cause, with the reason (3 to 300, audited); creates nothing new. Errors: 400, 403.
export const reprocessLifecycleEvent = async (
  eventId: number,
  reason: string,
  config?: RequestConfig,
): Promise<LifecycleOutboxItem[]> => {
  const response = await httpClient.post<ApiResponse<LifecycleOutboxItem[]>>(
    `/api/lifecycle-events/${eventId}/reprocess`,
    { reason },
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. POST /api/lifecycle-events/{id}/rectify: the Admin corrects the reason or the
// justification, as a new related fact. Errors: 422 LIFECYCLE_REASON_INVALID, 409 LIFECYCLE_EVENT_NOT_PREPARED
// (an abandoned event), 400 for an empty value or reason.
export const rectifyLifecycleEvent = async (
  eventId: number,
  request: LifecycleRectifyRequest,
  config?: RequestConfig,
): Promise<LifecycleRectification> => {
  const response = await httpClient.post<ApiResponse<LifecycleRectification>>(
    `/api/lifecycle-events/${eventId}/rectify`,
    request,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. GET /api/lifecycle-events/{id}/rectifications: the corrections of the event.
export const listLifecycleRectifications = async (
  eventId: number,
  config?: RequestConfig,
): Promise<LifecycleRectification[]> => {
  const response = await httpClient.get<ApiResponse<LifecycleRectification[]>>(
    `/api/lifecycle-events/${eventId}/rectifications`,
    config,
  )

  return unwrapApiResponse(response)
}

// USED by the event page. GET /api/lifecycle-events/{id}/evidence: what proves the event, exported by the
// Admin (audited) and downloaded as JSON on the spot.
export const getLifecycleEvidence = async (eventId: number, config?: RequestConfig): Promise<LifecycleEvidence> => {
  const response = await httpClient.get<ApiResponse<LifecycleEvidence>>(
    `/api/lifecycle-events/${eventId}/evidence`,
    config,
  )

  return unwrapApiResponse(response)
}
