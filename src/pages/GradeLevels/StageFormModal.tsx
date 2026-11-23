import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicStage } from "@/models"
import { createAcademicStage, getAcademicStage, updateAcademicStage } from "@/services/academicCatalog"

import { ConflictNotice } from "../MyUnit/shared/ConflictNotice"
import { academicLimits } from "../shared/academic/academicLimits"
import { CatalogSimilar } from "../shared/academic/CatalogSimilar"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type StageFormModalProps = {
  onClose: () => void
  onSaved: () => void
  stage?: AcademicStage
}

// Registers or edits a stage of the institution (Educação Infantil, Ensino Fundamental...): its name,
// unique in the institution, and its order in the lists (the order never identifies it). Renaming keeps
// the stage, and every grade and class that refers to it.
export const StageFormModal = (props: StageFormModalProps) => {
  const { onClose, onSaved, stage } = props

  const { t } = useTranslation()

  const formId = useId()

  const [name, setName] = useState(stage?.name ?? "")
  const [sortOrder, setSortOrder] = useState(String(stage?.sortOrder ?? 0))
  const [nameError, setNameError] = useState("")

  const isEdit = Boolean(stage)
  const { clearConflict, clearFieldError, conflict, failure, fieldError, isSaving, save } = useCatalogSave({
    duplicate: { field: "name", message: t("gradeLevels.stages.form.nameInUse") },
    isNew: !isEdit,
    onSaved,
    readAgain: stage ? () => getAcademicStage(stage.id, { showLoading: false }) : undefined,
    successMessage: isEdit ? t("gradeLevels.stages.form.updated") : t("gradeLevels.stages.form.created"),
  })
  const version = conflict?.version ?? stage?.version
  const isChanged = name !== (stage?.name ?? "") || sortOrder !== String(stage?.sortOrder ?? 0)

  useUnsavedChanges(isChanged && !isSaving)

  const submit = () => {
    if (!name.trim()) {
      setNameError(t("gradeLevels.stages.form.nameRequired"))
      return
    }
    const request = { name: name.trim(), sortOrder: Number(sortOrder) || 0 }
    void save(() => (stage ? updateAcademicStage(stage.id, { ...request, version }) : createAcademicStage(request)))
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
            {isEdit ? t("common.save") : t("gradeLevels.stages.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={
        isEdit
          ? t("gradeLevels.stages.form.editTitle", { name: stage?.name })
          : t("gradeLevels.stages.form.createTitle")
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

          <Input
            error={nameError || (fieldError?.field === "name" ? fieldError.message : undefined)}
            maxLength={academicLimits.name}
            onChange={(event) => {
              setName(event.target.value)
              setNameError("")
              clearFieldError()
            }}
            placeholder={t("gradeLevels.stages.form.namePlaceholder")}
            title={t("gradeLevels.stages.form.name")}
            value={name}
            required
          />
          {!isEdit && <CatalogSimilar kind="stages" term={name} />}

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
