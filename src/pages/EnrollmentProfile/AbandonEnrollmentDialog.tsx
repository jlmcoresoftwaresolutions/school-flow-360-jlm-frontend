import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { Enrollment } from "@/models"
import { abandonEnrollment } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type AbandonEnrollmentDialogProps = {
  enrollment: Enrollment
  // The enrollment changed (or was changed by someone else meanwhile): read it again.
  onChanged: () => void
  onClose: () => void
  onGone: () => void
}

const reasonMax = 500

// Gives a preparation up, with a reason (1 to 500 characters), confirmed first. It stays in the history as
// abandoned; it never touches a confirmed enrollment, the student or the guardians. A preparation changed
// or confirmed by someone else meanwhile is read again instead.
export const AbandonEnrollmentDialog = (props: AbandonEnrollmentDialogProps) => {
  const { enrollment, onChanged, onClose, onGone } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError(t("enrollments.abandon.reasonRequired"))
      return
    }

    setReasonError("")
    setFailure("")
    setIsSaving(true)
    try {
      await abandonEnrollment(enrollment.id, { reason: trimmed, version: enrollment.version })
      toast.success(t("enrollments.abandon.done"))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT" || code === "ENROLLMENT_NOT_IN_PREPARATION") {
        toast.error(t("enrollments.abandon.conflict"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("enrollments.abandon.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("enrollments.abandon.confirm")}
      description={t("enrollments.abandon.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("enrollments.abandon.title", { name: enrollment.student.name })}
      tone="danger"
      open
    >
      <Textarea
        error={reasonError}
        maxLength={reasonMax}
        onChange={(event) => {
          setReason(event.target.value)
          if (event.target.value.trim()) setReasonError("")
        }}
        placeholder={t("enrollments.abandon.reasonPlaceholder")}
        title={t("enrollments.abandon.reason")}
        value={reason}
        required
      />

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
