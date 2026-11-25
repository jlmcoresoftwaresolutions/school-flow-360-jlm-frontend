import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { EnrollmentDocumentItem } from "@/models"
import { requestEnrollmentException } from "@/services/enrollmentDocuments"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../../shared/people/useFailureMessage"

export type RequestExceptionDialogProps = {
  enrollmentId: number
  item: EnrollmentDocumentItem
  // The exception was asked for, or the checklist changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
}

const reasonLimit = 500

// Asks for a documentary exception for a mandatory document that can't be presented now (decided by Lucas
// on 24/11/2026): the Secretaria or the Admin asks with a reason, and only the Admin decides, never the
// person who asked. Approved, it covers the line for 30 days at most; the line never shows as delivered.
// A legal obligation or the proof of representation can't be waived (the action doesn't even come).
export const RequestExceptionDialog = (props: RequestExceptionDialogProps) => {
  const { enrollmentId, item, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const target = item.personName ? `${item.label} · ${item.personName}` : item.label

  const confirm = async () => {
    setFailure("")
    if (reason.trim() === "") {
      setError(t("enrollments.exceptions.reasonRequired"))
      return
    }
    setIsSaving(true)
    try {
      await requestEnrollmentException(enrollmentId, {
        personId: item.personId ?? undefined,
        reason: reason.trim(),
        requirementId: item.requirementId,
      })
      toast.success(t("enrollments.exceptions.requested"))
      onChanged()
    } catch (failed) {
      switch (getErrorCode(failed)) {
        case "EXCEPTION_NOT_ALLOWED":
          setFailure(t("enrollments.exceptions.notAllowed"))
          break
        case "EXCEPTION_OPEN":
        case "EXCEPTION_NOT_NEEDED":
          toast.error(t("enrollments.exceptions.notNeeded"))
          onChanged()
          break
        default:
          setFailure(toFailureMessage(t("enrollments.exceptions.failed"), failed))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("enrollments.exceptions.request")}
      description={t("enrollments.exceptions.requestDescription")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("enrollments.exceptions.requestTitle", { name: target })}
      open
    >
      <Textarea
        error={error}
        maxLength={reasonLimit}
        onChange={(event) => {
          setReason(event.target.value)
          setError("")
        }}
        placeholder={t("enrollments.exceptions.reasonPlaceholder")}
        title={t("enrollments.exceptions.reason")}
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
