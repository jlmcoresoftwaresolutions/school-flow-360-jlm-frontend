import { FormProvider } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { DescriptionList } from "@/ds-components/molecules"
import type { Organization } from "@/models"

import type { AddressFormValues } from "../shared/AddressFields"
import { AddressFields } from "../shared/AddressFields"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useAddressFormatter } from "../shared/useAddressFormatter"
import { useSectionForm } from "../shared/useSectionForm"

export type AddressSectionProps = {
  organization: Organization
  onSave: (update: AddressFormValues) => Promise<boolean>
}

// The organization's institutional address, with its country: one line to read, the fields to edit,
// shaped by the country chosen (a Brazilian address has the CEP lookup and the UF).
export const AddressSection = (props: AddressSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const formatAddress = useAddressFormatter()
  const section = useSectionForm<AddressFormValues>({ address: organization.address }, onSave)

  return (
    <EditableSectionCard
      editing={section.isEditing}
      form={
        <FormProvider {...section.form}>
          <AddressFields withCountry />
        </FormProvider>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("myUnit.overview.addressTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "address",
              label: t("myUnit.overview.addressLabel"),
              value: formatAddress(organization.address, { showCountry: true }),
            },
          ]}
        />
      }
    />
  )
}
