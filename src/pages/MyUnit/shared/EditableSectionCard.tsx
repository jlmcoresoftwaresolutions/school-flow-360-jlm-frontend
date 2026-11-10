import type { FormEventHandler, ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button, Icon } from "@/ds-components/atoms"

import { FieldGroup, FormActions } from "../MyUnit.styles"
import { SectionCard } from "./SectionCard"

export type EditableSectionCardProps = {
  editing: boolean
  form: ReactNode
  title: string
  view: ReactNode
  onCancel: () => void
  onEdit: () => void
  onSubmit: FormEventHandler<HTMLFormElement>
  description?: string
  isDirty?: boolean
  isSubmitting?: boolean
}

// A section that is read first and edited in place: its own "Editar" swaps the read-only `view` for
// the `form` fields, with Cancelar/Salvar below them. Salvar stays off until something changed.
export const EditableSectionCard = (props: EditableSectionCardProps) => {
  const { description, editing, form, isDirty, isSubmitting, onCancel, onEdit, onSubmit, title, view } = props

  const { t } = useTranslation()

  const editButton = (
    // Named after its section, since the page has one "Editar" per section.
    <Button
      aria-label={t("myUnit.editSection", { section: title })}
      onClick={onEdit}
      size="small"
      startIcon={<Icon color="brand" name="pen-outline" size={16} />}
      variant="outlined"
    >
      {t("common.edit")}
    </Button>
  )

  return (
    <SectionCard action={editing ? undefined : editButton} description={description} title={title}>
      {editing ? (
        <form aria-label={title} onSubmit={onSubmit} noValidate>
          <FieldGroup>{form}</FieldGroup>

          <FormActions>
            <Button disabled={isSubmitting} onClick={onCancel} size="small" type="button" variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button disabled={!isDirty || isSubmitting} size="small" type="submit">
              {t("common.save")}
            </Button>
          </FormActions>
        </form>
      ) : (
        view
      )}
    </SectionCard>
  )
}
