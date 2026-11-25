import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { DateInput } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { Enrollment } from "@/models"
import { saveEnrollmentStartDate } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { formatDate, fromIsoDate, toIsoDate } from "@/utils/dates"

import { PersonBlock } from "../shared/people/PersonBlock"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type EnrollmentStartDateProps = {
  enrollment: Enrollment
  // The enrollment was changed: read it again.
  onChanged: () => void
  onGone: () => void
}

// When the enrollment starts (decided by Lucas on 24/11/2026): today or a later day, within the period of
// the class chosen, never in the past (no retroactive start in the common flow). The class comes first;
// the server checks the day against its period. Editing happens in place, and a blank day takes the date
// back. Different from when the preparation was created and from when it is confirmed.
export const EnrollmentStartDate = (props: EnrollmentStartDateProps) => {
  const { enrollment, onChanged, onGone } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Date | null>(null)
  const [error, setError] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const saved = enrollment.startDate
  const canEdit = enrollment.eligibleActions.includes("SET_START_DATE")
  const hasClass = enrollment.classContext !== null
  const draftIso = draft ? toIsoDate(draft) : null
  const isChanged = isEditing && draftIso !== saved

  useUnsavedChanges(isChanged)

  const startEditing = () => {
    setDraft(saved ? fromIsoDate(saved) : null)
    setError("")
    setIsEditing(true)
  }

  const save = async () => {
    setError("")
    setIsSaving(true)
    try {
      await saveEnrollmentStartDate(enrollment.id, { startDate: draftIso, version: enrollment.version })
      toast.success(draftIso ? t("enrollments.startDate.saved") : t("enrollments.startDate.cleared"))
      setIsEditing(false)
      onChanged()
    } catch (failure) {
      const code = getErrorCode(failure)
      if (getErrorStatus(failure) === 404) {
        onGone()
      } else if (code === "ENROLLMENT_START_DATE_INVALID") {
        setError(t("enrollments.startDate.invalid"))
      } else if (code === "VERSION_CONFLICT") {
        setError(t("enrollments.startDate.conflict"))
        onChanged()
      } else if (code === "ENROLLMENT_NOT_IN_PREPARATION") {
        toast.error(t("enrollments.notInPreparation"))
        setIsEditing(false)
        onChanged()
      } else {
        setError(toFailureMessage(t("enrollments.startDate.failed"), failure))
      }
    } finally {
      setIsSaving(false)
    }
  }

  const renderAction = () => {
    if (!canEdit || isEditing) return null

    return (
      <Button disabled={!hasClass} onClick={startEditing} size="small">
        {saved ? t("enrollments.startDate.change") : t("enrollments.startDate.choose")}
      </Button>
    )
  }

  const renderReading = () => {
    if (saved) return <Text fontSize="sm">{formatDate(saved)}</Text>

    return (
      <Text color="secondary" fontSize="sm">
        {canEdit && !hasClass ? t("enrollments.startDate.classFirst") : t("enrollments.startDate.none")}
      </Text>
    )
  }

  return (
    <PersonBlock action={renderAction()} title={t("enrollments.startDate.title")}>
      <Text color="secondary" fontSize="sm">
        {t("enrollments.startDate.description")}
      </Text>

      {isEditing ? (
        <div style={{ display: "flex", flexDirection: "column", gap: spacing[12] }}>
          <DateInput
            clearLabel={t("people.form.clearDate")}
            error={error}
            helperText={t("enrollments.startDate.helper")}
            minDate={new Date()}
            onChange={(value) => {
              setDraft(value)
              setError("")
            }}
            placeholder={t("common.datePlaceholder")}
            title={t("enrollments.startDate.label")}
            value={draft}
          />
          <div style={{ display: "flex", gap: spacing[8], justifyContent: "flex-end" }}>
            <Button disabled={isSaving} onClick={() => setIsEditing(false)} size="small" variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button disabled={!isChanged || isSaving} onClick={() => void save()} size="small">
              {t("common.save")}
            </Button>
          </div>
        </div>
      ) : (
        renderReading()
      )}
    </PersonBlock>
  )
}
