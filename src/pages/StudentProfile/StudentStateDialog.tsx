import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { Student } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { changeStudentState } from "@/services/students"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type StudentStateAction = "activate" | "discard" | "inactivate" | "reactivate"

export type StudentStateDialogProps = {
  action: StudentStateAction
  student: Student
  onClose: () => void
  // The student changed (or was changed by someone else meanwhile): read it again.
  onChanged: () => void
  // Discarding deleted the draft for good: the student no longer exists.
  onDeleted: () => void
  onGone: () => void
}

// A change of the student's status, confirmed first. Activating (a draft) or reactivating (an inactive
// student) needs the name, the birth date, an active unit and, under 18, an active guardian: anything
// missing (the backend's `activationBlockers`) is listed and the confirmation stays off, for everyone -
// there is no exception (DP-P03-02). A student of 18 or over is activated without a guardian, as usual.
// Inactivating keeps everything. Discarding a draft deletes it for good when nothing depends on it (the
// backend answers status DELETED, and the page leaves for the list), or makes it inactive otherwise. Both
// cancel its open guardian invitations.
export const StudentStateDialog = (props: StudentStateDialogProps) => {
  const { action, onChanged, onClose, onDeleted, onGone, student } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isActivation = action === "activate" || action === "reactivate"
  const blockers = isActivation ? student.activationBlockers : []
  const missingGuardian = blockers.includes("NO_GUARDIAN")
  const otherBlockers = blockers.filter((blocker) => blocker !== "NO_GUARDIAN")

  const toFailure = (error: unknown): string => {
    switch (getErrorCode(error)) {
      case "GUARDIAN_REQUIRED":
        return t("students.state.guardianRequired")
      case "UNIT_INACTIVE":
        return t("students.blockers.UNIT_INACTIVE")
      case "NAME_REQUIRED":
        return t("students.blockers.NAME_REQUIRED")
      case "BIRTH_DATE_REQUIRED":
        return t("students.blockers.BIRTH_DATE_REQUIRED")
      default:
        return toFailureMessage(t("students.state.failed"), error)
    }
  }

  const confirm = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      const changed = await changeStudentState(student.id, action, { version: student.version })
      if (changed.status === "DELETED") {
        toast.success(t("students.state.discard.deleted"))
        onDeleted()
        return
      }
      toast.success(t(`students.state.${action}.done`))
      onChanged()
    } catch (error) {
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT" || code === "STATE_INVALID") {
        toast.error(t("students.state.conflict"))
        onChanged()
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
      confirmDisabled={blockers.length > 0}
      confirmLabel={t(`students.state.${action}.confirm`)}
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

      {missingGuardian && (
        <Text as="p" color="warning" fontSize="sm" role="note">
          {t("students.state.guardianRequired")}
        </Text>
      )}

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
