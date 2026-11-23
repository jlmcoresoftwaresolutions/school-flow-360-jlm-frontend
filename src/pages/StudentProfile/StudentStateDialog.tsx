import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import { useSignedInUser } from "@/hooks"
import type { Student } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { changeStudentState } from "@/services/students"
import { hasAnyRole } from "@/utils/access"

export type StudentStateAction = "activate" | "discard" | "inactivate" | "reactivate"

export type StudentStateDialogProps = {
  action: StudentStateAction
  student: Student
  onClose: () => void
  // The student changed (or was changed by someone else meanwhile): read it again.
  onChanged: () => void
  onGone: () => void
}

const exceptionMin = 10
const exceptionMax = 500

// A change of the student's status, confirmed first. Activating (a draft) or reactivating (an inactive
// student) needs the name, the birth date, an active unit and an active guardian: anything missing is
// listed and the confirmation stays off. Without a guardian only the Admin may go ahead, giving the
// reason of the exception (adult student, EJA), which is recorded. Inactivating keeps everything;
// discarding a draft makes it inactive; both cancel its open guardian invitations, and nothing is deleted.
export const StudentStateDialog = (props: StudentStateDialogProps) => {
  const { action, onChanged, onClose, onGone, student } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()

  const [exceptionReason, setExceptionReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isActivation = action === "activate" || action === "reactivate"
  const blockers = isActivation ? student.activationBlockers : []
  const missingGuardian = blockers.includes("NO_GUARDIAN")
  const otherBlockers = blockers.filter((blocker) => blocker !== "NO_GUARDIAN")
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const needsException = missingGuardian && otherBlockers.length === 0 && isAdmin
  const canConfirm = otherBlockers.length === 0 && (!missingGuardian || isAdmin)

  const toFailure = (error: unknown): string => {
    switch (getErrorCode(error)) {
      case "GUARDIAN_REQUIRED":
        return t("students.state.guardianRequired")
      case "ADMIN_EXCEPTION_ONLY":
        return t("students.state.adminOnly")
      case "UNIT_INACTIVE":
        return t("students.blockers.UNIT_INACTIVE")
      case "NAME_REQUIRED":
        return t("students.blockers.NAME_REQUIRED")
      case "BIRTH_DATE_REQUIRED":
        return t("students.blockers.BIRTH_DATE_REQUIRED")
      default:
        return t("students.state.failed")
    }
  }

  const confirm = async () => {
    const reason = exceptionReason.trim()
    if (needsException && (reason.length < exceptionMin || reason.length > exceptionMax)) {
      setReasonError(t("students.state.exceptionInvalid", { max: exceptionMax, min: exceptionMin }))
      return
    }

    setIsSaving(true)
    setFailure("")
    try {
      await changeStudentState(student.id, action, {
        exceptionReason: needsException ? reason : undefined,
        version: student.version,
      })
      toast.success(t(`students.state.${action}.done`))
      onChanged()
    } catch (error) {
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT" || code === "STATE_INVALID") {
        toast.error(t("students.state.conflict"))
        onChanged()
      } else if (code === "EXCEPTION_REASON_INVALID") {
        setReasonError(t("students.state.exceptionInvalid", { max: exceptionMax, min: exceptionMin }))
      } else {
        setFailure(toFailure(error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={!canConfirm}
      confirmLabel={
        needsException ? t("students.state.activateWithoutGuardian") : t(`students.state.${action}.confirm`)
      }
      description={t(`students.state.${action}.description`, { name: student.fullName })}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t(`students.state.${action}.title`, { name: student.fullName })}
      tone={action === "discard" || action === "inactivate" ? "danger" : undefined}
      open
    >
      {otherBlockers.length > 0 && (
        <Text as="p" color="warning" fontSize="sm" role="note">
          {t("students.profile.blockers", {
            blockers: otherBlockers.map((blocker) => t(`students.blockers.${blocker}`)).join(", "),
          })}
        </Text>
      )}

      {missingGuardian && otherBlockers.length === 0 && !isAdmin && (
        <Text as="p" color="warning" fontSize="sm" role="note">
          {t("students.state.guardianRequired")}
        </Text>
      )}

      {needsException && (
        <Textarea
          error={reasonError}
          helperText={t("students.state.exceptionHelper", { max: exceptionMax, min: exceptionMin })}
          maxLength={exceptionMax}
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
