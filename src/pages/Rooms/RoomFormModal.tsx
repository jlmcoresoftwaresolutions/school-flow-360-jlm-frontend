import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicRoom } from "@/models"
import { createAcademicRoom, updateAcademicRoom } from "@/services/academicCatalog"

import { academicLimits } from "../shared/academic/academicLimits"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type RoomFormModalProps = {
  // The unit the room belongs to, by name.
  unitName: string
  unitId: number
  onClose: () => void
  onSaved: () => void
  // The room to rename; none registers one.
  room?: AcademicRoom
}

// Registers a physical room in a unit, or renames one (a room never changes unit). The name is unique in
// the unit, compared without case or accents: a repeated one is pointed out on its field. The backend has
// no reading of a single room, so a rename that meets a change by someone else reads the list again.
export const RoomFormModal = (props: RoomFormModalProps) => {
  const { onClose, onSaved, room, unitId, unitName } = props

  const { t } = useTranslation()

  const formId = useId()

  const [name, setName] = useState(room?.name ?? "")
  const [error, setError] = useState("")

  const isEdit = Boolean(room)
  const { clearFieldError, failure, fieldError, isSaving, save } = useCatalogSave({
    duplicate: { field: "name", message: t("rooms.form.nameInUse") },
    isNew: !isEdit,
    onSaved,
    successMessage: isEdit ? t("rooms.form.updated") : t("rooms.form.created"),
  })
  const isChanged = name !== (room?.name ?? "")

  useUnsavedChanges(isChanged && !isSaving)

  const submit = () => {
    if (!name.trim()) {
      setError(t("rooms.form.nameRequired"))
      return
    }

    const request = { name: name.trim(), unitId }
    void save(() =>
      room ? updateAcademicRoom(room.id, { ...request, version: room.version }) : createAcademicRoom(request),
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
          <Button disabled={isSaving || (isEdit && !isChanged)} form={formId} type="submit">
            {isEdit ? t("common.save") : t("rooms.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="sm"
      title={room ? t("rooms.form.editTitle", { name: room.name }) : t("rooms.form.createTitle")}
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
          <Text color="secondary" fontSize="sm">
            {t("rooms.form.description", { unit: unitName })}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Input
            error={error || (fieldError?.field === "name" ? fieldError.message : undefined)}
            maxLength={academicLimits.name}
            onChange={(event) => {
              setName(event.target.value)
              setError("")
              clearFieldError()
            }}
            placeholder={t("rooms.form.namePlaceholder")}
            title={t("rooms.form.name")}
            value={name}
            autoFocus
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
