import { FormProvider } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { DescriptionList } from "@/ds-components/molecules"
import type { Organization } from "@/models"
import { formatAddress } from "@/utils/address"

import type { AddressFormValues } from "../shared/AddressFields"
import { AddressFields } from "../shared/AddressFields"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useSectionForm } from "../shared/useSectionForm"

export type AddressSectionProps = {
  organization: Organization
  onSave: (update: AddressFormValues) => Promise<boolean>
}

// The organization's institutional address: one line to read, the structured fields (with the CEP
// lookup) to edit.
export const AddressSection = (props: AddressSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const section = useSectionForm<AddressFormValues>({ address: organization.address }, onSave)

  return (
    <EditableSectionCard
      editing={section.isEditing}
      form={
        <FormProvider {...section.form}>
          <AddressFields />
        </FormProvider>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("minhaUnidade.overview.addressTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "address",
              label: t("minhaUnidade.overview.addressLabel"),
              value: formatAddress(organization.address),
            },
          ]}
        />
      }
    />
  )
}
