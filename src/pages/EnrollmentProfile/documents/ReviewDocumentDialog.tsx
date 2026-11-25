import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { EnrollmentDocumentItem } from "@/models"
import { reviewEnrollmentDocument } from "@/services/enrollmentDocuments"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../../shared/people/useFailureMessage"

export type ReviewDocumentDialogProps = {
  decision: "APPROVE" | "REJECT"
  enrollmentId: number
  item: EnrollmentDocumentItem
  // The decision was saved, or the checklist changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
}

const reasonLimit = 500

// The school's check of a received document: approving it, or rejecting it with a reason, which the line
// then shows. An expired document can't be approved. Sending a new file puts the line back to received.
export const ReviewDocumentDialog = (props: ReviewDocumentDialogProps) => {
  const { decision, enrollmentId, item, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isReject = decision === "REJECT"
  const target = item.personName ? `${item.label} · ${item.personName}` : item.label

  const confirm = async () => {
    setFailure("")
    if (isReject && reason.trim() === "") {
      setError(t("enrollments.documents.rejectReasonRequired"))
      return
    }
    setIsSaving(true)
    try {
      await reviewEnrollmentDocument(enrollmentId, item.itemId as number, {
        decision,
        reason: reason.trim() || undefined,
        version: item.itemVersion as number,
      })
      toast.success(isReject ? t("enrollments.documents.rejected") : t("enrollments.documents.approved"))
      onChanged()
    } catch (failed) {
      const code = getErrorCode(failed)
      if (code === "VERSION_CONFLICT") {
        toast.error(t("enrollments.documents.conflict"))
        onChanged()
      } else if (code === "ENROLLMENT_DOCUMENT_INVALID") {
        setFailure(t("enrollments.documents.cantApprove"))
      } else {
        setFailure(toFailureMessage(t("enrollments.documents.failed"), failed))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={isReject ? t("enrollments.documents.reject") : t("enrollments.documents.approve")}
      description={
        isReject ? t("enrollments.documents.rejectDescription") : t("enrollments.documents.approveDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={
        isReject
          ? t("enrollments.documents.rejectTitle", { name: target })
          : t("enrollments.documents.approveTitle", { name: target })
      }
      tone={isReject ? "danger" : undefined}
      open
    >
      {isReject && (
        <Textarea
          error={error}
          maxLength={reasonLimit}
          onChange={(event) => {
            setReason(event.target.value)
            setError("")
          }}
          placeholder={t("enrollments.documents.rejectReasonPlaceholder")}
          title={t("enrollments.documents.rejectReason")}
          value={reason}
          required
        />
      )}
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
