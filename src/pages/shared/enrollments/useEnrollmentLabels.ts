import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type { EnrollmentKind, EnrollmentStage, EnrollmentStatus } from "@/models"

type BadgeTone = NonNullable<BadgeProps["tone"]>

const statusTones: Record<EnrollmentStatus, BadgeTone> = {
  ABANDONED: "neutral",
  ACTIVE: "success",
  BLOCKED: "danger",
  CANCELLED: "neutral",
  COMPLETED: "info",
  DRAFT: "warning",
  LOCKED: "neutral",
  PENDING: "warning",
  TRANSFERRED: "info",
}

// Every status an enrollment may have.
export const enrollmentStatuses = Object.keys(statusTones) as EnrollmentStatus[]

// The statuses the list filters by: the preparation, the confirmed enrollment and the abandoned one
// (the abandoned only come when asked for). The others come with later slices.
export const enrollmentFilterStatuses: EnrollmentStatus[] = ["DRAFT", "PENDING", "BLOCKED", "ACTIVE", "ABANDONED"]

// The statuses of a preparation: an enrollment not confirmed yet.
export const preparationStatuses: EnrollmentStatus[] = ["DRAFT", "PENDING", "BLOCKED"]

// The pendencies and history events the screen knows; anything else shows as it came.
const knownPendencies = [
  "CLASS_NOT_ELIGIBLE",
  "CONTRACT_PENDING",
  "DOCUMENTS_PENDING",
  "NO_CLASS",
  "NO_FINANCIAL_PARTY",
  "NO_PARTY",
  "NO_SEAT",
  "NO_SIGNATORY",
  "OCCUPANCY_UNAVAILABLE",
  "PARTY_LINK_ENDED",
  "START_DATE_INVALID",
  "START_DATE_MISSING",
  "STUDENT_NOT_ELIGIBLE",
] as const

const knownEvents = [
  "ABANDONED",
  "ABANDONED_CANCELLATION",
  "ABANDONED_LOCK",
  "ABANDONED_REENROLLMENT",
  "ABANDONED_TRANSFER",
  "ACCEPTANCE_REQUESTED",
  "ACCEPTANCE_RESENT",
  "ACCEPTANCE_REVOKED",
  "CONFIRMED",
  "CONTEXT_CHANGED",
  "CONTRACT_ACCEPTED",
  "CONTRACT_GENERATED",
  "DOCUMENT_APPROVED",
  "DOCUMENT_RECEIVED",
  "DOCUMENT_REJECTED",
  "EXCEPTION_APPROVED",
  "EXCEPTION_DENIED",
  "EXCEPTION_REQUESTED",
  "PARTIES_CHANGED",
  "PREPARATION_STARTED",
  "PREPARED_CANCELLATION",
  "PREPARED_LOCK",
  "PREPARED_REENROLLMENT",
  "PREPARED_TRANSFER",
  "START_DATE_CHANGED",
] as const

type KnownPendency = (typeof knownPendencies)[number]
type KnownEvent = (typeof knownEvents)[number]

const isKnownPendency = (code: string): code is KnownPendency => (knownPendencies as readonly string[]).includes(code)
const isKnownEvent = (code: string): code is KnownEvent => (knownEvents as readonly string[]).includes(code)

// The words and tones the enrollment screens share. A pendency is labeled by its code (the backend's
// message is English and never shown); an unknown one, or an unknown history event, shows its code.
export const useEnrollmentLabels = () => {
  const { i18n, t } = useTranslation()

  return {
    eventLabel: (action: string) => (isKnownEvent(action) ? t(`enrollments.events.${action}`) : action),
    formatMoment: (value: string) =>
      new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value)),
    kindLabel: (kind: EnrollmentKind) => t(`enrollments.kinds.${kind}`),
    pendencyLabel: (code: string) => (isKnownPendency(code) ? t(`enrollments.pendencyCodes.${code}`) : code),
    stageLabel: (stage: EnrollmentStage) => t(`enrollments.stages.${stage}`),
    statusLabel: (status: EnrollmentStatus) => t(`enrollments.statuses.${status}`),
    statusTone: (status: EnrollmentStatus) => statusTones[status],
  }
}
