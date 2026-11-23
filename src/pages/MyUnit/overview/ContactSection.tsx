import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { DescriptionList, Input } from "@/ds-components/molecules"
import { PhoneInput } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"
import { isValidEmail } from "@/utils/email"
import { isValidPhone, toInternationalPhone } from "@/utils/phone"

import { usePhoneInputTexts } from "../../shared/phone/usePhoneInputTexts"
import { contactEmailMaxLength } from "../MyUnit.constants"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useOrganizationCountry } from "../shared/organizationCountry"
import type { SaveResult } from "../shared/saveResult"
import { usePhoneFormatter } from "../shared/usePhoneFormatter"
import { useSectionForm } from "../shared/useSectionForm"

type ContactValues = Required<Pick<OrganizationUpdate, "contactEmail" | "contactPhone">>

export type ContactSectionProps = {
  organization: Organization
  onSave: (update: ContactValues) => Promise<SaveResult>
}

// The organization's institutional contacts. The phone may be of any country: one without "+" is read
// as one of the organization's country, and it is formatted as it is typed.
export const ContactSection = (props: ContactSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const phoneTexts = usePhoneInputTexts()
  const country = useOrganizationCountry()
  const formatPhone = usePhoneFormatter()
  const section = useSectionForm<ContactValues>(
    { contactEmail: organization.contactEmail, contactPhone: toInternationalPhone(organization.contactPhone, country) },
    onSave,
  )

  const { errors } = section.form.formState
  const phoneMessage = country === "BR" ? t("myUnit.validation.phone") : t("myUnit.validation.phoneAnyCountry")

  return (
    <EditableSectionCard
      editing={section.isEditing}
      hasConflict={section.hasConflict}
      form={
        <>
          <Input
            error={errors.contactEmail?.message}
            maxLength={contactEmailMaxLength}
            placeholder={t("myUnit.overview.contactEmailPlaceholder")}
            title={t("myUnit.overview.contactEmail")}
            type="email"
            required
            {...section.form.register("contactEmail", {
              validate: (value) => {
                if (value.trim() === "") return t("myUnit.validation.required")

                return isValidEmail(value) || t("myUnit.validation.email")
              },
            })}
          />
          <Controller
            control={section.form.control}
            name="contactPhone"
            render={(controller) => (
              <PhoneInput
                {...phoneTexts}
                defaultCountry={country}
                error={controller.fieldState.error?.message}
                helperText={t("myUnit.phoneHelper")}
                name={controller.field.name}
                onBlur={controller.field.onBlur}
                onChange={controller.field.onChange}
                placeholder={t("myUnit.overview.contactPhonePlaceholder")}
                title={t("myUnit.overview.contactPhone")}
                value={controller.field.value}
                required
              />
            )}
            rules={{
              validate: (value) => {
                if (value.trim() === "") return t("myUnit.validation.required")

                return isValidPhone(value, country) || phoneMessage
              },
            }}
          />
        </>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("myUnit.overview.contactTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("common.notInformed")}
          items={[
            { key: "contactEmail", label: t("myUnit.overview.contactEmail"), value: organization.contactEmail },
            {
              key: "contactPhone",
              label: t("myUnit.overview.contactPhone"),
              value: formatPhone(organization.contactPhone),
            },
          ]}
        />
      }
    />
  )
}
