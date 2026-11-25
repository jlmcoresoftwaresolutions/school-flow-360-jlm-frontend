import { useTranslation } from "react-i18next"

import { DescriptionList, Textarea } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"

import { notesMaxLength } from "../MyOrganization.constants"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import type { SaveResult } from "../shared/saveResult"
import { useSectionForm } from "../shared/useSectionForm"

type NotesValues = Pick<OrganizationUpdate, "internalNotes">

export type NotesSectionProps = {
  organization: Organization
  onSave: (update: NotesValues) => Promise<SaveResult>
}

// A note for the administrative staff only.
export const NotesSection = (props: NotesSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const section = useSectionForm<NotesValues>({ internalNotes: organization.internalNotes }, onSave)

  return (
    <EditableSectionCard
      description={t("myOrganization.overview.notesHelper")}
      editing={section.isEditing}
      hasConflict={section.hasConflict}
      form={
        <Textarea
          helperText={t("myOrganization.validation.maxLength", { max: notesMaxLength })}
          maxLength={notesMaxLength}
          placeholder={t("myOrganization.overview.notesPlaceholder")}
          title={t("myOrganization.overview.notesTitle")}
          {...section.form.register("internalNotes")}
        />
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("myOrganization.overview.notesTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("myOrganization.overview.noNotes")}
          items={[
            { key: "internalNotes", label: t("myOrganization.overview.notesTitle"), value: organization.internalNotes },
          ]}
        />
      }
    />
  )
}
