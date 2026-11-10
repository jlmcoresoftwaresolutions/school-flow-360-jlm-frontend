import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { SchoolUnit } from "@/models"

import { notesMaxLength } from "../MyUnit.constants"

export type InactivateUnitDialogProps = {
  unit: SchoolUnit
  onClose: () => void
  onConfirm: (reason: string) => Promise<boolean>
}

// Inactivating a unit, which isn't deleting it: it leaves the options for new operations but stays in
// the organization's history. Rendered only while open. The reason is optional until a policy says
// when it is required (AC-F8-02), and nothing here promises a reactivation (none is approved).
export const InactivateUnitDialog = (props: InactivateUnitDialogProps) => {
  const { onClose, onConfirm, unit } = props

  const { t } = useTranslation()

  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)

    const done = await onConfirm(reason.trim())

    setIsSubmitting(false)
    if (done) onClose()
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      closeLabel={t("common.close")}
      confirmLabel={t("myUnit.units.inactivate")}
      description={t("myUnit.units.inactivateDescription", { name: unit.name })}
      loading={isSubmitting}
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t("myUnit.units.inactivateTitle")}
      tone="danger"
      open
    >
      <Textarea
        helperText={t("myUnit.validation.maxLength", { max: notesMaxLength })}
        maxLength={notesMaxLength}
        onChange={(event) => setReason(event.target.value)}
        title={t("myUnit.units.inactivationReason")}
        value={reason}
      />
    </ConfirmDialog>
  )
}
