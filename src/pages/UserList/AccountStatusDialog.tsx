import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Text } from "@/ds-components/atoms"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { UserView } from "@/models"
import { inactivateUser, reactivateUser } from "@/services/users"

import { getPersonName } from "../shared/userAccess/personName"
import { useUserActionErrors } from "../shared/userAccess/useUserActionErrors"

export type AccountStatusDialogProps = {
  action: "inactivate" | "reactivate"
  user: UserView
  onClose: () => void
  onGone: () => void
  onSaved: (user: UserView) => void
}

// Turning a whole account off or back on (JLM-161), distinct from revoking a role: inactivating stops
// the person from signing in and ends the open sessions, keeping roles, units and history (it can be
// undone); reactivating brings the person back with the roles still active - none left is refused
// (NO_ACTIVE_ASSIGNMENT), and the refusal says to grant a role first. The last active Admin can't be
// inactivated (LAST_ADMIN).
export const AccountStatusDialog = (props: AccountStatusDialogProps) => {
  const { action, onClose, onGone, onSaved, user } = props

  const { t } = useTranslation()
  const toFailure = useUserActionErrors()

  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const name = getPersonName(user)
  const isInactivating = action === "inactivate"

  const confirm = async () => {
    setIsSaving(true)
    setFailure("")

    try {
      const saved = isInactivating ? await inactivateUser(user.id) : await reactivateUser(user.id)
      toast.success(isInactivating ? t("users.status.inactivated", { name }) : t("users.status.reactivated", { name }))
      onSaved(saved)
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "gone") {
        toast.error(result.message)
        onGone()
        return
      }
      setFailure(result.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      closeLabel={t("common.close")}
      confirmLabel={isInactivating ? t("users.status.inactivate") : t("users.status.reactivate")}
      description={
        isInactivating
          ? t("users.status.inactivateDescription", { name })
          : t("users.status.reactivateDescription", { name })
      }
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={isInactivating ? t("users.status.inactivateTitle", { name }) : t("users.status.reactivateTitle", { name })}
      tone={isInactivating ? "danger" : "default"}
      open
    >
      {failure && (
        <Text color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
