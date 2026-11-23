import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicClass } from "@/models"
import { activateAcademicClass, getAcademicClassImpact, inactivateAcademicClass } from "@/services/academicClasses"
import { getErrorCode, getErrorMessage } from "@/services/httpClient"

import { readDependencyMessage } from "../shared/academic/academicBlockers"
import { academicLimits } from "../shared/academic/academicLimits"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { AccessItem, AccessItems } from "../shared/userAccess/userAccess.styles"

export type ClassStateAction = "activate" | "inactivate"

export type ClassStateDialogProps = {
  action: ClassStateAction
  schoolClass: AcademicClass
  onChanged: () => void
  onClose: () => void
}

type ImpactState = { blockers: string[] } | { error: true } | null

// Activates a class (from preparation, or again after an inactivation) or inactivates it, with what the
// backend says about it read first: what stops activating it (the unit, the offer or the room inactive,
// the period closed, no capacity), or what blocks inactivating it (teacher links not ended, enrollments).
// The enrollment source is asked too: while it doesn't answer, an inactivation is blocked, because its
// silence doesn't prove the class has no students. The backend checks it all again on confirmation, and a
// refusal lists what it found. Inactivating takes an optional reason; nothing is deleted.
export const ClassStateDialog = (props: ClassStateDialogProps) => {
  const { action, onChanged, onClose, schoolClass } = props

  const { t } = useTranslation()
  const { blockerText } = useAcademicLabels()
  const toFailureMessage = useFailureMessage()

  const [impact, setImpact] = useState<ImpactState>(null)
  const [refusal, setRefusal] = useState<string[]>([])
  const [reason, setReason] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isInactivation = action === "inactivate"
  const listed = impact && "blockers" in impact ? impact.blockers : []
  const shown = refusal.length > 0 ? refusal : listed

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await getAcademicClassImpact(schoolClass.id, { showLoading: false })
        if (isStale) return
        setImpact({ blockers: isInactivation ? loaded.inactivationBlockers : loaded.activationImpediments })
      } catch {
        if (!isStale) setImpact({ error: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [isInactivation, schoolClass.id])

  const confirm = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      if (isInactivation) {
        await inactivateAcademicClass(schoolClass.id, {
          reason: reason.trim() || undefined,
          version: schoolClass.version,
        })
      } else {
        await activateAcademicClass(schoolClass.id, { version: schoolClass.version })
      }
      toast.success(t(`classes.state.${action}.done`, { name: schoolClass.name }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_DEPENDENCY_ACTIVE" || (code === "ACADEMIC_NOT_ELIGIBLE" && !isInactivation)) {
        const found = readDependencyMessage(getErrorMessage(error))
        if (found.length > 0) setRefusal(found)
        else setFailure(t("academic.catalogStatus.notEligible"))
      } else if (code === "ACADEMIC_SOURCE_UNAVAILABLE") {
        setFailure(t("classes.state.sourceUnavailable"))
      } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("classes.state.changedMeanwhile"))
        onChanged()
      } else if (code === "ACADEMIC_NOT_ELIGIBLE") {
        setFailure(t("academic.catalogStatus.notEligible"))
      } else {
        setFailure(toFailureMessage(t(`classes.state.${action}.failed`), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={impact === null || shown.length > 0}
      confirmLabel={t(`classes.state.${action}.confirm`)}
      description={t(`classes.state.${action}.description`)}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t(`classes.state.${action}.title`, { name: schoolClass.name })}
      tone={isInactivation ? "danger" : undefined}
      open
    >
      {impact === null && (
        <Text color="secondary" fontSize="sm" role="status">
          {t("academic.catalogStatus.impactLoading")}
        </Text>
      )}

      {impact && "error" in impact && (
        <Text color="warning" fontSize="sm" role="note">
          {t("academic.catalogStatus.impactFailed")}
        </Text>
      )}

      {shown.length > 0 && (
        <>
          <Text color="warning" fontSize="sm" role="note">
            {t(`classes.state.${action}.blocked`)}
          </Text>
          <AccessItems aria-label={t(`classes.state.${action}.blockersLabel`)}>
            {shown.map((blocker) => (
              <AccessItem key={blocker}>
                <Text fontSize="sm">{blockerText(blocker)}</Text>
              </AccessItem>
            ))}
          </AccessItems>
        </>
      )}

      {isInactivation && shown.length === 0 && impact !== null && (
        <Textarea
          helperText={t("classes.state.inactivate.reasonHelper")}
          maxLength={academicLimits.reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={t("classes.state.inactivate.reasonPlaceholder")}
          title={t("classes.state.inactivate.reason")}
          value={reason}
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
