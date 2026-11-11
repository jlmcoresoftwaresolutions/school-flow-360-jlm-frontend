import { useTranslation } from "react-i18next"

import { DescriptionList, Textarea } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"

import { organizationNotesMaxLength } from "../MyUnit.constants"
import { EditableSectionCard } from "../shared/EditableSectionCard"
import { useSectionForm } from "../shared/useSectionForm"

type NotesValues = Pick<OrganizationUpdate, "internalNotes">

export type NotesSectionProps = {
  organization: Organization
  onSave: (update: NotesValues) => Promise<boolean>
}

// A note for the administrative staff only.
export const NotesSection = (props: NotesSectionProps) => {
  const { onSave, organization } = props

  const { t } = useTranslation()
  const section = useSectionForm<NotesValues>({ internalNotes: organization.internalNotes }, onSave)

  return (
    <EditableSectionCard
      description={t("myUnit.overview.notesHelper")}
      editing={section.isEditing}
      form={
        <Textarea
          helperText={t("myUnit.validation.maxLength", { max: organizationNotesMaxLength })}
          maxLength={organizationNotesMaxLength}
          title={t("myUnit.overview.notesTitle")}
          {...section.form.register("internalNotes")}
        />
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("myUnit.overview.notesTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("myUnit.overview.noNotes")}
          items={[{ key: "internalNotes", label: t("myUnit.overview.notesTitle"), value: organization.internalNotes }]}
        />
      }
    />
  )
}
