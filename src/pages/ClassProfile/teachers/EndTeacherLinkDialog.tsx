import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DateInput, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { AcademicTeacherLink } from "@/models"
import { endAcademicTeacherLink } from "@/services/academicClasses"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { academicLimits } from "../../shared/academic/academicLimits"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { todayIso, useCanBackdate } from "./teacherLinkForm"

export type EndTeacherLinkDialogProps = {
  link: AcademicTeacherLink
  unitId: number
  onChanged: () => void
  onClose: () => void
}

// Ends a teacher's link, with the reason and the last day (today to begin with, never before the start; a
// day in the past only for the Admin and the unit's Coordenação). Ending keeps who, when and why, deletes
// nothing and doesn't touch what the teacher produced; the teacher stops acting on the class the day after.
export const EndTeacherLinkDialog = (props: EndTeacherLinkDialogProps) => {
  const { link, onChanged, onClose, unitId } = props

  const { t } = useTranslation()
  const canBackdate = useCanBackdate(unitId)
  const toFailureMessage = useFailureMessage()

  const [endDate, setEndDate] = useState<Date | null>(() => fromIsoDate(todayIso()))
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<{ endDate?: string; reason?: string }>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const endIso = endDate ? toIsoDate(endDate) : ""
    const found: typeof errors = {}
    if (!endIso) found.endDate = t("classTeachers.end.endRequired")
    else if (endIso < link.startDate) found.endDate = t("classTeachers.form.endBeforeStart")
    else if (endIso < todayIso() && !canBackdate) found.endDate = t("classTeachers.form.pastNotAllowed")
    if (!reason.trim()) found.reason = t("classTeachers.end.reasonRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await endAcademicTeacherLink(link.id, { endDate: endIso, reason: reason.trim(), version: link.version })
      toast.success(t("classTeachers.end.done", { name: link.teacherName }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_INVALID_RANGE") {
        setErrors({ endDate: t("classTeachers.form.outOfPeriod") })
      } else if (code === "SCOPE_DENIED" || getErrorStatus(error) === 403) {
        setErrors({ endDate: t("classTeachers.form.pastNotAllowed") })
      } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND" || code === "ACADEMIC_NOT_ELIGIBLE") {
        toast.error(t("classTeachers.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("classTeachers.end.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("classTeachers.end.confirm")}
      description={t("classTeachers.end.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("classTeachers.end.title", { name: link.teacherName })}
      tone="danger"
      open
    >
      <DateInput
        clearLabel={t("people.form.clearDate")}
        error={errors.endDate}
        minDate={fromIsoDate(link.startDate)}
        onChange={(value) => {
          setEndDate(value)
          setErrors((current) => ({ ...current, endDate: undefined }))
        }}
        placeholder={t("common.datePlaceholder")}
        title={t("classTeachers.end.endDate")}
        value={endDate}
        required
      />

      <Textarea
        error={errors.reason}
        maxLength={academicLimits.reason}
        onChange={(event) => {
          setReason(event.target.value)
          setErrors((current) => ({ ...current, reason: undefined }))
        }}
        placeholder={t("classTeachers.end.reasonPlaceholder")}
        title={t("classTeachers.end.reason")}
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
