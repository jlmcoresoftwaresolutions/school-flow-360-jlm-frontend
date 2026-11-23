import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { DateInput, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { StudentGuardianLink } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { endStudentGuardianLink, getStudentGuardianLink } from "@/services/studentGuardianLinks"
import { hasAnyRole } from "@/utils/access"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { linkLimits } from "./linkForm"
import { useLinkErrors } from "./useLinkErrors"

export type EndLinkDialogProps = {
  guardianName: string
  // The link is the only active one of an active student: ending it leaves the student without a guardian.
  isLastGuardian: boolean
  link: StudentGuardianLink
  onClose: () => void
  // The link was ended, or it has to be read again (ended or out of reach meanwhile).
  onChanged: () => void
}

// Ends a link, confirmed first, with the reason and the end date (today if left blank, never before the
// start). Ending cuts what the link allowed from then on (the guardian no longer sees the student nor
// answers for it); the link stays in the history, never deleted. The last guardian of an active student
// can't be ended - only the Admin may, giving the reason of the exception, which is recorded.
export const EndLinkDialog = (props: EndLinkDialogProps) => {
  const { guardianName, isLastGuardian, link, onChanged, onClose } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const toFailure = useLinkErrors()

  const [reason, setReason] = useState("")
  const [endDate, setEndDate] = useState<Date | null>(null)
  const [exceptionReason, setExceptionReason] = useState("")
  const [version, setVersion] = useState(link.version)
  const [lastGuardian, setLastGuardian] = useState(isLastGuardian)
  const [errors, setErrors] = useState<{ endDate?: string; exception?: string; reason?: string }>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const needsException = lastGuardian && isAdmin
  const startDate = link.startDate ? fromIsoDate(link.startDate) : undefined
  const exceptionMessage = t("students.state.exceptionInvalid", {
    max: linkLimits.exceptionMax,
    min: linkLimits.exceptionMin,
  })

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const trimmedReason = reason.trim()
    const trimmedException = exceptionReason.trim()
    const found: typeof errors = {}
    if (!trimmedReason) found.reason = t("guardianLinks.end.reasonRequired")
    if (
      needsException &&
      (trimmedException.length < linkLimits.exceptionMin || trimmedException.length > linkLimits.exceptionMax)
    ) {
      found.exception = exceptionMessage
    }
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await endStudentGuardianLink(link.id, {
        endDate: endDate ? toIsoDate(endDate) : undefined,
        exceptionReason: needsException ? trimmedException : undefined,
        reason: trimmedReason,
        version,
      })
      toast.success(t("guardianLinks.end.done", { name: guardianName }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "LAST_GUARDIAN") {
        setLastGuardian(true)
        if (!isAdmin) setFailure(t("guardianLinks.end.lastGuardian"))
        return
      }
      if (code === "ADMIN_EXCEPTION_ONLY") {
        setFailure(t("guardianLinks.end.lastGuardian"))
        return
      }
      if (code === "EXCEPTION_REASON_INVALID") {
        setErrors({ exception: exceptionMessage })
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
      confirmDisabled={lastGuardian && !isAdmin}
      confirmLabel={needsException ? t("guardianLinks.end.confirmWithException") : t("guardianLinks.end.confirm")}
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
          {isAdmin ? t("guardianLinks.end.lastGuardianAdmin") : t("guardianLinks.end.lastGuardian")}
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

      {needsException && (
        <Textarea
          error={errors.exception}
          helperText={t("students.state.exceptionHelper", {
            max: linkLimits.exceptionMax,
            min: linkLimits.exceptionMin,
          })}
          maxLength={linkLimits.exceptionMax}
          onChange={(event) => setExceptionReason(event.target.value)}
          placeholder={t("students.state.exceptionPlaceholder")}
          title={t("students.state.exceptionLabel")}
          value={exceptionReason}
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
