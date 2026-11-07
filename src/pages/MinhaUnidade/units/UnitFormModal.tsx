import { useId } from "react"
import { FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Grid } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { SchoolUnit, SchoolUnitInput } from "@/models"
import { emptyAddress } from "@/utils/address"
import { stripNonDigits } from "@/utils/formats"

import { emailPattern, notesMaxLength } from "../MinhaUnidade.constants"
import { FieldGroup } from "../MinhaUnidade.styles"
import { AddressFields } from "../shared/AddressFields"

export type UnitFormModalProps = {
  onClose: () => void
  onSave: (input: SchoolUnitInput) => Promise<boolean>
  unit?: SchoolUnit
}

const toInput = (unit?: SchoolUnit): SchoolUnitInput => ({
  address: unit?.address ?? emptyAddress,
  contactEmail: unit?.contactEmail ?? "",
  contactPhone: unit?.contactPhone ?? "",
  name: unit?.name ?? "",
  notes: unit?.notes ?? "",
})

// Registering a unit, or editing one (`unit`). Rendered only while open, so each opening starts from
// the unit's current data (or a blank form). A new unit always starts active. Only the name, the city
// and the state are required: the visual spec's academic fields (calendar, operational setup) wait for
// the Acadêmico module, and the unit code for DP-P1-05.
export const UnitFormModal = (props: UnitFormModalProps) => {
  const { onClose, onSave, unit } = props

  const { t } = useTranslation()
  const form = useForm<SchoolUnitInput>({ defaultValues: toInput(unit) })

  const formId = useId()

  const { errors, isDirty, isSubmitting } = form.formState
  const isEditing = unit !== undefined

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
            {isEditing ? t("common.save") : t("minhaUnidade.units.createFirst")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={isEditing ? t("minhaUnidade.units.editTitle") : t("minhaUnidade.units.createTitle")}
      open
    >
      <FormProvider {...form}>
        <form id={formId} onSubmit={handleSubmit} noValidate>
          <FieldGroup>
            <Input
              error={errors.name?.message}
              title={t("minhaUnidade.units.name")}
              required
              {...form.register("name", {
                validate: (value) => value.trim() !== "" || t("minhaUnidade.validation.required"),
              })}
            />

            <Grid.Row>
              <Grid.Col xs={12} md={6}>
                <Input
                  error={errors.contactEmail?.message}
                  title={t("minhaUnidade.units.contactEmail")}
                  type="email"
                  {...form.register("contactEmail", {
                    validate: (value) =>
                      value.trim() === "" || emailPattern.test(value) || t("minhaUnidade.validation.email"),
                  })}
                />
              </Grid.Col>
              <Grid.Col xs={12} md={6}>
                <Input
                  error={errors.contactPhone?.message}
                  mask="phone"
                  title={t("minhaUnidade.units.contactPhone")}
                  {...form.register("contactPhone", {
                    validate: (value) =>
                      value.trim() === "" || stripNonDigits(value).length >= 10 || t("minhaUnidade.validation.phone"),
                  })}
                />
              </Grid.Col>
            </Grid.Row>

            <AddressFields />

            <Textarea
              helperText={t("minhaUnidade.validation.maxLength", { max: notesMaxLength })}
              maxLength={notesMaxLength}
              title={t("minhaUnidade.units.notes")}
              {...form.register("notes")}
            />
          </FieldGroup>
        </form>
      </FormProvider>
    </Modal>
  )
}
