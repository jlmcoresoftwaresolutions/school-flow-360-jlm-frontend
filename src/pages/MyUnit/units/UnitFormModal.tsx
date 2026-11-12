import { useId } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Grid, Text } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { SchoolUnit, SchoolUnitInput } from "@/models"
import { emptyAddress } from "@/utils/address"
import { isValidEmail } from "@/utils/email"
import { formatPhoneInput, isValidPhone } from "@/utils/phone"

import { notesMaxLength, unitEmailMaxLength, unitNameMaxLength } from "../MyUnit.constants"
import { FieldGroup } from "../MyUnit.styles"
import { AddressFields } from "../shared/AddressFields"
import { useOrganizationCountry } from "../shared/organizationCountry"
import { usePhoneFormatter } from "../shared/usePhoneFormatter"

export type UnitFormModalProps = {
  onClose: () => void
  onSave: (input: SchoolUnitInput) => Promise<boolean>
  unit?: SchoolUnit
}

const toInput = (formatPhone: (phone: string) => string, unit?: SchoolUnit): SchoolUnitInput => ({
  address: unit?.address ?? emptyAddress,
  contactEmail: unit?.contactEmail ?? "",
  contactPhone: formatPhone(unit?.contactPhone ?? ""),
  name: unit?.name ?? "",
  notes: unit?.notes ?? "",
})

// Registering a unit, or editing one (`unit`). Rendered only while open, so each opening starts from
// the unit's current data (or a blank form). A new unit always starts active. Its address and phone
// are in the organization's country (a unit has no country of its own). The backend requires the
// name, the e-mail, the phone and an address with its street (plus, here, the city and - in Brazil -
// the state); the limits are the backend's. A unit from before structured addresses opens with the
// address fields empty and its old one-text address shown above them, to be typed into the fields.
// The visual spec's academic fields (calendar, operational setup) wait for the Acadêmico module, and
// the unit code for DP-P1-05.
export const UnitFormModal = (props: UnitFormModalProps) => {
  const { onClose, onSave, unit } = props

  const { t } = useTranslation()
  const country = useOrganizationCountry()
  const formatPhone = usePhoneFormatter()
  const form = useForm<SchoolUnitInput>({ defaultValues: toInput(formatPhone, unit) })

  const formId = useId()

  const { errors, isDirty, isSubmitting } = form.formState
  const isEditing = unit !== undefined
  const phoneMessage = country === "BR" ? t("myUnit.validation.phone") : t("myUnit.validation.phoneAnyCountry")
  const requiredMessage = t("myUnit.validation.required")

  useUnsavedChanges(isDirty)

  const handleSubmit = form.handleSubmit(async (input) => {
    if (await onSave(input)) onClose()
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
            {isEditing ? t("common.save") : t("myUnit.units.createFirst")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={isEditing ? t("myUnit.units.editTitle") : t("myUnit.units.createTitle")}
      open
    >
      <FormProvider {...form}>
        <form id={formId} onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Input
              error={errors.name?.message}
              maxLength={unitNameMaxLength}
              placeholder={t("myUnit.units.namePlaceholder")}
              title={t("myUnit.units.name")}
              required
              {...form.register("name", {
                validate: (value) => value.trim() !== "" || requiredMessage,
              })}
            />

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  error={errors.contactEmail?.message}
                  maxLength={unitEmailMaxLength}
                  placeholder={t("myUnit.units.contactEmailPlaceholder")}
                  title={t("myUnit.units.contactEmail")}
                  type="email"
                  required
                  {...form.register("contactEmail", {
                    validate: (value) => {
                      if (value.trim() === "") return requiredMessage

                      return isValidEmail(value) || t("myUnit.validation.email")
                    },
                  })}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Controller
                  control={form.control}
                  name="contactPhone"
                  render={(controller) => (
                    <Input
                      error={controller.fieldState.error?.message}
                      helperText={t("myUnit.phoneHelper")}
                      name={controller.field.name}
                      onBlur={controller.field.onBlur}
                      onChange={(event) =>
                        controller.field.onChange(formatPhoneInput(event.target.value, controller.field.value, country))
                      }
                      placeholder={t("myUnit.units.contactPhonePlaceholder")}
                      ref={controller.field.ref}
                      title={t("myUnit.units.contactPhone")}
                      type="tel"
                      value={controller.field.value}
                      required
                    />
                  )}
                  rules={{
                    validate: (value) => {
                      if (value.trim() === "") return requiredMessage

                      return isValidPhone(value, country) || phoneMessage
                    },
                  }}
                />
              </Grid.Col>
            </Grid.Row>

            {unit?.legacyAddress && (
              <Text color="warning" fontSize="sm" role="status">
                {t("myUnit.units.legacyAddress", { address: unit.legacyAddress })}
              </Text>
            )}

            <AddressFields streetRequired />

            <Textarea
              helperText={t("myUnit.validation.maxLength", { max: notesMaxLength })}
              maxLength={notesMaxLength}
              placeholder={t("myUnit.units.notesPlaceholder")}
              title={t("myUnit.units.notes")}
              {...form.register("notes")}
            />
          </FieldGroup>
        </form>
      </FormProvider>
    </Modal>
  )
}
