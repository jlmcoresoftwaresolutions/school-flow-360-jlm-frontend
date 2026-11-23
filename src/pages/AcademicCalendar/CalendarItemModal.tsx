import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox, DateInput, Input, Select, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicCalendarCategory, AcademicCalendarItem, AcademicPeriod } from "@/models"
import {
  createAcademicCalendarItem,
  getAcademicCalendarItem,
  updateAcademicCalendarItem,
} from "@/services/academicCalendar"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { ConflictNotice } from "../MyUnit/shared/ConflictNotice"
import { academicLimits } from "../shared/academic/academicLimits"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FieldRow } from "../shared/people/people.styles"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type CalendarItemModalProps = {
  period: AcademicPeriod
  // The unit being prepared: a new item starts in it.
  unitId: number
  units: AcademicUnits
  onClose: () => void
  onSaved: () => void
  // The item to edit; none creates one.
  item?: AcademicCalendarItem
}

type Values = {
  category: "" | AcademicCalendarCategory
  description: string
  end: Date | null
  start: Date | null
  title: string
  unitIds: number[]
}

type Errors = Partial<Record<"category" | "end" | "start" | "title" | "units", string>>

const categories: AcademicCalendarCategory[] = ["DIA_LETIVO", "FERIADO", "EVENTO"]

// Prepares an item of the calendar: a school day, a holiday or an event, with its title, an optional
// description, the dates (inclusive, inside the period) and the units it applies to (the period's active
// units the person manages). Saving never publishes: the published version only changes when it is
// published again. If someone else changed the item meanwhile, it is read again, keeping the draft.
export const CalendarItemModal = (props: CalendarItemModalProps) => {
  const { item, onClose, onSaved, period, unitId, units } = props

  const { t } = useTranslation()
  const { calendarCategoryLabel } = useAcademicLabels()

  const formId = useId()

  const [original] = useState<Values>(() => ({
    category: item?.category ?? "",
    description: item?.description ?? "",
    end: item ? fromIsoDate(item.endDate) : null,
    start: item ? fromIsoDate(item.startDate) : null,
    title: item?.title ?? "",
    unitIds: item?.unitIds ?? [unitId],
  }))
  const [values, setValues] = useState<Values>(original)
  const [errors, setErrors] = useState<Errors>({})

  const isEdit = Boolean(item)
  const { clearConflict, clearFieldError, conflict, failure, fieldError, isSaving, save } =
    useCatalogSave<AcademicCalendarItem>({
      duplicate: { field: "", message: "" },
      isNew: !isEdit,
      onSaved,
      readAgain: item ? () => getAcademicCalendarItem(item.id, { showLoading: false }) : undefined,
      successMessage: isEdit ? t("academicCalendar.form.updated") : t("academicCalendar.form.created"),
    })
  const startIso = values.start ? toIsoDate(values.start) : ""
  const endIso = values.end ? toIsoDate(values.end) : ""
  const isChanged =
    values.category !== original.category ||
    values.title !== original.title ||
    values.description !== original.description ||
    startIso !== (original.start ? toIsoDate(original.start) : "") ||
    endIso !== (original.end ? toIsoDate(original.end) : "") ||
    [...values.unitIds].sort().join(",") !== [...original.unitIds].sort().join(",")
  const unitChoices = units.manageableUnits.filter(
    (unit) => period.unitIds.includes(unit.id) || values.unitIds.includes(unit.id),
  )
  const categoryOptions = categories.map((category) => ({ label: calendarCategoryLabel(category), value: category }))
  const version = conflict?.version ?? item?.version

  useUnsavedChanges(isChanged && !isSaving)

  const set = (changes: Partial<Values>, cleared: (keyof Errors)[]) => {
    setValues((current) => ({ ...current, ...changes }))
    setErrors((current) => {
      const next = { ...current }
      cleared.forEach((key) => delete next[key])
      return next
    })
  }

  const submit = () => {
    const found: Errors = {}
    if (!values.category) found.category = t("academicCalendar.form.categoryRequired")
    if (!values.title.trim()) found.title = t("academicCalendar.form.titleRequired")
    if (!values.start) found.start = t("academicCalendar.form.startRequired")
    if (startIso && endIso && endIso < startIso) found.end = t("academicCalendar.form.endBeforeStart")
    if (startIso && (startIso < period.startDate || startIso > period.endDate)) {
      found.start = t("academicCalendar.form.outOfPeriod")
    }
    if (endIso && (endIso < period.startDate || endIso > period.endDate)) {
      found.end = t("academicCalendar.form.outOfPeriod")
    }
    if (values.unitIds.length === 0) found.units = t("academicCalendar.form.unitsRequired")
    setErrors(found)
    if (Object.keys(found).length > 0 || !values.category) return

    const request = {
      category: values.category,
      description: values.description.trim() || undefined,
      endDate: endIso || startIso,
      periodId: period.id,
      startDate: startIso,
      title: values.title.trim(),
      unitIds: values.unitIds,
    }
    void save(() =>
      item ? updateAcademicCalendarItem(item.id, { ...request, version }) : createAcademicCalendarItem(request),
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
            {isEdit ? t("common.save") : t("academicCalendar.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={
        item ? t("academicCalendar.form.editTitle", { title: item.title }) : t("academicCalendar.form.createTitle")
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
          <Text color="secondary" fontSize="sm">
            {t("academicCalendar.form.description", { period: period.name })}
          </Text>

          {conflict && (
            <ConflictNotice
              current={<Text fontSize="sm">{`${calendarCategoryLabel(conflict.category)} · ${conflict.title}`}</Text>}
              onDiscard={() => {
                setValues({
                  category: conflict.category,
                  description: conflict.description ?? "",
                  end: fromIsoDate(conflict.endDate),
                  start: fromIsoDate(conflict.startDate),
                  title: conflict.title,
                  unitIds: conflict.unitIds,
                })
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
            <Select
              error={errors.category}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) =>
                set({ category: (option?.value as AcademicCalendarCategory | undefined) ?? "" }, ["category"])
              }
              options={categoryOptions}
              placeholder={t("academicCalendar.form.categoryPlaceholder")}
              title={t("academicCalendar.category")}
              value={categoryOptions.find((option) => option.value === values.category) ?? null}
              required
            />
            <Input
              error={errors.title}
              maxLength={academicLimits.name}
              onChange={(event) => set({ title: event.target.value }, ["title"])}
              placeholder={t("academicCalendar.form.titlePlaceholder")}
              title={t("academicCalendar.itemTitle")}
              value={values.title}
              required
            />
          </FieldRow>
          <FieldRow>
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.start || (fieldError?.field === "dates" ? fieldError.message : undefined)}
              onChange={(value) => {
                set({ start: value }, ["start"])
                clearFieldError()
              }}
              placeholder={t("common.datePlaceholder")}
              title={t("academicCalendar.form.start")}
              value={values.start}
              required
            />
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.end}
              helperText={t("academicCalendar.form.endHelper")}
              onChange={(value) => set({ end: value }, ["end"])}
              placeholder={t("common.datePlaceholder")}
              title={t("academicCalendar.form.end")}
              value={values.end}
            />
          </FieldRow>
          <Textarea
            maxLength={academicLimits.reason}
            onChange={(event) => set({ description: event.target.value }, [])}
            placeholder={t("academicCalendar.form.descriptionPlaceholder")}
            title={t("academicCalendar.form.descriptionLabel")}
            value={values.description}
          />
          <FormFields aria-label={t("academicCalendar.form.units")} role="group">
            <Text fontSize="sm" semibold>
              {t("academicCalendar.form.units")}
            </Text>
            {unitChoices.map((unit) => (
              <Checkbox
                key={unit.id}
                checked={values.unitIds.includes(unit.id)}
                label={unit.name}
                onChange={(_event, checked) =>
                  set(
                    {
                      unitIds: checked ? [...values.unitIds, unit.id] : values.unitIds.filter((id) => id !== unit.id),
                    },
                    ["units"],
                  )
                }
              />
            ))}
            {errors.units && (
              <Text color="danger" fontSize="sm" role="alert">
                {errors.units}
              </Text>
            )}
          </FormFields>
        </FormFields>
      </form>
    </Modal>
  )
}
