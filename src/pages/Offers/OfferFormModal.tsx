import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicGrade, AcademicOffer, AcademicPeriod, AcademicStage } from "@/models"
import { createAcademicOffer } from "@/services/academicCatalog"

import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type OfferFormModalProps = {
  grades: AcademicGrade[]
  periods: AcademicPeriod[]
  stages: AcademicStage[]
  units: AcademicUnits
  onClose: () => void
  // The offer was created (it goes on to its subjects), or the list has to be read again.
  onSaved: (offer?: AcademicOffer) => void
}

// Offers a grade in a unit and a period: the unit among the active ones the person manages, the period
// among the ones not closed that include that unit, the grade among the active ones (with its stage).
// The three never change after (another combination is another offer), and each combination exists once.
// The subjects come right after, in their own step.
export const OfferFormModal = (props: OfferFormModalProps) => {
  const { grades, onClose, onSaved, periods, stages, units } = props

  const { t } = useTranslation()

  const formId = useId()

  const [unitId, setUnitId] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [gradeId, setGradeId] = useState("")
  const [errors, setErrors] = useState<{ grade?: string; period?: string; unit?: string }>({})

  const { failure, fieldError, isSaving, save } = useCatalogSave({
    duplicate: { field: "grade", message: t("offers.form.duplicate") },
    isNew: true,
    onSaved: (saved) => onSaved(saved as AcademicOffer | undefined),
    successMessage: t("offers.form.created"),
  })

  const stageName = (stageId: number) => stages.find((stage) => stage.id === stageId)?.name ?? ""
  const unitOptions = units.manageableUnits.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const periodOptions = periods
    .filter((period) => period.status !== "CLOSED" && period.unitIds.includes(Number(unitId)))
    .map((period) => ({ label: period.name, value: String(period.id) }))
  const gradeOptions = grades
    .filter((grade) => grade.status === "ACTIVE")
    .map((grade) => ({ label: `${stageName(grade.stageId)} · ${grade.name}`, value: String(grade.id) }))

  useUnsavedChanges((unitId !== "" || gradeId !== "") && !isSaving)

  const submit = () => {
    const found: typeof errors = {}
    if (!unitId) found.unit = t("offers.form.unitRequired")
    if (!periodId) found.period = t("offers.form.periodRequired")
    if (!gradeId) found.grade = t("offers.form.gradeRequired")
    setErrors(found)
    if (Object.keys(found).length > 0) return

    void save(() =>
      createAcademicOffer({ gradeId: Number(gradeId), periodId: Number(periodId), unitId: Number(unitId) }),
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
            {t("offers.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("offers.form.createTitle")}
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
            {t("offers.form.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Select
            error={errors.unit}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setUnitId(option?.value ?? "")
              setPeriodId("")
              setErrors((current) => ({ ...current, unit: undefined }))
            }}
            options={unitOptions}
            placeholder={t("offers.form.unitPlaceholder")}
            title={t("offers.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
            required
          />
          <Select
            error={errors.period}
            helperText={unitId && periodOptions.length === 0 ? t("offers.form.noPeriods") : undefined}
            isDisabled={!unitId}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setPeriodId(option?.value ?? "")
              setErrors((current) => ({ ...current, period: undefined }))
            }}
            options={periodOptions}
            placeholder={t("offers.form.periodPlaceholder")}
            title={t("offers.period")}
            value={periodOptions.find((option) => option.value === periodId) ?? null}
            required
          />
          <Select
            error={errors.grade || (fieldError?.field === "grade" ? fieldError.message : undefined)}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setGradeId(option?.value ?? "")
              setErrors((current) => ({ ...current, grade: undefined }))
            }}
            options={gradeOptions}
            placeholder={t("offers.form.gradePlaceholder")}
            title={t("offers.grade")}
            value={gradeOptions.find((option) => option.value === gradeId) ?? null}
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
