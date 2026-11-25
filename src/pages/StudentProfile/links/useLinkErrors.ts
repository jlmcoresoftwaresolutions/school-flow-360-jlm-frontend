import { useTranslation } from "react-i18next"

import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useFailureMessage } from "../../shared/people/useFailureMessage"

// Where a refusal of a link or an invitation goes: a field of the form, a message for the whole form, or
// one of the outcomes the dialog handles itself (the link changed meanwhile, the student or the link is
// out of reach now, no answer came).
export type LinkFailure =
  | { field: LinkErrorField; kind: "field"; message: string }
  | { kind: "conflict" | "gone" | "noAnswer" | "stale"; message: string }
  | { kind: "form"; message: string }

export type LinkErrorField = "consent" | "email" | "endDate" | "guardian" | "reason" | "relationshipCode"

// The refusals of the links and the guardian invitations (P03 contract, slice 3), read by the stable
// code, never by the message.
export const useLinkErrors = () => {
  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  return (error: unknown): LinkFailure => {
    const field = (name: LinkErrorField, message: string): LinkFailure => ({ field: name, kind: "field", message })

    if (getErrorStatus(error) === undefined) return { kind: "noAnswer", message: t("guardianLinks.errors.noAnswer") }

    switch (getErrorCode(error)) {
      case "CONSENT_REQUIRED":
        return field("consent", t("guardianLinks.form.consentRequired"))
      case "RELATIONSHIP_INVALID":
        return field("relationshipCode", t("guardianLinks.form.relationshipRequired"))
      case "GUARDIAN_INACTIVE":
        return field("guardian", t("guardianLinks.errors.guardianInactive"))
      case "LINK_SELF":
        return field("guardian", t("guardianLinks.errors.linkSelf"))
      case "LINK_DUPLICATE":
        return field("guardian", t("guardianLinks.errors.linkDuplicate"))
      case "REUSE_TOKEN_INVALID":
        return field("guardian", t("guardianLinks.errors.reuseInvalid"))
      case "GUARDIAN_ALREADY_LINKED":
        return field("guardian", t("guardianLinks.errors.alreadyLinked"))
      case "GUARDIAN_HAS_ACCESS":
        return field("guardian", t("guardianLinks.errors.guardianHasAccess"))
      case "INVITATION_PENDING":
        return field("email", t("guardianLinks.errors.invitationPending"))
      case "USER_DUPLICATE":
        return field("email", t("guardianLinks.errors.userDuplicate"))
      case "REASON_REQUIRED":
        return field("reason", t("guardianLinks.end.reasonRequired"))
      case "END_BEFORE_START":
        return field("endDate", t("guardianLinks.end.endBeforeStart"))
      case "STUDENT_INACTIVE":
        return { kind: "form", message: t("guardianLinks.errors.studentInactive") }
      case "UNIT_REQUIRED":
        return { kind: "form", message: t("guardianLinks.errors.unitRequired") }
      case "UNIT_INACTIVE":
        return { kind: "form", message: t("guardianLinks.errors.unitInactive") }
      case "PERSON_ANONYMIZED":
        return { kind: "form", message: toFailureMessage("", error) }
      case "VERSION_CONFLICT":
        return { kind: "conflict", message: t("guardianLinks.errors.conflict") }
      case "LINK_ENDED":
        return { kind: "stale", message: t("guardianLinks.errors.linkEnded") }
      case "INVITATION_LINK_STATE_INVALID":
        return { kind: "stale", message: t("guardianLinks.errors.invitationStale") }
      case "PERSON_NOT_FOUND":
      case "LINK_NOT_FOUND":
        return { kind: "gone", message: t("guardianLinks.errors.gone") }
      default:
        if (getErrorStatus(error) === 404) return { kind: "gone", message: t("guardianLinks.errors.gone") }
        return { kind: "form", message: toFailureMessage(t("guardianLinks.errors.failed"), error) }
    }
  }
}
