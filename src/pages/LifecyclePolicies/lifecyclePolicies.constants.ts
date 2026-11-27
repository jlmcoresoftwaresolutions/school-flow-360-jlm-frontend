import type { LifecycleTemplateType } from "@/models"

// The backend's limits for a lock policy: 1 to 366 days, a note up to 300 characters.
export const lockLimits = { maxDays: 366, minDays: 1, note: 300 }

// The backend's limits for a "no financial effect" rule: the reference up to 200, the evidence up to 500.
export const noEffectLimits = { evidence: 500, ruleRef: 200 }

// The backend's limits for a notification's text: the subject up to 160, the text up to 4000.
export const templateLimits = { body: 4000, subject: 160 }

// The notifications, in the order the tab shows them: one per event type, plus a lock's return.
export const templateTypes: LifecycleTemplateType[] = [
  "TRANSFER",
  "REENROLLMENT",
  "CANCELLATION",
  "LOCK",
  "LOCK_RETURN",
]

// The fields a notification's text may use as {{field}} (the backend's contract fields, plus the event's
// date and the enrollment's number).
export const templateFields = ["student.name", "institution.name", "unit.name", "event.date", "enrollment.number"]
