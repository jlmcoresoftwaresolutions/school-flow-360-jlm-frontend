import { useTranslation } from "react-i18next"

import type { BadgeProps } from "@/ds-components/atoms"
import type {
  LifecycleConsequenceStatus,
  LifecycleConsumer,
  LifecycleEventStatus,
  LifecycleEventType,
  LifecycleReason,
} from "@/models"

type BadgeTone = NonNullable<BadgeProps["tone"]>

// Every event type, in the order the enrollment's menu offers them.
export const lifecycleEventTypes: LifecycleEventType[] = ["TRANSFER", "REENROLLMENT", "CANCELLATION", "LOCK"]

const statusTones: Record<LifecycleEventStatus, BadgeTone> = {
  ABANDONED: "neutral",
  CONFIRMED: "success",
  PREPARED: "warning",
}

const consequenceTones: Record<LifecycleConsequenceStatus, BadgeTone> = {
  APPLIED: "success",
  FAILED: "danger",
  NOT_APPLICABLE: "neutral",
  PENDING: "warning",
}

// The blockers and the reasons the screen knows; anything else shows as it came (an unknown reason with
// the catalog's own label).
const knownBlockers = [
  "CAPACITY_EXCEPTION_EXPIRED",
  "CONTRACT_ACCEPTANCE_PENDING",
  "CONTRACT_MODEL_NOT_APPROVED",
  "CONTRACT_MODEL_ROLES_MISSING",
  "CONTRACT_NOT_GENERATED",
  "CONTRACT_OUTDATED",
  "DESTINATION_ABANDONED",
  "DESTINATION_CLASS_MISSING",
  "DESTINATION_CLASS_NOT_OPEN",
  "DESTINATION_FULL",
  "DESTINATION_NOT_COMPATIBLE",
  "DESTINATION_UNIT_INACTIVE",
  "DOCUMENT_CHECKLIST_OPEN",
  "DOCUMENT_POLICY_INCONSISTENT",
  "DOCUMENT_POLICY_PENDING",
  "FINANCIAL_POLICY_PENDING",
  "INSTITUTION_INACTIVE",
  "INTEGRATION_NOT_PROVEN",
  "LOCK_POLICY_UNDEFINED",
  "ORIGIN_NOT_ELIGIBLE",
  "ORIGIN_UNIT_INACTIVE",
] as const

// The translation key of each reason of the catalog version 1, by "TYPE.CODE".
const reasonKeys = {
  "CANCELLATION.INSTITUTIONAL_DECISION": "lifecycle.reasons.CANCELLATION.INSTITUTIONAL_DECISION",
  "CANCELLATION.LEFT_INSTITUTION": "lifecycle.reasons.CANCELLATION.LEFT_INSTITUTION",
  "CANCELLATION.LEGITIMATED_REQUEST": "lifecycle.reasons.CANCELLATION.LEGITIMATED_REQUEST",
  "CANCELLATION.OTHER": "lifecycle.reasons.CANCELLATION.OTHER",
  "LOCK.LEGITIMATED_REQUEST": "lifecycle.reasons.LOCK.LEGITIMATED_REQUEST",
  "LOCK.OTHER": "lifecycle.reasons.LOCK.OTHER",
  "LOCK.TEMPORARY_IMPEDIMENT": "lifecycle.reasons.LOCK.TEMPORARY_IMPEDIMENT",
  "REENROLLMENT.CONTINUITY": "lifecycle.reasons.REENROLLMENT.CONTINUITY",
  "TRANSFER.ADDRESS_CHANGE": "lifecycle.reasons.TRANSFER.ADDRESS_CHANGE",
  "TRANSFER.FAMILY_REQUEST": "lifecycle.reasons.TRANSFER.FAMILY_REQUEST",
  "TRANSFER.OTHER": "lifecycle.reasons.TRANSFER.OTHER",
  "TRANSFER.PEDAGOGICAL_NEED": "lifecycle.reasons.TRANSFER.PEDAGOGICAL_NEED",
} as const

type KnownBlocker = (typeof knownBlockers)[number]

const isKnownBlocker = (code: string): code is KnownBlocker => (knownBlockers as readonly string[]).includes(code)

const isEventType = (value: string): value is LifecycleEventType => (lifecycleEventTypes as string[]).includes(value)

// The event type a history action names (PREPARED_TRANSFER, ABANDONED_LOCK...), if any.
export const eventTypeOfAction = (action: string): LifecycleEventType | null => {
  const type = action.replace(/^(PREPARED|ABANDONED|CONFIRMED)_/, "")
  return type !== action && isEventType(type) ? type : null
}

// The words and tones of the lifecycle events. A blocker is labeled by its code (the backend's message is
// English and never shown); a reason by its code within the event type, else the catalog's label.
export const useLifecycleLabels = () => {
  const { t } = useTranslation()

  const reasonLabel = (type: LifecycleEventType, code: string, reasons?: LifecycleReason[]) => {
    const key = `${type}.${code}`
    if (key in reasonKeys) return t(reasonKeys[key as keyof typeof reasonKeys])
    return reasons?.find((reason) => reason.code === code)?.label ?? code
  }

  return {
    blockerLabel: (code: string) => (isKnownBlocker(code) ? t(`lifecycle.blockers.${code}`) : code),
    consequenceStatusLabel: (status: LifecycleConsequenceStatus) => t(`lifecycle.consequenceStatuses.${status}`),
    consequenceStatusTone: (status: LifecycleConsequenceStatus) => consequenceTones[status] ?? "neutral",
    consumerLabel: (consumer: LifecycleConsumer) => t(`lifecycle.consumers.${consumer}`),
    reasonLabel,
    statusLabel: (status: LifecycleEventStatus) => t(`lifecycle.statuses.${status}`),
    statusTone: (status: LifecycleEventStatus) => statusTones[status] ?? "neutral",
    typeLabel: (type: LifecycleEventType) => t(`lifecycle.types.${type}`),
  }
}
