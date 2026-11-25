import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicOffer, AcademicSubject } from "@/models"
import { getAcademicOffer, setAcademicOfferSubjects } from "@/services/academicCatalog"

import { ConflictNotice } from "../MyOrganization/shared/ConflictNotice"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type OfferSubjectsModalProps = {
  // The offer's name to show: its grade, unit and period.
  label: string
  offer: AcademicOffer
  subjects: AcademicSubject[]
  onClose: () => void
  onSaved: () => void
}

// The subjects an offer teaches: the whole list is chosen at once and replaces the current one. Only
// active subjects are offered; one the offer already has that was inactivated meanwhile shows as such,
// to be taken out. If someone else changed the offer meanwhile, it is read again and the choice kept.
export const OfferSubjectsModal = (props: OfferSubjectsModalProps) => {
  const { label, offer, onClose, onSaved, subjects } = props

  const { t } = useTranslation()

  const [original] = useState(() => [...offer.subjectIds].sort().join(","))
  const [selected, setSelected] = useState<number[]>(offer.subjectIds)

  const { clearConflict, conflict, failure, isSaving, save } = useCatalogSave<AcademicOffer>({
    duplicate: { field: "", message: "" },
    isNew: false,
    onSaved,
    readAgain: () => getAcademicOffer(offer.id, { showLoading: false }),
    successMessage: t("offers.subjects.saved"),
  })
  const version = conflict?.version ?? offer.version
  const choices = subjects.filter((subject) => subject.status === "ACTIVE" || offer.subjectIds.includes(subject.id))
  const isChanged = [...selected].sort().join(",") !== original
  const nameOf = (id: number) => subjects.find((subject) => subject.id === id)?.name ?? ""

  useUnsavedChanges(isChanged && !isSaving)

  const toggle = (id: number, checked: boolean) =>
    setSelected((current) => (checked ? [...current, id] : current.filter((item) => item !== id)))

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        <>
          <Button disabled={isSaving} onClick={onClose} variant="outlined">
            {t("common.cancel")}
          </Button>
          <Button
            disabled={isSaving || !isChanged}
            onClick={() => void save(() => setAcademicOfferSubjects(offer.id, { subjectIds: selected, version }))}
          >
            {t("common.save")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("offers.subjects.title", { offer: label })}
      open
    >
      <FormFields aria-label={t("offers.subjects.label")} role="group">
        <Text color="secondary" fontSize="sm">
          {t("offers.subjects.description")}
        </Text>

        {conflict && (
          <ConflictNotice
            current={<Text fontSize="sm">{conflict.subjectIds.map(nameOf).join(", ") || t("offers.noSubjects")}</Text>}
            onDiscard={() => {
              setSelected(conflict.subjectIds)
              clearConflict()
            }}
          />
        )}

        {failure && (
          <Text color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}

        {choices.length === 0 && (
          <Text color="warning" fontSize="sm">
            {t("offers.subjects.noneActive")}
          </Text>
        )}
        {choices.map((subject) => (
          <Checkbox
            key={subject.id}
            checked={selected.includes(subject.id)}
            label={
              subject.status === "ACTIVE"
                ? `${subject.code} · ${subject.name}`
                : t("offers.subjects.inactive", { name: `${subject.code} · ${subject.name}` })
            }
            onChange={(_event, checked) => toggle(subject.id, checked)}
          />
        ))}
      </FormFields>
    </Modal>
  )
}
