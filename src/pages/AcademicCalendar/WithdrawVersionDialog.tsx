import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicCalendarVersion } from "@/models"
import { withdrawAcademicCalendarVersion } from "@/services/academicCalendar"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { academicLimits } from "../shared/academic/academicLimits"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type WithdrawVersionDialogProps = {
  unitName: string
  version: AcademicCalendarVersion
  onChanged: () => void
  onClose: () => void
}

// Withdraws the published calendar of a unit, with a required reason: students and guardians stop seeing
// it, and the version is kept in the history (withdrawn), never deleted.
export const WithdrawVersionDialog = (props: WithdrawVersionDialogProps) => {
  const { onChanged, onClose, unitName, version } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [error, setError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    if (!reason.trim()) {
      setError(t("academicCalendar.withdraw.reasonRequired"))
      return
    }

    setIsSaving(true)
    setFailure("")
    try {
      await withdrawAcademicCalendarVersion(version.id, { reason: reason.trim(), version: version.version })
      toast.success(t("academicCalendar.withdraw.done", { unit: unitName }))
      onChanged()
    } catch (caught) {
      setIsSaving(false)
      const code = getErrorCode(caught)
      if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND" || code === "ACADEMIC_NOT_ELIGIBLE") {
        toast.error(t("academicCalendar.changedMeanwhile"))
        onChanged()
      } else if (getErrorStatus(caught) === 403) {
        setFailure(t("academicCalendar.publish.forbidden"))
      } else {
        setFailure(toFailureMessage(t("academicCalendar.withdraw.failed"), caught))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("academicCalendar.withdraw.confirm")}
      description={t("academicCalendar.withdraw.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("academicCalendar.withdraw.title", { number: version.versionNo, unit: unitName })}
      tone="danger"
      open
    >
      <Textarea
        error={error}
        maxLength={academicLimits.reason}
        onChange={(event) => {
          setReason(event.target.value)
          setError("")
        }}
        placeholder={t("academicCalendar.withdraw.reasonPlaceholder")}
        title={t("academicCalendar.withdraw.reason")}
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
