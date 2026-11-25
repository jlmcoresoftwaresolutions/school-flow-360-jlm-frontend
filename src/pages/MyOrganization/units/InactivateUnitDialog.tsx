import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { SchoolUnit, SchoolUnitInactivation, SchoolUnitInactivationImpact } from "@/models"
import { getSchoolUnitInactivationImpact } from "@/services/organization"

import { inactivationReasonMaxLength } from "../MyOrganization.constants"
import type { SaveResult } from "../shared/saveResult"

export type InactivateUnitDialogProps = {
  unit: SchoolUnit
  onClose: () => void
  // "conflict" when the unit changed since its impact was read: `unit` then comes again as it is now,
  // and the impact is read again before the user confirms.
  onConfirm: (inactivation: SchoolUnitInactivation) => Promise<SaveResult>
}

// The impact of the inactivation: not read yet, read, or impossible to read.
type ImpactState = SchoolUnitInactivationImpact | "failed" | "loading"

// Inactivating a unit, which isn't deleting it: it leaves the options for new operations but stays in
// the organization's history. Rendered only while open. It first reads what the inactivation would
// affect (the users tied to the unit, who are not changed or blocked) and shows it, since the backend
// wants that acknowledged; until it is read - or if it can't be - the unit can't be inactivated. The
// reason is optional until a policy says when it is required (AC-F8-02), and nothing here promises a
// reactivation (none is approved). If the unit changed since the impact was read, the impact is read
// again and the user confirms once more, on what it is now, with the reason kept.
export const InactivateUnitDialog = (props: InactivateUnitDialogProps) => {
  const { onClose, onConfirm, unit } = props

  const { t } = useTranslation()

  const [impact, setImpact] = useState<ImpactState>("loading")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)
  // Bumped to read the impact again, after a conflict.
  const [impactReload, setImpactReload] = useState(0)

  const hasImpact = typeof impact !== "string"

  // Read inline in the effect (see MyOrganization.tsx); `ignore` drops an answer that arrives after the dialog
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
  }, [impactReload, unit.id])

  const handleConfirm = async () => {
    if (!hasImpact) return

    setIsSubmitting(true)

    const result = await onConfirm({
      confirmImpacts: impact.requiresConfirmation,
      reason: reason.trim(),
      version: impact.version,
    })

    setIsSubmitting(false)

    if (result === "saved") {
      onClose()
      return
    }

    if (result === "conflict") {
      setHasConflict(true)
      setImpact("loading")
      setImpactReload((current) => current + 1)
    }
  }

  const renderImpact = () => {
    if (impact === "loading") {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("myOrganization.units.inactivateImpactLoading")}
        </Text>
      )
    }

    if (impact === "failed") {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("myOrganization.units.inactivateImpactError")}
        </Text>
      )
    }

    const hasAcademicImpact = impact.liveClasses + impact.openTeacherLinks + impact.openPeriods > 0

    if (impact.assignedUsers === 0 && !hasAcademicImpact) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("myOrganization.units.inactivateImpactNone")}
        </Text>
      )
    }

    return (
      <>
        {impact.assignedUsers > 0 && (
          <Text color="warning" fontSize="sm" role="status">
            {t("myOrganization.units.inactivateImpactUsers", {
              assigned: impact.assignedUsers,
              enabled: impact.enabledAssignedUsers,
            })}
          </Text>
        )}
        {hasAcademicImpact && (
          <Text color="warning" fontSize="sm" role="status">
            {t("myOrganization.units.inactivateImpactAcademic", {
              classes: impact.liveClasses,
              links: impact.openTeacherLinks,
              periods: impact.openPeriods,
            })}
          </Text>
        )}
      </>
    )
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      closeLabel={t("common.close")}
      confirmDisabled={!hasImpact}
      confirmLabel={t("myOrganization.units.inactivate")}
      description={t("myOrganization.units.inactivateDescription", { name: unit.name })}
      loading={isSubmitting}
      onClose={onClose}
      onConfirm={() => void handleConfirm()}
      title={t("myOrganization.units.inactivateTitle")}
      tone="danger"
      open
    >
      {hasConflict && (
        <Text color="warning" fontSize="sm" role="alert">
          {t("myOrganization.units.inactivateConflict")}
        </Text>
      )}

      {renderImpact()}

      <Textarea
        helperText={t("myOrganization.validation.maxLength", { max: inactivationReasonMaxLength })}
        maxLength={inactivationReasonMaxLength}
        onChange={(event) => setReason(event.target.value)}
        placeholder={t("myOrganization.units.inactivationReasonPlaceholder")}
        title={t("myOrganization.units.inactivationReason")}
        value={reason}
      />
    </ConfirmDialog>
  )
}
