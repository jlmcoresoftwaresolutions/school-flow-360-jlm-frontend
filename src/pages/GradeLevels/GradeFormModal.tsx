import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicGrade, AcademicStage } from "@/models"
import { createAcademicGrade, getAcademicGrade, updateAcademicGrade } from "@/services/academicCatalog"

import { ConflictNotice } from "../MyUnit/shared/ConflictNotice"
import { academicLimits } from "../shared/academic/academicLimits"
import { CatalogSimilar } from "../shared/academic/CatalogSimilar"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type GradeFormModalProps = {
  stages: AcademicStage[]
  onClose: () => void
  onSaved: () => void
  // The grade to edit; none creates one.
  grade?: AcademicGrade
  // The stage a new grade starts in (from the stage's "Nova série").
  stageId?: number
}

// Registers or edits a grade (1º ano, 2º ano...). A grade belongs to one stage, chosen when it is
// created and never changed after (another stage means another grade); only active stages are offered.
// Its name is unique within the stage.
export const GradeFormModal = (props: GradeFormModalProps) => {
  const { grade, onClose, onSaved, stageId, stages } = props

  const { t } = useTranslation()

  const formId = useId()

  const [stage, setStage] = useState(String(grade?.stageId ?? stageId ?? ""))
  const [name, setName] = useState(grade?.name ?? "")
  const [sortOrder, setSortOrder] = useState(String(grade?.sortOrder ?? 0))
  const [errors, setErrors] = useState<{ name?: string; stage?: string }>({})

  const isEdit = Boolean(grade)
  const { clearConflict, clearFieldError, conflict, failure, fieldError, isSaving, save } = useCatalogSave({
    duplicate: { field: "name", message: t("gradeLevels.grades.form.nameInUse") },
    isNew: !isEdit,
    onSaved,
    readAgain: grade ? () => getAcademicGrade(grade.id, { showLoading: false }) : undefined,
    successMessage: isEdit ? t("gradeLevels.grades.form.updated") : t("gradeLevels.grades.form.created"),
  })
  const version = conflict?.version ?? grade?.version
  const stageOptions = stages
    .filter((item) => item.status === "ACTIVE" || item.id === grade?.stageId)
    .map((item) => ({ label: item.name, value: String(item.id) }))
  const isChanged =
    name !== (grade?.name ?? "") ||
    sortOrder !== String(grade?.sortOrder ?? 0) ||
    stage !== String(grade?.stageId ?? stageId ?? "")

  useUnsavedChanges(isChanged && !isSaving)

  const submit = () => {
    const found: typeof errors = {}
    if (!stage) found.stage = t("gradeLevels.grades.form.stageRequired")
    if (!name.trim()) found.name = t("gradeLevels.grades.form.nameRequired")
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const request = { name: name.trim(), sortOrder: Number(sortOrder) || 0, stageId: Number(stage) }
    void save(() => (grade ? updateAcademicGrade(grade.id, { ...request, version }) : createAcademicGrade(request)))
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
            {isEdit ? t("common.save") : t("gradeLevels.grades.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={
        isEdit
          ? t("gradeLevels.grades.form.editTitle", { name: grade?.name })
          : t("gradeLevels.grades.form.createTitle")
      }
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
              current={<Text fontSize="sm">{conflict.name}</Text>}
              onDiscard={() => {
                setName(conflict.name)
                setSortOrder(String(conflict.sortOrder))
                clearConflict()
              }}
            />
          )}

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Select
            error={errors.stage}
            helperText={isEdit ? t("gradeLevels.grades.form.stageFixed") : undefined}
            isDisabled={isEdit}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setStage(option?.value ?? "")
              setErrors((current) => ({ ...current, stage: undefined }))
            }}
            options={stageOptions}
            placeholder={t("gradeLevels.grades.form.stagePlaceholder")}
            title={t("gradeLevels.grades.stage")}
            value={stageOptions.find((option) => option.value === stage) ?? null}
            required
          />

          <Input
            error={errors.name || (fieldError?.field === "name" ? fieldError.message : undefined)}
            maxLength={academicLimits.name}
            onChange={(event) => {
              setName(event.target.value)
              setErrors((current) => ({ ...current, name: undefined }))
              clearFieldError()
            }}
            placeholder={t("gradeLevels.grades.form.namePlaceholder")}
            title={t("gradeLevels.grades.form.name")}
            value={name}
            required
          />
          {!isEdit && <CatalogSimilar kind="grades" term={name} />}

          <Input
            helperText={t("gradeLevels.sortOrderHelper")}
            inputMode="numeric"
            maxLength={4}
            onChange={(event) => setSortOrder(event.target.value.replace(/[^\d]/g, ""))}
            placeholder={t("gradeLevels.sortOrderPlaceholder")}
            title={t("gradeLevels.sortOrder")}
            value={sortOrder}
          />
        </FormFields>
      </form>
    </Modal>
  )
}
