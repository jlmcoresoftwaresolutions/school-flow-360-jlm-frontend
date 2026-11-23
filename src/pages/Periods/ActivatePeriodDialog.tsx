import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicPeriod } from "@/models"
import { activateAcademicPeriod } from "@/services/academicPeriods"
import { getErrorCode } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type ActivatePeriodDialogProps = {
  period: AcademicPeriod
  onClose: () => void
  // Activated, or the list has to be read again (changed or gone meanwhile).
  onChanged: () => void
}

// Activates a configured period, confirmed first with what it means: the period starts to count, its
// units can get offers and classes, and it can't go back to configured - only be closed later.
export const ActivatePeriodDialog = (props: ActivatePeriodDialogProps) => {
  const { onChanged, onClose, period } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const activate = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      await activateAcademicPeriod(period.id, period.version)
      toast.success(t("periods.activate.done", { name: period.name }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("periods.changedMeanwhile"))
        onChanged()
      } else if (code === "ACADEMIC_NOT_ELIGIBLE") {
        setFailure(t("periods.activate.notEligible"))
      } else {
        setFailure(toFailureMessage(t("periods.activate.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("periods.activate.confirm")}
      description={t("periods.activate.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void activate()}
      title={t("periods.activate.title", { name: period.name })}
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
