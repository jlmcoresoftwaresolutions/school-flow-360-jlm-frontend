import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicPeriod, AcademicPeriodImpact } from "@/models"
import { closeAcademicPeriod, getAcademicPeriodImpact } from "@/services/academicPeriods"
import { getErrorCode } from "@/services/httpClient"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { AccessItem, AccessItems } from "../shared/userAccess/userAccess.styles"
import { periodLimits } from "./periodForm"

export type ClosePeriodDialogProps = {
  period: AcademicPeriod
  units: AcademicUnits
  onClose: () => void
  // Closed, or the list has to be read again (changed or gone meanwhile).
  onChanged: () => void
}

type ImpactState = { error: true; token: number } | { impact: AcademicPeriodImpact; token: number }

// Closes an active period, for good, with a reason (1 to 500 characters). The impact is read first: what
// still depends on the period (active classes, teacher links that have not ended) blocks the closing and is
// listed for the person to regularize; the backend checks it again on the confirmation. Closing deletes
// nothing: the classes, links and history stay available for consultation.
export const ClosePeriodDialog = (props: ClosePeriodDialogProps) => {
  const { onChanged, onClose, period, units } = props

  const { t } = useTranslation()
  const { blockerText } = useAcademicLabels(units)
  const toFailureMessage = useFailureMessage()

  const [reloadToken, setReloadToken] = useState(0)
  const [state, setState] = useState<ImpactState | null>(null)
  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const current = state?.token === reloadToken ? state : null
  const impact = current && "impact" in current ? current.impact : null
  const canClose = Boolean(impact?.canClose)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await getAcademicPeriodImpact(period.id, { showLoading: false })
        if (!isStale) setState({ impact: loaded, token: reloadToken })
      } catch {
        if (!isStale) setState({ error: true, token: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [period.id, reloadToken])

  const close = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError(t("periods.close.reasonRequired"))
      return
    }

    setIsSaving(true)
    setFailure("")
    try {
      await closeAcademicPeriod(period.id, { reason: trimmed, version: period.version })
      toast.success(t("periods.close.done", { name: period.name }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_DEPENDENCY_ACTIVE") {
        // Something new depends on the period: the impact is read again and listed.
        setFailure(t("periods.close.dependenciesChanged"))
        setReloadToken((value) => value + 1)
      } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("periods.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("periods.close.failed"), error))
      }
    }
  }

  const renderImpact = () => {
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("periods.close.impactLoading")}
        </Text>
      )
    }
    if (!impact) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("periods.close.impactFailed")}
        </Text>
      )
    }
    if (impact.canClose) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("periods.close.noBlockers", { count: impact.activeOffers })}
        </Text>
      )
    }

    return (
      <>
        <Text color="warning" fontSize="sm" role="note">
          {t("periods.close.blocked")}
        </Text>
        <AccessItems aria-label={t("periods.close.blockersLabel")}>
          {impact.blockers.map((blocker) => (
            <AccessItem key={blocker}>
              <Text fontSize="sm">{blockerText(blocker)}</Text>
            </AccessItem>
          ))}
        </AccessItems>
      </>
    )
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={!canClose}
      confirmLabel={t("periods.close.confirm")}
      description={t("periods.close.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void close()}
      title={t("periods.close.title", { name: period.name })}
      tone="danger"
      open
    >
      {renderImpact()}

      {canClose && (
        <Textarea
          error={reasonError}
          maxLength={periodLimits.reason}
          onChange={(event) => {
            setReason(event.target.value)
            if (event.target.value.trim()) setReasonError("")
          }}
          placeholder={t("periods.close.reasonPlaceholder")}
          title={t("periods.close.reason")}
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
