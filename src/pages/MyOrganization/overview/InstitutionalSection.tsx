import { useTranslation } from "react-i18next"

import { Badge } from "@/ds-components/atoms"
import { DescriptionList, Input } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"

import { displayNameMaxLength, institutionalNameMaxLength } from "../MyOrganization.constants"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import type { SaveResult } from "../shared/saveResult"
import { useSectionForm } from "../shared/useSectionForm"
import { useStatusLabels } from "../shared/useStatusLabels"

type InstitutionalValues = Required<Pick<OrganizationUpdate, "displayName" | "institutionalName">>

export type InstitutionalSectionProps = {
  organization: Organization
  onSave: (update: InstitutionalValues) => Promise<SaveResult>
}

// The organization's institutional data: its institutional and display names are edited here; the
// operation model and the status are read-only (the backend does not let them be changed).
export const InstitutionalSection = (props: InstitutionalSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const { operationModelLabel, organizationStatusLabel, statusTone } = useStatusLabels()
  const section = useSectionForm<InstitutionalValues>(
    { displayName: organization.displayName, institutionalName: organization.institutionalName },
    onSave,
  )

  const { errors } = section.form.formState
  const requiredMessage = t("myOrganization.validation.required")

  return (
    <EditableSectionCard
      editing={section.isEditing}
      hasConflict={section.hasConflict}
      form={
        <>
          <Input
            error={errors.institutionalName?.message}
            maxLength={institutionalNameMaxLength}
            placeholder={t("myOrganization.overview.institutionalNamePlaceholder")}
            title={t("myOrganization.overview.institutionalName")}
            required
            {...section.form.register("institutionalName", {
              validate: (value) => value.trim() !== "" || requiredMessage,
            })}
          />
          <Input
            error={errors.displayName?.message}
            helperText={t("myOrganization.overview.displayNameHelper")}
            maxLength={displayNameMaxLength}
            placeholder={t("myOrganization.overview.displayNamePlaceholder")}
            title={t("myOrganization.overview.displayName")}
            required
            {...section.form.register("displayName", {
              validate: (value) => value.trim() !== "" || requiredMessage,
            })}
          />
        </>
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("myOrganization.overview.institutionalTitle")}
      view={
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "institutionalName",
              label: t("myOrganization.overview.institutionalName"),
              value: organization.institutionalName,
            },
            { key: "displayName", label: t("myOrganization.overview.displayName"), value: organization.displayName },
            {
              key: "operationModel",
              label: t("myOrganization.overview.operationModel"),
              value: operationModelLabel(organization.operationModel),
            },
            {
              key: "status",
              label: t("myOrganization.overview.status"),
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
