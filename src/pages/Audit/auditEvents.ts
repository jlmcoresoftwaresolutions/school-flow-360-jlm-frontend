// The kinds of event the access audit records (GET /api/audit), each an action on a kind of entity,
// as the backend writes them. The key names the event's label (audit.events.<key>) and the filter
// option; an event the list doesn't know is shown with its own codes. Sign-ins, sign-outs and session
// events are kept elsewhere by the backend and don't reach this audit.
export type AuditEventType = {
  action: string
  entityType: string
  key: AuditEventKey
}

export type AuditEventKey =
  | "accessDenied"
  | "accessRevoked"
  | "accountActivated"
  | "accountInactivated"
  | "accountReactivated"
  | "assignmentsChanged"
  | "brandingDraftSaved"
  | "brandingPublished"
  | "faviconSet"
  | "invitationAccepted"
  | "invitationCancelled"
  | "invitationCreated"
  | "invitationResent"
  | "invitationSuperseded"
  | "logoSet"
  | "organizationUpdated"
  | "profileUpdated"
  | "unitActivated"
  | "unitCreated"
  | "unitInactivated"
  | "unitUpdated"

export const auditEventTypes: AuditEventType[] = [
  { action: "ACCESS_DENIED", entityType: "ENDPOINT", key: "accessDenied" },
  { action: "INVITATION_CREATED", entityType: "INVITATION", key: "invitationCreated" },
  { action: "INVITATION_RESENT", entityType: "INVITATION", key: "invitationResent" },
  { action: "INVITATION_SUPERSEDED", entityType: "INVITATION", key: "invitationSuperseded" },
  { action: "INVITATION_CANCELLED", entityType: "INVITATION", key: "invitationCancelled" },
  { action: "INVITATION_ACCEPTED", entityType: "INVITATION", key: "invitationAccepted" },
  { action: "USER_ACTIVATED", entityType: "USER", key: "accountActivated" },
  { action: "ASSIGNMENTS_CHANGED", entityType: "USER", key: "assignmentsChanged" },
  { action: "ACCESS_REVOKED", entityType: "USER", key: "accessRevoked" },
  { action: "PROFILE_UPDATED", entityType: "USER", key: "profileUpdated" },
  { action: "USER_INACTIVATED", entityType: "USER", key: "accountInactivated" },
  { action: "USER_REACTIVATED", entityType: "USER", key: "accountReactivated" },
  { action: "UPDATE", entityType: "ORGANIZATION", key: "organizationUpdated" },
  { action: "CREATE", entityType: "SCHOOL_UNIT", key: "unitCreated" },
  { action: "UPDATE", entityType: "SCHOOL_UNIT", key: "unitUpdated" },
  { action: "DEACTIVATE", entityType: "SCHOOL_UNIT", key: "unitInactivated" },
  { action: "ACTIVATE", entityType: "SCHOOL_UNIT", key: "unitActivated" },
  { action: "UPDATE", entityType: "SCREEN_PREFERENCE", key: "brandingDraftSaved" },
  { action: "LOGO_SET", entityType: "SCREEN_PREFERENCE", key: "logoSet" },
  { action: "FAVICON_SET", entityType: "SCREEN_PREFERENCE", key: "faviconSet" },
  { action: "PUBLISH", entityType: "SCREEN_PREFERENCE", key: "brandingPublished" },
]

export const findAuditEventType = (action: string, entityType: string | null) =>
  auditEventTypes.find((type) => type.action === action && type.entityType === entityType)

// The changed fields an event names ("fields=fullName,phone"), never their values.
export const readChangedFields = (details: string | null): string[] => {
  const match = details?.match(/fields=([\w,]+)/)

  return match ? match[1].split(",").filter(Boolean) : []
}

// A day as the backend's filters take it (yyyy-MM-dd), in the user's own calendar (not UTC).
export const toApiDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

// The backend takes at most 366 days.
export const maxAuditPeriodDays = 366

export const daysBetween = (from: Date, to: Date) => Math.round((to.getTime() - from.getTime()) / 86_400_000)
