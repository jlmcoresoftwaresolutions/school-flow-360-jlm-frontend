import { useTranslation } from "react-i18next"

import { DescriptionList, Textarea } from "@/ds-components/molecules"
import type { Organization, OrganizationUpdate } from "@/models"

import { notesMaxLength } from "../MinhaUnidade.constants"
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
      description={t("minhaUnidade.overview.notesHelper")}
      editing={section.isEditing}
      form={
        <Textarea
          helperText={t("minhaUnidade.validation.maxLength", { max: notesMaxLength })}
          maxLength={notesMaxLength}
          title={t("minhaUnidade.overview.notesTitle")}
          {...section.form.register("internalNotes")}
        />
      }
      isDirty={section.isDirty}
      isSubmitting={section.isSubmitting}
      onCancel={section.cancelEditing}
      onEdit={section.startEditing}
      onSubmit={section.onSubmit}
      title={t("minhaUnidade.overview.notesTitle")}
      view={
        <DescriptionList
          columns={1}
          emptyValue={t("minhaUnidade.overview.noNotes")}
          items={[
            { key: "internalNotes", label: t("minhaUnidade.overview.notesTitle"), value: organization.internalNotes },
          ]}
        />
      }
    />
  )
}
