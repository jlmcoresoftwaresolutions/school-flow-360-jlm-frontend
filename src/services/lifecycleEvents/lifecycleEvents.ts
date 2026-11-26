import type {
  ApiResponse,
  LifecycleEvent,
  LifecycleEventAbandonRequest,
  LifecycleEventConfirmRequest,
  LifecycleEventPage,
  LifecycleEventPrepareRequest,
  LifecycleEventSearchParams,
  LifecycleEventType,
  LifecycleReason,
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

// NOT USED YET: no event can be confirmed until its financial part, policies and integrations exist (the
// screen shows the blockers instead). POST /api/lifecycle-events/{id}/confirm answers 422
// LIFECYCLE_CONFIRMATION_BLOCKED for now, changing nothing.
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
