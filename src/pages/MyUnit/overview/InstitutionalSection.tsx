import { Controller } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Badge } from "@/ds-components/atoms"
import { DescriptionList, Input, Select } from "@/ds-components/molecules"
import type { Organization, OrganizationBranding, OrganizationUpdate } from "@/models"

import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useSectionForm } from "../shared/useSectionForm"
import { useStatusLabels } from "../shared/useStatusLabels"

type InstitutionalValues = Pick<OrganizationUpdate, "institutionalName" | "operationModel">

export type InstitutionalSectionProps = {
  branding: OrganizationBranding
  organization: Organization
  onSave: (update: InstitutionalValues) => Promise<boolean>
}

// The organization's institutional data. The display name is shown here but edited in the visual
// identity tab, where it belongs; the status is read-only (its taxonomy is still pending).
export const InstitutionalSection = (props: InstitutionalSectionProps) => {
  const { branding, onSave, organization } = props

  const { t } = useTranslation()
  const { operationModelLabel, operationModelOptions, organizationStatusLabel, statusTone } = useStatusLabels()
  const section = useSectionForm<InstitutionalValues>(
    { institutionalName: organization.institutionalName, operationModel: organization.operationModel },
    onSave,
  )

  const { errors } = section.form.formState
  const requiredMessage = t("minhaUnidade.validation.required")

  return (
    <EditableSectionCard
      editing={section.isEditing}
      form={
        <>
          <Input
            error={errors.institutionalName?.message}
            title={t("minhaUnidade.overview.institutionalName")}
            required
            {...section.form.register("institutionalName", {
              validate: (value) => value.trim() !== "" || requiredMessage,
            })}
          />
          <Controller
            control={section.form.control}
            name="operationModel"
            render={(controller) => (
              <Select
                name={controller.field.name}
                onBlur={controller.field.onBlur}
                onChange={(option) => option && controller.field.onChange(option.value)}
                options={operationModelOptions}
                title={t("minhaUnidade.overview.operationModel")}
                value={operationModelOptions.find((option) => option.value === controller.field.value) ?? null}
                required
              />
            )}
          />
        </>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("minhaUnidade.overview.institutionalTitle")}
      view={
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "institutionalName",
              label: t("minhaUnidade.overview.institutionalName"),
              value: organization.institutionalName,
            },
            { key: "displayName", label: t("minhaUnidade.overview.displayName"), value: branding.displayName },
            {
              key: "operationModel",
              label: t("minhaUnidade.overview.operationModel"),
              value: operationModelLabel(organization.operationModel),
            },
            {
              key: "status",
              label: t("minhaUnidade.overview.status"),
              value: (
                <Badge tone={statusTone(organization.status)}>{organizationStatusLabel(organization.status)}</Badge>
              ),
            },
          ]}
        />
      }
    />
  )
}
