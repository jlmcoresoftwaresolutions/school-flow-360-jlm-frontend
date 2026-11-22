import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Input } from "@/ds-components/molecules"

import { FormFields } from "../userAccess/userAccess.styles"
import { type PasswordChangeValues, passwordLength } from "./passwordChange"

export type PasswordChangeFieldsProps = {
  form: UseFormReturn<PasswordChangeValues>
  // How the current password is called: "Senha temporária" when a temporary password forces the change.
  currentLabel?: string
  // The current password's placeholder, following `currentLabel`.
  currentPlaceholder?: string
}

// The three fields of the own password change: the current password, the new one (with the policy as
// its help) and its confirmation. The new one is checked here for the policy and for being different
// from the current one, as the backend would refuse it.
export const PasswordChangeFields = (props: PasswordChangeFieldsProps) => {
  const { currentLabel, currentPlaceholder, form } = props

  const { t } = useTranslation()

  const { errors } = form.formState

  return (
    <FormFields>
      <Input
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        hidePasswordLabel={t("common.hidePassword")}
        placeholder={currentPlaceholder ?? t("passwordChange.currentPlaceholder")}
        showPasswordLabel={t("common.showPassword")}
        title={currentLabel ?? t("passwordChange.currentLabel")}
        type="password"
        required
        {...form.register("currentPassword", { required: t("passwordChange.currentRequired") })}
      />

      <Input
        autoComplete="new-password"
        error={errors.newPassword?.message}
        helperText={t("passwordChange.newHelper", passwordLength)}
        hidePasswordLabel={t("common.hidePassword")}
        placeholder={t("passwordChange.newPlaceholder")}
        showPasswordLabel={t("common.showPassword")}
        title={t("passwordChange.newLabel")}
        type="password"
        required
        {...form.register("newPassword", {
          maxLength: { message: t("passwordChange.newPolicy", passwordLength), value: passwordLength.max },
          minLength: { message: t("passwordChange.newPolicy", passwordLength), value: passwordLength.min },
          required: t("passwordChange.newRequired"),
          validate: (value) => value !== form.getValues("currentPassword") || t("passwordChange.unchanged"),
        })}
      />

      <Input
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        hidePasswordLabel={t("common.hidePassword")}
        placeholder={t("passwordChange.confirmPlaceholder")}
        showPasswordLabel={t("common.showPassword")}
        title={t("passwordChange.confirmLabel")}
        type="password"
        required
        {...form.register("confirmPassword", {
          required: t("passwordChange.confirmRequired"),
          validate: (value) => value === form.getValues("newPassword") || t("passwordChange.mismatch"),
        })}
      />
    </FormFields>
  )
}
