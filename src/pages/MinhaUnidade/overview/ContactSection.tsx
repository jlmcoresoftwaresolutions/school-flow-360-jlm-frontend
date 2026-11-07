import { useTranslation } from "react-i18next"

import { DescriptionList, Input } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"
import { stripNonDigits } from "@/utils/formats"

import { emailPattern } from "../MinhaUnidade.constants"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useSectionForm } from "../shared/useSectionForm"

type ContactValues = Pick<OrganizationUpdate, "contactEmail" | "contactPhone">

export type ContactSectionProps = {
  organization: Organization
  onSave: (update: ContactValues) => Promise<boolean>
}

// The organization's institutional contacts.
export const ContactSection = (props: ContactSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const section = useSectionForm<ContactValues>(
    { contactEmail: organization.contactEmail, contactPhone: organization.contactPhone },
    onSave,
  )

  const { errors } = section.form.formState

  return (
    <EditableSectionCard
      editing={section.isEditing}
      form={
        <>
          <Input
            error={errors.contactEmail?.message}
            title={t("minhaUnidade.overview.contactEmail")}
            type="email"
            required
            {...section.form.register("contactEmail", {
              pattern: { message: t("minhaUnidade.validation.email"), value: emailPattern },
              validate: (value) => value.trim() !== "" || t("minhaUnidade.validation.required"),
            })}
          />
          <Input
            error={errors.contactPhone?.message}
            mask="phone"
            title={t("minhaUnidade.overview.contactPhone")}
            required
            {...section.form.register("contactPhone", {
              validate: (value) => stripNonDigits(value).length >= 10 || t("minhaUnidade.validation.phone"),
            })}
          />
        </>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("minhaUnidade.overview.contactTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("common.notInformed")}
          items={[
            { key: "contactEmail", label: t("minhaUnidade.overview.contactEmail"), value: organization.contactEmail },
            { key: "contactPhone", label: t("minhaUnidade.overview.contactPhone"), value: organization.contactPhone },
          ]}
        />
      }
    />
  )
}
