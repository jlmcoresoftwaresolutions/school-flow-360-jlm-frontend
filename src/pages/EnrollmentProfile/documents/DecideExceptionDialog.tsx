import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DateInput, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { EnrollmentDocumentException } from "@/models"
import { decideEnrollmentException } from "@/services/enrollmentDocuments"
import { getErrorCode } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"

import { useFailureMessage } from "../../shared/people/useFailureMessage"

export type DecideExceptionDialogProps = {
  decision: "APPROVE" | "DENY"
  enrollmentId: number
  exception: EnrollmentDocumentException
  label: string
  // The decision was saved, or the exception changed meanwhile: read again.
  onChanged: () => void
  onClose: () => void
}

const reasonLimit = 500

// The Admin's decision on a documentary exception (never the person who asked: the backend refuses it
// too). Approving gives 30 calendar days to regularize, never past the period's end; a due date here may
// only shorten them. The decision needs a reason.
export const DecideExceptionDialog = (props: DecideExceptionDialogProps) => {
  const { decision, enrollmentId, exception, label, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [errors, setErrors] = useState<{ dueDate?: string; reason?: string }>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isApprove = decision === "APPROVE"

  const confirm = async () => {
    setFailure("")
    if (reason.trim() === "") {
      setErrors({ reason: t("enrollments.exceptions.decisionReasonRequired") })
      return
    }
    setIsSaving(true)
    try {
      await decideEnrollmentException(enrollmentId, exception.id, {
        decision,
        dueDate: isApprove && dueDate ? toIsoDate(dueDate) : undefined,
        reason: reason.trim(),
        version: exception.version,
      })
      toast.success(isApprove ? t("enrollments.exceptions.approved") : t("enrollments.exceptions.denied"))
      onChanged()
    } catch (failed) {
      switch (getErrorCode(failed)) {
        case "EXCEPTION_SAME_PERSON":
          setFailure(t("enrollments.exceptions.samePerson"))
          break
        case "EXCEPTION_DEADLINE_INVALID":
          setErrors({ dueDate: t("enrollments.exceptions.deadlineInvalid") })
          break
        case "EXCEPTION_ALREADY_DECIDED":
        case "VERSION_CONFLICT":
          toast.error(t("enrollments.exceptions.alreadyDecided"))
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
      confirmLabel={isApprove ? t("enrollments.exceptions.approve") : t("enrollments.exceptions.deny")}
      description={
        isApprove ? t("enrollments.exceptions.approveDescription") : t("enrollments.exceptions.denyDescription")
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={
        isApprove
          ? t("enrollments.exceptions.approveTitle", { name: label })
          : t("enrollments.exceptions.denyTitle", { name: label })
      }
      tone={isApprove ? undefined : "danger"}
      open
    >
      <Text color="secondary" fontSize="sm">
        {t("enrollments.exceptions.requestedReason", { reason: exception.reason })}
      </Text>
      {isApprove && (
        <DateInput
          clearLabel={t("people.form.clearDate")}
          error={errors.dueDate}
          helperText={t("enrollments.exceptions.dueDateHelper")}
          minDate={new Date()}
          onChange={setDueDate}
          placeholder={t("common.datePlaceholder")}
          title={t("enrollments.exceptions.dueDate")}
          value={dueDate}
        />
      )}
      <Textarea
        error={errors.reason}
        maxLength={reasonLimit}
        onChange={(event) => {
          setReason(event.target.value)
          setErrors((current) => ({ ...current, reason: undefined }))
        }}
        placeholder={t("enrollments.exceptions.decisionReasonPlaceholder")}
        title={t("enrollments.exceptions.decisionReason")}
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
