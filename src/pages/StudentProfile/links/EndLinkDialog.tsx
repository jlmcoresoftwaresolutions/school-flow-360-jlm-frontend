import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DateInput, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { StudentGuardianLink } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { endStudentGuardianLink, getStudentGuardianLink } from "@/services/studentGuardianLinks"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { linkLimits } from "./linkForm"
import { useLinkErrors } from "./useLinkErrors"

export type EndLinkDialogProps = {
  guardianName: string
  // The link is the only active one of an active student under 18: it can't be ended (DP-P03-02).
  isLastGuardian: boolean
  link: StudentGuardianLink
  onClose: () => void
  // The link was ended, or it has to be read again (ended or out of reach meanwhile).
  onChanged: () => void
}

// Ends a link, confirmed first, with the reason and the end date (today if left blank, never before the
// start). Ending cuts what the link allowed from then on (the guardian no longer sees the student nor
// answers for it); the link stays in the history, never deleted. The last guardian of an active student
// under 18 can't be ended, by anyone: another guardian is linked first. An adult may lose the last one.
export const EndLinkDialog = (props: EndLinkDialogProps) => {
  const { guardianName, isLastGuardian, link, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailure = useLinkErrors()

  const [reason, setReason] = useState("")
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [version, setVersion] = useState(link.version)
  const [lastGuardian, setLastGuardian] = useState(isLastGuardian)
  const [errors, setErrors] = useState<{ endDate?: string; reason?: string }>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const startDate = link.startDate ? fromIsoDate(link.startDate) : undefined

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const trimmedReason = reason.trim()
    const found: typeof errors = {}
    if (!trimmedReason) found.reason = t("guardianLinks.end.reasonRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await endStudentGuardianLink(link.id, {
        endDate: endDate ? toIsoDate(endDate) : undefined,
        reason: trimmedReason,
        version,
      })
      toast.success(t("guardianLinks.end.done", { name: guardianName }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "LAST_GUARDIAN") {
        // The screen thought otherwise (the birth date changed meanwhile, or the day it counts from).
        setLastGuardian(true)
        return
      }

      const result = toFailure(error)
      if (result.kind === "field") {
        setErrors({ [result.field === "endDate" ? "endDate" : "reason"]: result.message })
      } else if (result.kind === "conflict") {
        // Changed meanwhile: read again, so confirming again ends the current version knowingly.
        setFailure(t("guardianLinks.end.conflict"))
        try {
          const current = await getStudentGuardianLink(link.id, { showLoading: false })
          if (current.status === "ENDED") {
            toast.error(t("guardianLinks.errors.linkEnded"))
            onChanged()
          } else {
            setVersion(current.version)
          }
        } catch {
          // Reading it again failed too: the message already says what happened.
        }
      } else if (result.kind === "form") {
        setFailure(result.message)
      } else {
        toast.error(result.message)
        onChanged()
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={lastGuardian}
      confirmLabel={t("guardianLinks.end.confirm")}
      description={t("guardianLinks.end.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("guardianLinks.end.title", { name: guardianName })}
      tone="danger"
      open
    >
      {lastGuardian && (
        <Text as="p" color="warning" fontSize="sm" role="note">
          {t("guardianLinks.end.lastGuardian")}
        </Text>
      )}

      <Textarea
        error={errors.reason}
        maxLength={linkLimits.reasonMax}
        onChange={(event) => {
          setReason(event.target.value)
          if (event.target.value.trim()) setErrors((current) => ({ ...current, reason: undefined }))
        }}
        placeholder={t("guardianLinks.end.reasonPlaceholder")}
        title={t("guardianLinks.end.reason")}
        value={reason}
        required
      />

      <DateInput
        clearLabel={t("people.form.clearDate")}
        error={errors.endDate}
        helperText={t("guardianLinks.end.endDateHelper")}
        minDate={startDate}
        onChange={setEndDate}
        placeholder={t("common.datePlaceholder")}
        title={t("guardianLinks.end.endDate")}
        value={endDate}
      />

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
