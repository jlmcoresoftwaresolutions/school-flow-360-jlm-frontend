import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { GuardianInvitation } from "@/models"
import { confirmGuardianInvitation, rejectGuardianInvitation } from "@/services/students"

import { useLinkErrors } from "./useLinkErrors"

export type InvitationDecision = "confirm" | "reject"

export type InvitationDecisionDialogProps = {
  decision: InvitationDecision
  invitation: GuardianInvitation
  onClose: () => void
  // Decided, or the invitation has to be read again (decided by someone else, out of reach).
  onChanged: () => void
}

// The school's decision on a guardian who accepted the invitation (AWAITING_CONFIRMATION). Confirming
// makes the active link, with the relationship and the responsibilities of the invitation and the
// guardian's own consent; rejecting (the wrong person accepted it) makes no link, and the guardian's
// account stays.
export const InvitationDecisionDialog = (props: InvitationDecisionDialogProps) => {
  const { decision, invitation, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailure = useLinkErrors()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const name = invitation.guardianName ?? invitation.email

  const decide = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      if (decision === "confirm") await confirmGuardianInvitation(invitation.studentId, invitation.id)
      else await rejectGuardianInvitation(invitation.studentId, invitation.id)
      toast.success(t(`guardianLinks.decision.${decision}.done`, { name }))
      onChanged()
    } catch (error) {
      const result = toFailure(error)
      setIsSaving(false)
      if (result.kind === "stale" || result.kind === "gone" || result.kind === "noAnswer") {
        toast.error(result.message)
        onChanged()
      } else {
        setFailure(result.message)
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t(`guardianLinks.decision.${decision}.confirm`)}
      description={t(`guardianLinks.decision.${decision}.description`, { email: invitation.email, name })}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void decide()}
      title={t(`guardianLinks.decision.${decision}.title`, { name })}
      tone={decision === "reject" ? "danger" : undefined}
      open
    >
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
