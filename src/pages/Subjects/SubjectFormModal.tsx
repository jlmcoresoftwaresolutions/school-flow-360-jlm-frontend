import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicSubject } from "@/models"
import { createAcademicSubject, getAcademicSubject, updateAcademicSubject } from "@/services/academicCatalog"

import { ConflictNotice } from "../MyOrganization/shared/ConflictNotice"
import { academicLimits } from "../shared/academic/academicLimits"
import { CatalogSimilar } from "../shared/academic/CatalogSimilar"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FieldRow } from "../shared/people/people.styles"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type SubjectFormModalProps = {
  onClose: () => void
  onSaved: () => void
  // The subject to edit; none creates one.
  subject?: AcademicSubject
}

type Values = { code: string; description: string; name: string }

// Registers or edits a subject of the institution: its code (unique, compared without case, accents or
// repeated spaces; a repeated one is pointed out on its field, keeping the rest), its name and an
// optional short description. Renaming keeps the subject in the old classes. If someone else changed
// it meanwhile, it is read again and the form keeps the draft.
export const SubjectFormModal = (props: SubjectFormModalProps) => {
  const { onClose, onSaved, subject } = props

  const { t } = useTranslation()

  const formId = useId()

  const [original] = useState<Values>(() => ({
    code: subject?.code ?? "",
    description: subject?.description ?? "",
    name: subject?.name ?? "",
  }))
  const [values, setValues] = useState<Values>(original)
  const [errors, setErrors] = useState<Partial<Values>>({})

  const isEdit = Boolean(subject)
  const { clearConflict, clearFieldError, conflict, failure, fieldError, isSaving, save } = useCatalogSave({
    duplicate: { field: "code", message: t("subjects.form.codeInUse") },
    isNew: !isEdit,
    onSaved,
    readAgain: subject ? () => getAcademicSubject(subject.id, { showLoading: false }) : undefined,
    successMessage: isEdit ? t("subjects.form.updated") : t("subjects.form.created"),
  })
  const version = conflict?.version ?? subject?.version
  const isChanged =
    values.code !== original.code || values.name !== original.name || values.description !== original.description

  useUnsavedChanges(isChanged && !isSaving)

  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
    if (key === "code") clearFieldError()
  }

  const submit = () => {
    const found: Partial<Values> = {}
    if (!values.code.trim()) found.code = t("subjects.form.codeRequired")
    if (!values.name.trim()) found.name = t("subjects.form.nameRequired")
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const request = {
      code: values.code.trim(),
      description: values.description.trim() || undefined,
      name: values.name.trim(),
    }
    void save(() =>
      subject ? updateAcademicSubject(subject.id, { ...request, version }) : createAcademicSubject(request),
    )
  }

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button disabled={isSaving} form={formId} type="submit">
            {isEdit ? t("common.save") : t("subjects.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={isEdit ? t("subjects.form.editTitle", { name: subject?.name }) : t("subjects.form.createTitle")}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        noValidate
      >
        <FormFields>
          {conflict && (
            <ConflictNotice
              current={<Text fontSize="sm">{`${conflict.code} · ${conflict.name}`}</Text>}
              onDiscard={() => {
                setValues({ code: conflict.code, description: conflict.description ?? "", name: conflict.name })
                clearConflict()
              }}
            />
          )}

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <FieldRow>
            <Input
              error={errors.code || (fieldError?.field === "code" ? fieldError.message : undefined)}
              maxLength={academicLimits.code}
              onChange={(event) => set("code", event.target.value)}
              placeholder={t("subjects.form.codePlaceholder")}
              title={t("subjects.form.code")}
              value={values.code}
              required
            />
            <Input
              error={errors.name}
              maxLength={academicLimits.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder={t("subjects.form.namePlaceholder")}
              title={t("subjects.form.name")}
              value={values.name}
              required
            />
          </FieldRow>
          {!isEdit && <CatalogSimilar kind="subjects" term={values.name} />}

          <Textarea
            helperText={t("subjects.form.descriptionHelper")}
            maxLength={academicLimits.reason}
            onChange={(event) => set("description", event.target.value)}
            placeholder={t("subjects.form.descriptionPlaceholder")}
            title={t("subjects.form.description")}
            value={values.description}
          />
        </FormFields>
      </form>
    </Modal>
  )
}
