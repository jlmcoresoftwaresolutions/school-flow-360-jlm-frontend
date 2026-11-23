import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { Guardian } from "@/models"
import { changeGuardianState } from "@/services/guardians"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

export type GuardianStateAction = "activate" | "inactivate" | "reactivate"

export type GuardianStateDialogProps = {
  action: GuardianStateAction
  guardian: Guardian
  onClose: () => void
  // The guardian changed (or was changed by someone else meanwhile): read it again.
  onChanged: () => void
  onGone: () => void
}

// A change of the guardian's status, confirmed first. Inactivating keeps the record and its links, but
// the backend refuses it while the guardian is the only one of an active student (LAST_GUARDIAN): another
// guardian must be linked first. Activating a draft and reactivating need the name.
export const GuardianStateDialog = (props: GuardianStateDialogProps) => {
  const { action, guardian, onChanged, onClose, onGone } = props

  const { t } = useTranslation()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const confirm = async () => {
    setIsSaving(true)
    setFailure("")
    try {
      await changeGuardianState(guardian.id, action, { version: guardian.version })
      toast.success(t(`guardians.state.${action}.done`))
      onChanged()
    } catch (error) {
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT" || code === "STATE_INVALID") {
        toast.error(t("guardians.state.conflict"))
        onChanged()
      } else if (code === "LAST_GUARDIAN") {
        setFailure(t("guardians.state.lastGuardian"))
      } else if (code === "NAME_REQUIRED") {
        setFailure(t("guardians.state.nameRequired"))
      } else {
        setFailure(t("guardians.state.failed"))
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t(`guardians.state.${action}.confirm`)}
      description={t(`guardians.state.${action}.description`, { name: guardian.fullName })}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t(`guardians.state.${action}.title`, { name: guardian.fullName })}
      tone={action === "inactivate" ? "danger" : undefined}
      open
    >
      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
