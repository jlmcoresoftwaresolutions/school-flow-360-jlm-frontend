import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Button, Icon, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { ConfirmDialog, Modal } from "@/ds-components/organisms"
import type { TemporaryPassword, UserView } from "@/models"
import { issueTemporaryPassword } from "@/services/users"

import { getPersonName } from "../shared/userAccess/personName"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import { useUserActionErrors } from "./useUserActionErrors"

export type TemporaryPasswordDialogProps = {
  user: UserView
  onClose: () => void
  onGone: () => void
}

// A temporary password for someone who can't get into the account (no e-mail to recover it, or no
// password yet): asked for after a confirmation, then shown once, with a button to copy it - it never
// appears again. Generating it ends the person's sessions, it works for 7 days and the person must
// create their own at the next sign-in. Same reach as inactivating the account.
export const TemporaryPasswordDialog = (props: TemporaryPasswordDialogProps) => {
  const { onClose, onGone, user } = props

  const { i18n, t } = useTranslation()
  const toFailure = useUserActionErrors()

  const [issued, setIssued] = useState<TemporaryPassword | null>(null)
  const [failure, setFailure] = useState("")
  const [isIssuing, setIsIssuing] = useState(false)

  const name = getPersonName(user)

  const issue = async () => {
    setIsIssuing(true)
    setFailure("")

    try {
      setIssued(await issueTemporaryPassword(user.id))
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "gone") {
        toast.error(result.message)
        onGone()
        return
      }
      setFailure(result.message)
    } finally {
      setIsIssuing(false)
    }
  }

  const copy = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password)
      toast.success(t("users.temporaryPassword.copied"))
    } catch {
      toast.error(t("users.temporaryPassword.copyFailed"))
    }
  }

  if (!issued) {
    return (
      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        closeLabel={t("common.close")}
        confirmLabel={t("users.temporaryPassword.generate")}
        description={t("users.temporaryPassword.confirmDescription", { name })}
        loading={isIssuing}
        onClose={onClose}
        onConfirm={() => void issue()}
        title={t("users.temporaryPassword.confirmTitle", { name })}
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

  const expiresAt = new Intl.DateTimeFormat(i18n.language, { dateStyle: "long", timeStyle: "short" }).format(
    new Date(issued.expiresAt),
  )

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={<Button onClick={onClose}>{t("users.temporaryPassword.done")}</Button>}
      onClose={onClose}
      size="md"
      title={t("users.temporaryPassword.issuedTitle", { name })}
      open
    >
      <FormFields>
        <Text color="warning" fontSize="sm" role="status" semibold>
          {t("users.temporaryPassword.showOnce")}
        </Text>

        <Input
          autoComplete="off"
          spellCheck={false}
          title={t("users.temporaryPassword.passwordLabel")}
          value={issued.temporaryPassword}
          readOnly
        />

        <div>
          <Button
            onClick={() => void copy(issued.temporaryPassword)}
            size="small"
            startIcon={<Icon color="inherit" name="file-outline" size={16} />}
            variant="outlined"
          >
            {t("users.temporaryPassword.copy")}
          </Button>
        </div>

        <Text color="secondary" fontSize="sm">
          {user.email
            ? t("users.temporaryPassword.howToSignIn", { email: user.email, expiresAt, name, nickname: user.nickname })
            : t("users.temporaryPassword.howToSignInNoEmail", { expiresAt, name, nickname: user.nickname })}
        </Text>
      </FormFields>
    </Modal>
  )
}
