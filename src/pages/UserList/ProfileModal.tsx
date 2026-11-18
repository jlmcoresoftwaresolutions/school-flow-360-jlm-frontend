import { useId, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { UserView } from "@/models"
import { getUser, updateUserProfile } from "@/services/users"
import { defaultCountry } from "@/utils/countries"
import { formatPhoneForDisplay, formatPhoneInput, isValidPhone, toInternationalPhone } from "@/utils/phone"

import { newAccessLimits } from "../shared/userAccess/newAccess"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import { useUserActionErrors } from "./useUserActionErrors"

export type ProfileModalProps = {
  user: UserView
  onClose: () => void
  // The user is out of reach now: the list is read again.
  onGone: () => void
  onSaved: (user: UserView) => void
}

type ProfileValues = {
  fullName: string
  phone: string
}

const toValues = (user: UserView): ProfileValues => ({
  fullName: user.fullName ?? "",
  phone: user.phone ? formatPhoneForDisplay(user.phone, defaultCountry) : "",
})

// A user's name and phone - the only personal data an operator edits (JLM-152): the e-mail, the
// password, the roles, the units and the status have their own flows. The name is required; an empty
// phone removes it. Saved with the user's version: if someone else changed the user meanwhile, it is
// read again and the form keeps what was typed, so saving again goes over it knowingly.
export const ProfileModal = (props: ProfileModalProps) => {
  const { onClose, onGone, onSaved, user } = props

  const { t } = useTranslation()
  const toFailure = useUserActionErrors()
  const form = useForm<ProfileValues>({ defaultValues: toValues(user) })

  const formId = useId()

  const [version, setVersion] = useState(user.version)
  const [failure, setFailure] = useState("")

  const { errors, isDirty, isSubmitting } = form.formState
  const name = user.fullName || user.email

  useUnsavedChanges(isDirty)

  const handleSubmit = form.handleSubmit(async (values) => {
    setFailure("")
    const phone = values.phone.trim()
    // The phone as stored goes back untouched; a new one in the international format; none removes it.
    let savedPhone = ""
    if (values.phone === toValues(user).phone) savedPhone = user.phone ?? ""
    else if (phone) savedPhone = toInternationalPhone(phone, defaultCountry)

    try {
      const saved = await updateUserProfile(user.id, { fullName: values.fullName.trim(), phone: savedPhone, version })
      form.reset(values)
      toast.success(t("users.profile.saved", { name: saved.fullName || saved.email }))
      onSaved(saved)
    } catch (error) {
      const result = toFailure(error)

      if (result.kind === "gone") {
        toast.error(result.message)
        onGone()
        return
      }
      if (result.kind === "conflict") {
        try {
          setVersion((await getUser(user.id)).version)
        } catch {
          // Reading it again failed too: the message below still says what happened.
        }
      }
      setFailure(result.message)
    }
  })

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSubmitting} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button disabled={!isDirty || isSubmitting} form={formId} type="submit">
            {t("common.save")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("users.profile.title", { name })}
      open
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("users.profile.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Input
            error={errors.fullName?.message}
            maxLength={newAccessLimits.fullName}
            title={t("userAccess.form.nameLabel")}
            required
            {...form.register("fullName", {
              validate: (value) => value.trim() !== "" || t("userAccess.form.nameRequired"),
            })}
          />

          <Controller
            control={form.control}
            name="phone"
            render={(controller) => (
              <Input
                error={controller.fieldState.error?.message}
                helperText={t("users.profile.phoneHelper")}
                maxLength={newAccessLimits.phone}
                name={controller.field.name}
                onBlur={controller.field.onBlur}
                onChange={(event) =>
                  controller.field.onChange(
                    formatPhoneInput(event.target.value, controller.field.value, defaultCountry),
                  )
                }
                ref={controller.field.ref}
                title={t("userAccess.form.phoneLabel")}
                type="tel"
                value={controller.field.value}
              />
            )}
            rules={{
              validate: (value) =>
                value.trim() === "" ||
                value === toValues(user).phone ||
                isValidPhone(value, defaultCountry) ||
                t("userAccess.form.phoneInvalid"),
            }}
          />
        </FormFields>
      </form>
    </Modal>
  )
}
