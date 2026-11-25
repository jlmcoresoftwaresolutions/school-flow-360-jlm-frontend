import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox, Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type {
  AcademicClass,
  AcademicGrade,
  AcademicOffer,
  AcademicPeriod,
  AcademicRoom,
  AcademicShiftCode,
  AcademicStage,
  AcademicSubject,
} from "@/models"
import { listAcademicOffers, listAcademicRooms } from "@/services/academicCatalog"
import { createAcademicClass, getAcademicClass, updateAcademicClass } from "@/services/academicClasses"

import { ConflictNotice } from "../MyOrganization/shared/ConflictNotice"
import { academicLimits, academicMaxPageSize } from "../shared/academic/academicLimits"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useCatalogSave } from "../shared/academic/useCatalogSave"
import { FieldRow } from "../shared/people/people.styles"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type ClassFormModalProps = {
  grades: AcademicGrade[]
  periods: AcademicPeriod[]
  stages: AcademicStage[]
  subjects: AcademicSubject[]
  units: AcademicUnits
  onClose: () => void
  // Saved (with the class the backend answered), or the list has to be read again (without it).
  onSaved: (saved?: AcademicClass) => void
  // The class to edit (only its name, shift and room); none creates one.
  schoolClass?: AcademicClass
}

type Values = {
  capacity: string
  code: string
  gradeId: string
  name: string
  noPhysicalRoom: boolean
  periodId: string
  roomId: string
  shift: "" | AcademicShiftCode
  subjectIds: number[]
  unitId: string
}

type Errors = Partial<Record<"capacity" | "code" | "grade" | "name" | "period" | "room" | "shift" | "unit", string>>

const shifts: AcademicShiftCode[] = ["MANHA", "TARDE", "NOITE", "INTEGRAL"]

const toValues = (schoolClass?: AcademicClass): Values => ({
  capacity: schoolClass ? String(schoolClass.capacity) : "",
  code: schoolClass?.code ?? "",
  gradeId: schoolClass ? String(schoolClass.gradeId) : "",
  name: schoolClass?.name ?? "",
  noPhysicalRoom: schoolClass?.noPhysicalRoom ?? false,
  periodId: schoolClass ? String(schoolClass.periodId) : "",
  roomId: schoolClass?.roomId ? String(schoolClass.roomId) : "",
  shift: schoolClass?.shift ?? "",
  subjectIds: schoolClass?.subjectIds ?? [],
  unitId: schoolClass ? String(schoolClass.unitId) : "",
})

// Creates a class, or edits one. A class is born in PREPARATION inside an active offer: the unit among
// the active ones the person manages, the period among the ones not closed that include it, and the
// grade among the unit's active offers in that period, whose subjects it teaches (all of them to begin
// with). Its code is unique in the unit and period; the capacity is a whole number; the room is an active
// room of the unit, or the class is marked as having no physical room - never both, never neither. Unit,
// period, grade, code and capacity never change here (the capacity has its own review): editing changes
// the name, the shift and the room, and a change by someone else meanwhile is read again, keeping the draft.
export const ClassFormModal = (props: ClassFormModalProps) => {
  const { grades, onClose, onSaved, periods, schoolClass, stages, subjects, units } = props

  const { t } = useTranslation()
  const { shiftLabel } = useAcademicLabels()

  const formId = useId()

  const [original] = useState(() => toValues(schoolClass))
  const [values, setValues] = useState<Values>(original)
  const [errors, setErrors] = useState<Errors>({})
  const [offers, setOffers] = useState<{ items: AcademicOffer[]; key: string } | null>(null)
  const [rooms, setRooms] = useState<{ items: AcademicRoom[]; unitId: string } | null>(null)

  const isEdit = Boolean(schoolClass)
  const { clearConflict, clearFieldError, conflict, failure, fieldError, isSaving, save } =
    useCatalogSave<AcademicClass>({
      duplicate: { field: "code", message: t("classes.form.codeInUse") },
      isNew: !isEdit,
      onSaved: (saved) => onSaved(saved as AcademicClass | undefined),
      readAgain: schoolClass ? () => getAcademicClass(schoolClass.id, { showLoading: false }) : undefined,
      successMessage: isEdit ? t("classes.form.updated") : t("classes.form.created"),
    })
  const offersKey = `${values.unitId}:${values.periodId}`
  const unitOffers = offers?.key === offersKey ? offers.items : []
  const unitRooms = rooms?.unitId === values.unitId ? rooms.items : []
  const chosenOffer = unitOffers.find((offer) => String(offer.gradeId) === values.gradeId)
  const version = conflict?.version ?? schoolClass?.version
  const isChanged = JSON.stringify(values) !== JSON.stringify(original)

  const stageName = (stageId?: number) => stages.find((stage) => stage.id === stageId)?.name ?? ""
  const gradeLabel = (gradeId: number) => {
    const grade = grades.find((item) => item.id === gradeId)
    return grade ? `${stageName(grade.stageId)} · ${grade.name}` : ""
  }
  const subjectLabel = (subjectId: number) => {
    const subject = subjects.find((item) => item.id === subjectId)
    return subject ? `${subject.code} · ${subject.name}` : ""
  }
  const roomName = (roomId: number | null) => unitRooms.find((room) => room.id === roomId)?.name

  const unitOptions = units.manageableUnits.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const periodOptions = periods
    .filter((period) => period.status !== "CLOSED" && period.unitIds.includes(Number(values.unitId)))
    .map((period) => ({ label: period.name, value: String(period.id) }))
  const gradeOptions = unitOffers.map((offer) => ({ label: gradeLabel(offer.gradeId), value: String(offer.gradeId) }))
  const shiftOptions = shifts.map((shift) => ({ label: shiftLabel(shift), value: shift }))
  const roomOptions = unitRooms
    .filter((room) => room.status === "ACTIVE" || String(room.id) === original.roomId)
    .map((room) => ({ label: room.name, value: String(room.id) }))

  useUnsavedChanges(isChanged && !isSaving)

  // The unit's active offers in the period (the grades a class may be born in), read again for each pair.
  useEffect(() => {
    if (isEdit || !values.unitId || !values.periodId) return

    let isStale = false
    const key = `${values.unitId}:${values.periodId}`

    const load = async () => {
      try {
        const page = await listAcademicOffers(
          {
            periodId: Number(values.periodId),
            size: academicMaxPageSize,
            status: "ACTIVE",
            unitId: Number(values.unitId),
          },
          { showLoading: false },
        )
        if (!isStale) setOffers({ items: page.items, key })
      } catch {
        if (!isStale) setOffers({ items: [], key })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [isEdit, values.periodId, values.unitId])

  // The unit's rooms, for the room of the class.
  useEffect(() => {
    if (!values.unitId) return

    let isStale = false
    const unitId = values.unitId

    const load = async () => {
      try {
        const items = await listAcademicRooms({ unitId: Number(unitId) }, { showLoading: false })
        if (!isStale) setRooms({ items, unitId })
      } catch {
        if (!isStale) setRooms({ items: [], unitId })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [values.unitId])

  const set = (changes: Partial<Values>, cleared: (keyof Errors)[]) => {
    setValues((current) => ({ ...current, ...changes }))
    setErrors((current) => {
      const next = { ...current }
      cleared.forEach((key) => delete next[key])
      return next
    })
  }

  const toggleSubject = (subjectId: number, checked: boolean) =>
    set(
      {
        subjectIds: checked
          ? [...values.subjectIds, subjectId]
          : values.subjectIds.filter((item) => item !== subjectId),
      },
      [],
    )

  const validate = () => {
    const found: Errors = {}
    if (!isEdit) {
      if (!values.unitId) found.unit = t("classes.form.unitRequired")
      if (!values.periodId) found.period = t("classes.form.periodRequired")
      if (!values.gradeId) found.grade = t("classes.form.gradeRequired")
      if (!values.code.trim()) found.code = t("classes.form.codeRequired")
      if (!values.capacity) found.capacity = t("classes.form.capacityRequired")
    }
    if (!values.name.trim()) found.name = t("classes.form.nameRequired")
    if (!values.shift) found.shift = t("classes.form.shiftRequired")
    if (!values.noPhysicalRoom && !values.roomId) found.room = t("classes.form.roomRequired")
    return found
  }

  const submit = () => {
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0 || !values.shift) return

    const room = values.noPhysicalRoom ? { noPhysicalRoom: true } : { roomId: Number(values.roomId) }
    if (schoolClass) {
      void save(() =>
        updateAcademicClass(schoolClass.id, {
          name: values.name.trim(),
          shift: values.shift as AcademicShiftCode,
          version: version ?? schoolClass.version,
          ...room,
        }),
      )
      return
    }

    void save(() =>
      createAcademicClass({
        capacity: Number(values.capacity),
        code: values.code.trim(),
        gradeId: Number(values.gradeId),
        name: values.name.trim(),
        periodId: Number(values.periodId),
        shift: values.shift as AcademicShiftCode,
        subjectIds: values.subjectIds,
        unitId: Number(values.unitId),
        ...room,
      }),
    )
  }

  const renderConflict = () => {
    if (!conflict) return null
    const currentRoom = conflict.noPhysicalRoom ? t("classes.noPhysicalRoom") : roomName(conflict.roomId)

    return (
      <ConflictNotice
        current={
          <Text fontSize="sm">
            {[conflict.name, shiftLabel(conflict.shift), currentRoom].filter(Boolean).join(" · ")}
          </Text>
        }
        onDiscard={() => {
          setValues((current) => ({
            ...current,
            name: conflict.name,
            noPhysicalRoom: conflict.noPhysicalRoom,
            roomId: conflict.roomId ? String(conflict.roomId) : "",
            shift: conflict.shift,
          }))
          clearConflict()
        }}
      />
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
            {isEdit ? t("common.save") : t("classes.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={schoolClass ? t("classes.form.editTitle", { name: schoolClass.name }) : t("classes.form.createTitle")}
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
            {isEdit ? t("classes.form.editDescription") : t("classes.form.description")}
          </Text>

          {renderConflict()}

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          {!isEdit && (
            <>
              <Select
                error={errors.unit}
                noOptionsMessage={t("common.noOptions")}
                onChange={(option) =>
                  set({ gradeId: "", periodId: "", roomId: "", subjectIds: [], unitId: option?.value ?? "" }, [
                    "unit",
                    "room",
                  ])
                }
                options={unitOptions}
                placeholder={t("classes.form.unitPlaceholder")}
                title={t("classes.unit")}
                value={unitOptions.find((option) => option.value === values.unitId) ?? null}
                required
              />
              <FieldRow>
                <Select
                  error={errors.period}
                  helperText={values.unitId && periodOptions.length === 0 ? t("classes.form.noPeriods") : undefined}
                  isDisabled={!values.unitId}
                  noOptionsMessage={t("common.noOptions")}
                  onChange={(option) => set({ gradeId: "", periodId: option?.value ?? "", subjectIds: [] }, ["period"])}
                  options={periodOptions}
                  placeholder={t("classes.form.periodPlaceholder")}
                  title={t("classes.period")}
                  value={periodOptions.find((option) => option.value === values.periodId) ?? null}
                  required
                />
                <Select
                  error={errors.grade}
                  helperText={
                    values.periodId && offers?.key === offersKey && gradeOptions.length === 0
                      ? t("classes.form.noOffers")
                      : undefined
                  }
                  isDisabled={!values.periodId}
                  noOptionsMessage={t("common.noOptions")}
                  onChange={(option) => {
                    const offer = unitOffers.find((item) => String(item.gradeId) === option?.value)
                    set({ gradeId: option?.value ?? "", subjectIds: offer?.subjectIds ?? [] }, ["grade"])
                  }}
                  options={gradeOptions}
                  placeholder={t("classes.form.gradePlaceholder")}
                  title={t("classes.grade")}
                  value={gradeOptions.find((option) => option.value === values.gradeId) ?? null}
                  required
                />
              </FieldRow>
              <FieldRow>
                <Input
                  error={errors.code || (fieldError?.field === "code" ? fieldError.message : undefined)}
                  maxLength={academicLimits.code}
                  onChange={(event) => {
                    set({ code: event.target.value }, ["code"])
                    clearFieldError()
                  }}
                  placeholder={t("classes.form.codePlaceholder")}
                  title={t("classes.code")}
                  value={values.code}
                  required
                />
                <Input
                  error={errors.capacity}
                  helperText={t("classes.form.capacityHelper")}
                  maxLength={4}
                  onChange={(event) => set({ capacity: event.target.value }, ["capacity"])}
                  placeholder={t("classes.form.capacityPlaceholder")}
                  title={t("classes.capacity")}
                  value={values.capacity}
                  numeric
                  required
                />
              </FieldRow>
            </>
          )}

          <FieldRow>
            <Input
              error={errors.name}
              maxLength={academicLimits.name}
              onChange={(event) => set({ name: event.target.value }, ["name"])}
              placeholder={t("classes.form.namePlaceholder")}
              title={t("classes.name")}
              value={values.name}
              required
            />
            <Select
              error={errors.shift}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => set({ shift: (option?.value as AcademicShiftCode | undefined) ?? "" }, ["shift"])}
              options={shiftOptions}
              placeholder={t("classes.form.shiftPlaceholder")}
              title={t("classes.shift")}
              value={shiftOptions.find((option) => option.value === values.shift) ?? null}
              required
            />
          </FieldRow>

          <Select
            error={errors.room}
            helperText={
              values.unitId && rooms?.unitId === values.unitId && roomOptions.length === 0
                ? t("classes.form.noRooms")
                : undefined
            }
            isDisabled={!values.unitId || values.noPhysicalRoom}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => set({ roomId: option?.value ?? "" }, ["room"])}
            options={roomOptions}
            placeholder={t("classes.form.roomPlaceholder")}
            title={t("classes.room")}
            value={roomOptions.find((option) => option.value === values.roomId) ?? null}
            required={!values.noPhysicalRoom}
          />
          <Checkbox
            checked={values.noPhysicalRoom}
            helperText={t("classes.form.noPhysicalRoomHelper")}
            label={t("classes.form.noPhysicalRoom")}
            onChange={(_event, checked) => set({ noPhysicalRoom: checked, roomId: "" }, ["room"])}
          />

          {!isEdit && chosenOffer && (
            <FormFields aria-label={t("classes.form.subjectsLabel")} role="group">
              <Text fontSize="sm" semibold>
                {t("classes.form.subjectsLabel")}
              </Text>
              {chosenOffer.subjectIds.length === 0 && (
                <Text color="warning" fontSize="sm">
                  {t("classes.form.offerWithoutSubjects")}
                </Text>
              )}
              {chosenOffer.subjectIds.map((subjectId) => (
                <Checkbox
                  key={subjectId}
                  checked={values.subjectIds.includes(subjectId)}
                  label={subjectLabel(subjectId)}
                  onChange={(_event, checked) => toggleSubject(subjectId, checked)}
                />
              ))}
            </FormFields>
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
