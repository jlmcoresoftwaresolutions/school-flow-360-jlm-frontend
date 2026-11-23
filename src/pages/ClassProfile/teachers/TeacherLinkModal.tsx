import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox, DateInput, DescriptionList, Select, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicClass, AcademicSubject, AcademicTeacher, AcademicTeacherLink } from "@/models"
import { createAcademicTeacherLink, updateAcademicTeacherLink } from "@/services/academicClasses"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { fromIsoDate, toIsoDate } from "@/utils/dates"

import { academicLimits } from "../../shared/academic/academicLimits"
import { FieldRow } from "../../shared/people/people.styles"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { FormFields } from "../../shared/userAccess/userAccess.styles"
import { todayIso, useCanBackdate } from "./teacherLinkForm"
import { TeacherPicker } from "./TeacherPicker"

export type TeacherLinkModalProps = {
  schoolClass: AcademicClass
  subjects: AcademicSubject[]
  onClose: () => void
  // Saved, or the links have to be read again (changed or gone meanwhile).
  onChanged: () => void
  // The link to edit (its dates and joint teaching); none links a teacher.
  link?: AcademicTeacherLink
}

type Errors = Partial<Record<"end" | "joint" | "reason" | "start" | "subject" | "teacher", string>>

// Links a Professor of the class's unit to one of its subjects, or edits a link not ended. The dates are
// inclusive, inside the period, and an empty end leaves it open; a start or an end in the past is only for
// the Admin and the unit's Coordenação, with a reason. The same teacher never twice in the same subject
// and dates; another teacher only as joint teaching, marked on both links. Linking never creates an
// account; replacing a teacher is ending one link and opening another.
export const TeacherLinkModal = (props: TeacherLinkModalProps) => {
  const { link, onChanged, onClose, schoolClass, subjects } = props

  const { t } = useTranslation()
  const canBackdate = useCanBackdate(schoolClass.unitId)
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [teacher, setTeacher] = useState<AcademicTeacher | null>(null)
  const [subjectId, setSubjectId] = useState("")
  const [start, setStart] = useState<Date | null>(() => fromIsoDate(link?.startDate ?? todayIso()))
  const [end, setEnd] = useState<Date | null>(() => (link?.endDate ? fromIsoDate(link.endDate) : null))
  const [joint, setJoint] = useState(link?.joint ?? false)
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = Boolean(link)
  const startIso = start ? toIsoDate(start) : ""
  const endIso = end ? toIsoDate(end) : ""
  const startChanged = startIso !== (link?.startDate ?? "")
  const endChanged = endIso !== (link?.endDate ?? "")
  const today = todayIso()
  const isBackdated =
    (startChanged && startIso !== "" && startIso < today) || (endChanged && endIso !== "" && endIso < today)
  const isChanged = isEdit
    ? startChanged || endChanged || joint !== link?.joint || reason.trim() !== ""
    : teacher !== null || subjectId !== ""
  const subjectName = (id: number) => {
    const subject = subjects.find((item) => item.id === id)
    return subject ? `${subject.code} · ${subject.name}` : ""
  }
  const subjectOptions = schoolClass.subjectIds.map((id) => ({ label: subjectName(id), value: String(id) }))

  useUnsavedChanges(isChanged && !isSaving)

  const clear = (key: keyof Errors) =>
    setErrors((current) => {
      const next = { ...current }
      delete next[key]
      return next
    })

  const validate = () => {
    const found: Errors = {}
    if (!isEdit && !teacher) found.teacher = t("classTeachers.form.teacherRequired")
    if (!isEdit && !subjectId) found.subject = t("classTeachers.form.subjectRequired")
    if (!start) found.start = t("classTeachers.form.startRequired")
    if (start && end && endIso < startIso) found.end = t("classTeachers.form.endBeforeStart")
    if (isBackdated && !canBackdate) {
      if (startChanged && startIso < today) found.start = t("classTeachers.form.pastNotAllowed")
      if (endChanged && endIso !== "" && endIso < today) found.end = t("classTeachers.form.pastNotAllowed")
    }
    if (isBackdated && canBackdate && !reason.trim()) found.reason = t("classTeachers.form.reasonRequired")
    return found
  }

  const handleError = (error: unknown) => {
    const code = getErrorCode(error)
    if (code === "ACADEMIC_INVALID_RANGE") {
      setErrors({ start: t("classTeachers.form.outOfPeriod") })
    } else if (code === "ACADEMIC_DUPLICATE_CODE") {
      setFailure(t("classTeachers.form.duplicate"))
    } else if (code === "ACADEMIC_JOINT_REQUIRED") {
      setErrors({ joint: t("classTeachers.form.jointRequired") })
    } else if (code === "ACADEMIC_FIELD_INCOMPATIBLE") {
      setErrors({ subject: t("classTeachers.form.subjectNotInClass") })
    } else if (code === "SCOPE_DENIED" || getErrorStatus(error) === 403) {
      setFailure(t("classTeachers.form.forbidden"))
    } else if (getErrorStatus(error) === 400) {
      setErrors({ reason: t("classTeachers.form.reasonRequired") })
    } else if (code === "ACADEMIC_NOT_ELIGIBLE") {
      setFailure(t("classTeachers.form.notEligible"))
    } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
      toast.error(t("classTeachers.changedMeanwhile"))
      onChanged()
    } else if (getErrorStatus(error) === undefined && !isEdit) {
      toast.error(t("classTeachers.form.noAnswer"))
      onChanged()
    } else {
      setFailure(toFailureMessage(t("classTeachers.form.failed"), error))
    }
  }

  const submit = async () => {
    const found = validate()
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    const dates = {
      endDate: endIso || undefined,
      joint,
      reason: reason.trim() || undefined,
      startDate: startIso,
    }
    setIsSaving(true)
    try {
      if (link) {
        await updateAcademicTeacherLink(link.id, { ...dates, version: link.version })
        toast.success(t("classTeachers.form.updated"))
      } else {
        await createAcademicTeacherLink(schoolClass.id, {
          ...dates,
          subjectId: Number(subjectId),
          teacherUserId: teacher?.userId ?? 0,
        })
        toast.success(t("classTeachers.form.created", { name: teacher?.fullName ?? "" }))
      }
      onChanged()
    } catch (error) {
      setIsSaving(false)
      handleError(error)
    }
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
            {isEdit ? t("common.save") : t("classTeachers.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={link ? t("classTeachers.form.editTitle", { name: link.teacherName }) : t("classTeachers.form.createTitle")}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        noValidate
      >
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {isEdit ? t("classTeachers.form.editDescription") : t("classTeachers.form.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          {link ? (
            <DescriptionList
              items={[
                { key: "teacher", label: t("classTeachers.teacher"), value: link.teacherName },
                { key: "subject", label: t("classTeachers.subject"), value: subjectName(link.subjectId) },
              ]}
            />
          ) : (
            <>
              <TeacherPicker
                error={errors.teacher}
                onChange={(value) => {
                  setTeacher(value)
                  clear("teacher")
                }}
                title={t("classTeachers.teacher")}
                unitId={schoolClass.unitId}
                value={teacher}
              />
              <Select
                error={errors.subject}
                helperText={subjectOptions.length === 0 ? t("classTeachers.form.noSubjects") : undefined}
                noOptionsMessage={t("common.noOptions")}
                onChange={(option) => {
                  setSubjectId(option?.value ?? "")
                  clear("subject")
                }}
                options={subjectOptions}
                placeholder={t("classTeachers.form.subjectPlaceholder")}
                title={t("classTeachers.subject")}
                value={subjectOptions.find((option) => option.value === subjectId) ?? null}
                required
              />
            </>
          )}

          <FieldRow>
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.start}
              onChange={(value) => {
                setStart(value)
                clear("start")
              }}
              placeholder={t("common.datePlaceholder")}
              title={t("classTeachers.form.start")}
              value={start}
              required
            />
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.end}
              helperText={t("classTeachers.form.endHelper")}
              onChange={(value) => {
                setEnd(value)
                clear("end")
              }}
              placeholder={t("common.datePlaceholder")}
              title={t("classTeachers.form.end")}
              value={end}
            />
          </FieldRow>

          <Checkbox
            checked={joint}
            error={errors.joint}
            helperText={errors.joint ? undefined : t("classTeachers.form.jointHelper")}
            label={t("classTeachers.form.joint")}
            onChange={(_event, checked) => {
              setJoint(checked)
              clear("joint")
            }}
          />

          {isBackdated && canBackdate && (
            <Textarea
              error={errors.reason}
              helperText={t("classTeachers.form.reasonHelper")}
              maxLength={academicLimits.reason}
              onChange={(event) => {
                setReason(event.target.value)
                clear("reason")
              }}
              placeholder={t("classTeachers.form.reasonPlaceholder")}
              title={t("classTeachers.form.reason")}
              value={reason}
              required
            />
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
