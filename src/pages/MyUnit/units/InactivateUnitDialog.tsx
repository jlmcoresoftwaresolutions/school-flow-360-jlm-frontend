import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { SchoolUnit, SchoolUnitInactivation, SchoolUnitInactivationImpact } from "@/models"
import { getSchoolUnitInactivationImpact } from "@/services/organization"

import { inactivationReasonMaxLength } from "../MyUnit.constants"

export type InactivateUnitDialogProps = {
  unit: SchoolUnit
  onClose: () => void
  onConfirm: (inactivation: SchoolUnitInactivation) => Promise<boolean>
}

// The impact of the inactivation: not read yet, read, or impossible to read.
type ImpactState = SchoolUnitInactivationImpact | "failed" | "loading"

// Inactivating a unit, which isn't deleting it: it leaves the options for new operations but stays in
// the organization's history. Rendered only while open. It first reads what the inactivation would
// affect (the users tied to the unit, who are not changed or blocked) and shows it, since the backend
// wants that acknowledged; until it is read - or if it can't be - the unit can't be inactivated. The
// reason is optional until a policy says when it is required (AC-F8-02), and nothing here promises a
// reactivation (none is approved).
export const InactivateUnitDialog = (props: InactivateUnitDialogProps) => {
  const { onClose, onConfirm, unit } = props

  const { t } = useTranslation()

  const [impact, setImpact] = useState<ImpactState>("loading")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasImpact = typeof impact !== "string"

  // Read inline in the effect (see MyUnit.tsx); `ignore` drops an answer that arrives after the dialog
  // was closed.
  useEffect(() => {
    let ignore = false

    const load = async () => {
      try {
        const loaded = await getSchoolUnitInactivationImpact(unit.id, { showLoading: false })

        if (!ignore) setImpact(loaded)
      } catch {
        if (!ignore) setImpact("failed")
      }
    }

    void load()

    return () => {
      ignore = true
    }
  }, [unit.id])

  const handleConfirm = async () => {
    if (!hasImpact) return

    setIsSubmitting(true)

    const done = await onConfirm({
      confirmImpacts: impact.requiresConfirmation,
      reason: reason.trim(),
      version: impact.version,
    })

    setIsSubmitting(false)
    if (done) onClose()
  }

  const renderImpact = () => {
    if (impact === "loading") {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("myUnit.units.inactivateImpactLoading")}
        </Text>
      )
    }

    if (impact === "failed") {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("myUnit.units.inactivateImpactError")}
        </Text>
      )
    }

    if (impact.assignedUsers === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("myUnit.units.inactivateImpactNone")}
        </Text>
      )
    }

    return (
      <Text color="warning" fontSize="sm" role="status">
        {t("myUnit.units.inactivateImpactUsers", {
          assigned: impact.assignedUsers,
          enabled: impact.enabledAssignedUsers,
        })}
      </Text>
    )
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      closeLabel={t("common.close")}
      confirmDisabled={!hasImpact}
      confirmLabel={t("myUnit.units.inactivate")}
      description={t("myUnit.units.inactivateDescription", { name: unit.name })}
      loading={isSubmitting}
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t("myUnit.units.inactivateTitle")}
      tone="danger"
      open
    >
      {renderImpact()}

      <Textarea
        helperText={t("myUnit.validation.maxLength", { max: inactivationReasonMaxLength })}
        maxLength={inactivationReasonMaxLength}
        onChange={(event) => setReason(event.target.value)}
        title={t("myUnit.units.inactivationReason")}
        value={reason}
      />
    </ConfirmDialog>
  )
}
