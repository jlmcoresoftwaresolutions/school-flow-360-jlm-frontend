import { useId } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Modal } from "@/ds-components/organisms"

import { PasswordChangeFields } from "../shared/password/PasswordChangeFields"
import { usePasswordChange } from "../shared/password/usePasswordChange"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type ChangePasswordModalProps = {
  onClose: () => void
}

// The own password change from the profile, whenever the person wants it: the current password, the
// new one and its confirmation. The session goes on as it is.
export const ChangePasswordModal = (props: ChangePasswordModalProps) => {
  const { onClose } = props

  const { t } = useTranslation()
  const formId = useId()

  const { failure, form, submit } = usePasswordChange(() => {
    toast.success(t("passwordChange.saved"))
    onClose()
  })

  const { isDirty, isSubmitting } = form.formState

  useUnsavedChanges(isDirty)

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSubmitting} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button disabled={isSubmitting} form={formId} type="submit">
            {t("passwordChange.submit")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("passwordChange.title")}
      open
    >
      <form id={formId} onSubmit={(event) => void submit(event)} noValidate>
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("passwordChange.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <PasswordChangeFields form={form} />
        </FormFields>
      </form>
    </Modal>
  )
}
