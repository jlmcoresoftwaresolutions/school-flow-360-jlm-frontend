import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox, DateInput, DescriptionList, Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicPeriod } from "@/models"
import { createAcademicPeriod, getAcademicPeriod, updateAcademicPeriod } from "@/services/academicPeriods"
import { getErrorCode, getErrorMessage, getErrorStatus } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"

import { ConflictNotice } from "../MyOrganization/shared/ConflictNotice"
import { readDependencyMessage } from "../shared/academic/academicBlockers"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { FieldRow } from "../shared/people/people.styles"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import {
  emptyPeriod,
  isSamePeriod,
  type PeriodFormErrors,
  type PeriodFormValues,
  periodKinds,
  periodLimits,
  toPeriodFormValues,
  toPeriodWrite,
} from "./periodForm"

export type PeriodFormModalProps = {
  units: AcademicUnits
  onClose: () => void
  // The period was saved (or the list has to be read again: no answer, or gone meanwhile).
  onSaved: () => void
  // The period to edit; none creates one.
  period?: AcademicPeriod
}

// Registers or edits a school period (P04-S02): its name, reference year, kind, dates and units. The
// form is reviewed before saving, so the person sees what will be saved; a new period is saved
// CONFIGURED (saving never activates it). Every refusal of the backend goes back to the form, on its
// field, with what was typed: the dates out of order or overlapping another period of the same kind in a
// unit, a name already used in the year. If someone changed the period meanwhile, it is read again and
// the form keeps the draft, so saving again goes over it knowingly.
export const PeriodFormModal = (props: PeriodFormModalProps) => {
  const { onClose, onSaved, period, units } = props

  const { t } = useTranslation()
  const { blockerText, dateRange, periodKindLabel } = useAcademicLabels(units)
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [original] = useState<PeriodFormValues>(() => (period ? toPeriodFormValues(period) : emptyPeriod()))
  const [values, setValues] = useState<PeriodFormValues>(original)
  const [step, setStep] = useState<"form" | "review">("form")
  const [errors, setErrors] = useState<PeriodFormErrors>({})
  const [failure, setFailure] = useState("")
  const [current, setCurrent] = useState<AcademicPeriod | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = Boolean(period)
  const version = current?.version ?? period?.version
  const kindOptions = periodKinds.map((kind) => ({ label: periodKindLabel(kind), value: kind }))
  // The units the person may choose, plus any unit the period already has (shown, but locked).
  const unitChoices = [
    ...units.manageableUnits,
    ...units.units.filter(
      (unit) => values.unitIds.includes(unit.id) && !units.manageableUnits.some((item) => item.id === unit.id),
    ),
  ]
  const isChanged = !isSamePeriod(values, original)

  useUnsavedChanges(isChanged && !isSaving)

  const set = <K extends keyof PeriodFormValues>(key: K, next: PeriodFormValues[K]) => {
    setValues((currentValues) => ({ ...currentValues, [key]: next }))
    setErrors((currentErrors) => ({ ...currentErrors, [key]: undefined }))
  }

  const toggleUnit = (unitId: number, checked: boolean) =>
    set("unitIds", checked ? [...values.unitIds, unitId] : values.unitIds.filter((id) => id !== unitId))

  const validate = (): PeriodFormErrors => {
    const found: PeriodFormErrors = {}
    if (!values.name.trim()) found.name = t("periods.form.nameRequired")
    if (!/^\d{4}$/.test(values.referenceYear.trim())) found.referenceYear = t("periods.form.yearInvalid")
    if (!values.kind) found.kind = t("periods.form.kindRequired")
    if (!values.startDate) found.startDate = t("periods.form.startRequired")
    if (!values.endDate) found.endDate = t("periods.form.endRequired")
    if (values.startDate && values.endDate && toIsoDate(values.startDate) > toIsoDate(values.endDate)) {
      found.startDate = t("periods.form.rangeInvalid")
      found.endDate = t("periods.form.rangeInvalid")
    }
    if (values.unitIds.length === 0) found.unitIds = t("periods.form.unitsRequired")
    return found
  }

  const review = () => {
    const found = validate()
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length === 0) setStep("review")
  }

  const backToForm = (found: PeriodFormErrors, message = "") => {
    setErrors(found)
    setFailure(message)
    setStep("form")
  }

  const readAgain = async () => {
    if (!period) return
    try {
      setCurrent(await getAcademicPeriod(period.id, { showLoading: false }))
    } catch {
      // Reading it again failed too: the notice still says what happened.
    }
  }

  const save = async () => {
    setIsSaving(true)
    try {
      if (period) await updateAcademicPeriod(period.id, toPeriodWrite(values, version))
      else await createAcademicPeriod(toPeriodWrite(values))
      toast.success(isEdit ? t("periods.form.updated") : t("periods.form.created"))
      onSaved()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_INVALID_RANGE") {
        backToForm({ endDate: t("periods.form.rangeInvalid"), startDate: t("periods.form.rangeInvalid") })
      } else if (code === "ACADEMIC_PERIOD_OVERLAP") {
        backToForm({ endDate: t("periods.form.overlap"), startDate: t("periods.form.overlap") })
      } else if (code === "ACADEMIC_DUPLICATE_CODE") {
        backToForm({ name: t("periods.form.nameInUse") })
      } else if (code === "ACADEMIC_DEPENDENCY_ACTIVE") {
        const dependencies = readDependencyMessage(getErrorMessage(error)).map(blockerText).join(" ")
        backToForm({}, t("periods.form.dependencies", { dependencies }))
      } else if (code === "VERSION_CONFLICT") {
        backToForm({})
        await readAgain()
      } else if (getErrorStatus(error) === 403) {
        backToForm({ unitIds: t("periods.form.unitsOutOfScope") })
      } else if (code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("periods.gone"))
        onSaved()
      } else if (getErrorStatus(error) === undefined && !isEdit) {
        // No idempotency in the academic area: the list is read before any new attempt.
        toast.error(t("periods.form.noAnswer"))
        onSaved()
      } else {
        backToForm({}, toFailureMessage(t("periods.form.failed"), error))
      }
    }
  }

  const unitNames = values.unitIds
    .map((unitId) => units.nameOf(unitId) ?? t("academic.unitNumber", { id: unitId }))
    .join(", ")

  const renderForm = () => (
    <FormFields>
      {current && (
        <ConflictNotice
          current={
            <Text fontSize="sm">
              {[
                current.name,
                current.referenceYear,
                periodKindLabel(current.kind),
                dateRange(current.startDate, current.endDate),
              ].join(" · ")}
            </Text>
          }
          onDiscard={() => {
            setValues(toPeriodFormValues(current))
            setCurrent(null)
          }}
        />
      )}

      {failure && (
        <Text color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}

      <Input
        error={errors.name}
        maxLength={periodLimits.name}
        onChange={(event) => set("name", event.target.value)}
        placeholder={t("periods.form.namePlaceholder")}
        title={t("periods.form.name")}
        value={values.name}
        required
      />

      <FieldRow>
        <Input
          error={errors.referenceYear}
          inputMode="numeric"
          maxLength={4}
          onChange={(event) => set("referenceYear", event.target.value.replace(/[^\d]/g, ""))}
          placeholder={t("periods.form.yearPlaceholder")}
          title={t("periods.form.year")}
          value={values.referenceYear}
          required
        />
        <Select
          error={errors.kind}
          noOptionsMessage={t("common.noOptions")}
          onChange={(option) => set("kind", (option?.value ?? "") as PeriodFormValues["kind"])}
          options={kindOptions}
          placeholder={t("periods.form.kindPlaceholder")}
          title={t("periods.form.kind")}
          value={kindOptions.find((option) => option.value === values.kind) ?? null}
          required
        />
      </FieldRow>

      <FieldRow>
        <DateInput
          clearLabel={t("people.form.clearDate")}
          error={errors.startDate}
          onChange={(date) => set("startDate", date)}
          placeholder={t("common.datePlaceholder")}
          title={t("periods.form.startDate")}
          value={values.startDate}
          required
        />
        <DateInput
          clearLabel={t("people.form.clearDate")}
          error={errors.endDate}
          onChange={(date) => set("endDate", date)}
          placeholder={t("common.datePlaceholder")}
          title={t("periods.form.endDate")}
          value={values.endDate}
          required
        />
      </FieldRow>

      <FormFields aria-label={t("periods.form.units")} role="group">
        <Text as="h3" fontSize="sm" semibold>
          {t("periods.form.units")}
        </Text>
        <Text color="secondary" fontSize="sm">
          {t("periods.form.unitsHelper")}
        </Text>
        {unitChoices.length === 0 && (
          <Text color="warning" fontSize="sm">
            {t("periods.form.noUnits")}
          </Text>
        )}
        {unitChoices.map((unit) => (
          <Checkbox
            key={unit.id}
            checked={values.unitIds.includes(unit.id)}
            disabled={!units.manageableUnits.some((item) => item.id === unit.id)}
            label={unit.name}
            onChange={(_event, checked) => toggleUnit(unit.id, checked)}
          />
        ))}
        {errors.unitIds && (
          <Text color="danger" fontSize="sm" role="alert">
            {errors.unitIds}
          </Text>
        )}
      </FormFields>
    </FormFields>
  )

  const renderReview = () => (
    <FormFields>
      <Text color="secondary" fontSize="sm">
        {isEdit ? t("periods.form.reviewEdit") : t("periods.form.reviewCreate")}
      </Text>
      <DescriptionList
        columns={1}
        items={[
          { key: "name", label: t("periods.form.name"), value: values.name.trim() },
          { key: "year", label: t("periods.form.year"), value: values.referenceYear },
          { key: "kind", label: t("periods.form.kind"), value: values.kind ? periodKindLabel(values.kind) : "" },
          {
            key: "dates",
            label: t("periods.validity"),
            value:
              values.startDate && values.endDate
                ? dateRange(toIsoDate(values.startDate), toIsoDate(values.endDate))
                : "",
          },
          { key: "units", label: t("periods.form.units"), value: unitNames },
        ]}
      />
    </FormFields>
  )

  return (
    <Modal
      closeLabel={t("common.close")}
      closeOnBackdropClick={false}
      footer={
        step === "form" ? (
          <>
            <Button onClick={onClose} variant="outlined">
              {t("common.cancel")}
            </Button>
            <Button form={formId} type="submit">
              {t("periods.form.review")}
            </Button>
          </>
        ) : (
          <>
            <Button disabled={isSaving} onClick={() => setStep("form")} variant="outlined">
              {t("periods.form.backToEdit")}
            </Button>
            <Button disabled={isSaving} onClick={() => void save()}>
              {isEdit ? t("periods.form.saveEdit") : t("periods.form.saveCreate")}
            </Button>
          </>
        )
      }
      onClose={onClose}
      size="md"
      title={isEdit ? t("periods.form.editTitle", { name: period?.name }) : t("periods.form.createTitle")}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          review()
        }}
        noValidate
      >
        {step === "form" ? renderForm() : renderReview()}
      </form>
    </Modal>
  )
}
