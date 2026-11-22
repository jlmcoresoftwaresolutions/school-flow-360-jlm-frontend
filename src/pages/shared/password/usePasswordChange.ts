import { useState } from "react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { getErrorCode } from "@/services/httpClient"
import { changeMyPassword } from "@/services/me"

import { emptyPasswordChange, type PasswordChangeValues, passwordLength } from "./passwordChange"

// The own password change (POST /api/me/password), shared by the page a temporary password forces and
// the profile. The backend's refusals land on the field they are about - a wrong current password, a
// new one equal to it or outside the policy - and anything else is a message for the whole form. Only a
// saved change calls `onChanged`.
export const usePasswordChange = (onChanged: () => Promise<void> | void) => {
  const { t } = useTranslation()
  const form = useForm<PasswordChangeValues>({ defaultValues: emptyPasswordChange })

  const [failure, setFailure] = useState("")

  const submit = form.handleSubmit(
    async (values) => {
      setFailure("")

      try {
        await changeMyPassword({ currentPassword: values.currentPassword, newPassword: values.newPassword })
      } catch (error) {
        const code = getErrorCode(error)
        const focus = { shouldFocus: true }

        if (code === "CURRENT_PASSWORD_INVALID") {
          form.setError("currentPassword", { message: t("passwordChange.currentInvalid") }, focus)
        } else if (code === "PASSWORD_UNCHANGED") {
          form.setError("newPassword", { message: t("passwordChange.unchanged") }, focus)
        } else if (code === "PASSWORD_INVALID") {
          form.setError("newPassword", { message: t("passwordChange.newPolicy", passwordLength) }, focus)
        } else {
          setFailure(t("passwordChange.unavailable"))
        }
        return
      }

      form.reset(emptyPasswordChange)
      await onChanged()
    },
    () => setFailure(""),
  )

  return { failure, form, submit }
}
