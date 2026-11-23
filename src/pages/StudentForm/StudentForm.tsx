import { useEffect, useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate, useParams } from "react-router-dom"

import { leavingAfterSave, toast, useUnsavedChanges } from "@/components"
import { Button, Card, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Input, PageHeader, Select, StateMessage, Textarea } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { PersonSignals, Student } from "@/models"
import { paths } from "@/routes/paths"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { createStudent, getStudent, updateStudent } from "@/services/students"

import { DuplicateReviewDialog } from "../shared/people/DuplicateReviewDialog"
import { FieldRow, FormActions, PersonSection, PersonSections } from "../shared/people/people.styles"
import {
  PersonAddressFields,
  PersonContactFields,
  PersonDocumentFields,
  PersonIdentityFields,
} from "../shared/people/PersonFields"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"
import {
  emptyStudentForm,
  nicknamePattern,
  observationMaxLength,
  type StudentFormValues,
  toStudentFields,
  toStudentFormValues,
  toStudentSignals,
} from "./studentFormValues"

type LoadState = "failed" | "gone" | "loading" | "ready"

// A student's registration (P03-S03), new or edited: identity, contact, document, address, the reference
// unit (an active unit in reach; it is the record's unit, not an enrollment) and an observation. A new
// student is saved as a draft and gets the nickname it signs in with (suggested by the backend when
// left blank); saving never creates an access or an enrollment. The backend's refusals land on their
// field; a possible duplicate opens its review, and saving again carries the decision; a version
// conflict reads the student again and keeps what was typed. A create without an answer isn't repeated
// (the backend has no idempotency here): the list must be checked first. Success is only told once the
// backend saved, and then the student's profile opens.
export const StudentForm = () => {
  const { studentId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const unitDirectory = useUnitDirectory()
  const documentTypes = useDocumentTypes()
  const form = useForm<StudentFormValues>({ defaultValues: emptyStudentForm })

  const [student, setStudent] = useState<Student | null>(null)
  const [loadState, setLoadState] = useState<LoadState>(studentId ? "loading" : "ready")
  const [review, setReview] = useState<PersonSignals | null>(null)
  const [failure, setFailure] = useState("")
  const [nextPath, setNextPath] = useState<string | null>(null)

  const isEdit = studentId !== undefined
  const { errors, isDirty, isSubmitting } = form.formState
  const unitOptions: SelectOption[] = unitDirectory.units
    .filter((unit) => unit.active || String(unit.id) === student?.referenceUnit?.id.toString())
    .map((unit) => ({ label: unit.name, value: String(unit.id) }))

  useUnsavedChanges(isDirty && nextPath === null)

  // An edit starts from the student as the backend has it.
  useEffect(() => {
    if (!studentId) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await getStudent(Number(studentId))
        if (isStale) return
        setStudent(loaded)
        form.reset(toStudentFormValues(loaded))
        setLoadState("ready")
      } catch (error) {
        if (!isStale) setLoadState(getErrorStatus(error) === 404 ? "gone" : "failed")
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [form, studentId])

  // Leaves once saved (or to open the existing record): the guard lets a navigation marked as leaving
  // after a save through, since the form may still count as changed until it re-renders.
  useEffect(() => {
    if (nextPath) navigate(nextPath, { state: leavingAfterSave })
  }, [navigate, nextPath])

  const fieldError = (field: keyof StudentFormValues, message: string) =>
    form.setError(field, { message }, { shouldFocus: true })

  // Where each refusal goes: on its field, a possible duplicate to its review, a conflict to a reread.
  const handleSaveError = async (error: unknown, values: StudentFormValues) => {
    const code = getErrorCode(error)
    const status = getErrorStatus(error)

    if (code === "DUPLICATE_REVIEW_REQUIRED") {
      setReview(toStudentSignals(values, student))
    } else if (code === "NAME_REQUIRED") {
      fieldError("fullName", t("people.form.fullNameRequired"))
    } else if (code === "BIRTH_DATE_FUTURE") {
      fieldError("birthDate", t("people.form.birthDateFuture"))
    } else if (code === "EMAIL_INVALID") {
      fieldError("contactEmail", t("people.form.emailInvalid"))
    } else if (code === "DOCUMENT_TYPE_INVALID") {
      fieldError("documentType", t("people.form.documentTypeInvalid"))
    } else if (code === "DOCUMENT_INCOMPLETE" || code === "DOCUMENT_INVALID") {
      fieldError("documentNumber", t("people.form.documentInvalid"))
    } else if (code === "DOCUMENT_IN_USE") {
      fieldError("documentNumber", t("people.form.documentInUse"))
    } else if (code === "NICKNAME_IN_USE") {
      fieldError("nickname", t("students.form.nicknameInUse"))
    } else if (code === "UNIT_INACTIVE" || code === "UNIT_REQUIRED" || code === "UNIT_NOT_FOUND") {
      fieldError("referenceUnitId", t("students.form.unitUnavailable"))
    } else if (status === 403) {
      fieldError("referenceUnitId", t("students.form.unitOutOfReach"))
    } else if (code === "VERSION_CONFLICT" && student) {
      try {
        setStudent(await getStudent(student.id))
        setFailure(t("students.form.conflict"))
      } catch {
        setFailure(t("students.form.failed"))
      }
    } else if (status === 404 && isEdit) {
      setLoadState("gone")
    } else if (status === undefined && !isEdit) {
      setFailure(t("students.form.noAnswer"))
    } else {
      setFailure(t("students.form.failed"))
    }
  }

  const save = async (values: StudentFormValues, duplicateReviewId?: number) => {
    setFailure("")

    try {
      const saved = student
        ? await updateStudent(student.id, { ...toStudentFields(values), duplicateReviewId, version: student.version })
        : await createStudent({
            ...toStudentFields(values),
            duplicateReviewId,
            nickname: values.nickname.trim() || undefined,
          })

      toast.success(student ? t("students.form.saved") : t("students.form.created"))
      form.reset(values)
      setNextPath(generatePath(paths.studentProfile, { studentId: String(saved.id) }))
    } catch (error) {
      await handleSaveError(error, values)
    }
  }

  const submit = form.handleSubmit((values) => save(values))

  // The review kept the student apart (or nobody matches anymore): save again, carrying the decision.
  const handleReviewResolved = (reviewId: number | null) => {
    setReview(null)
    void form.handleSubmit((values) => save(values, reviewId ?? undefined))()
  }

  // The student being registered already exists: its profile opens, and the typed data is dropped.
  const handleOpenExisting = (personId: number) => {
    setReview(null)
    setNextPath(generatePath(paths.studentProfile, { studentId: String(personId) }))
  }

  const cancel = () => {
    if (student) navigate(generatePath(paths.studentProfile, { studentId: String(student.id) }))
    else navigate(paths.students)
  }

  const renderBody = () => {
    if (loadState === "loading") return null

    if (loadState === "gone") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(paths.students)}>{t("students.profile.backToList")}</Button>}
          description={t("students.profile.goneDescription")}
          icon="school-outline"
          title={t("students.profile.goneTitle")}
        />
      )
    }

    if (loadState === "failed") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(0)}>{t("common.tryAgain")}</Button>}
          description={t("students.profile.errorDescription")}
          title={t("students.profile.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <FormProvider {...form}>
        <form noValidate onSubmit={submit}>
          <PersonSections>
            <PersonIdentityFields birthDateHelper={t("students.form.birthDateHelper")} />

            <PersonSection aria-label={t("students.form.schoolTitle")}>
              <Text as="h2" fontSize="md" semibold>
                {t("students.form.schoolTitle")}
              </Text>
              <FieldRow>
                <Controller
                  control={form.control}
                  name="referenceUnitId"
                  render={(controller) => (
                    <Select
                      error={controller.fieldState.error?.message}
                      helperText={t("students.form.referenceUnitHelper")}
                      name={controller.field.name}
                      noOptionsMessage={t("common.noOptions")}
                      onBlur={controller.field.onBlur}
                      onChange={(option) => controller.field.onChange(option?.value ?? "")}
                      options={unitOptions}
                      placeholder={t("students.form.referenceUnitPlaceholder")}
                      title={t("students.referenceUnit")}
                      value={unitOptions.find((option) => option.value === controller.field.value) ?? null}
                      required
                    />
                  )}
                  rules={{ validate: (value) => value !== "" || t("students.form.referenceUnitRequired") }}
                />
                {isEdit ? (
                  <Input
                    helperText={t("students.form.nicknameReadOnly")}
                    title={t("students.form.nicknameLabel")}
                    value={student?.nickname ?? ""}
                    readOnly
                  />
                ) : (
                  <Input
                    autoCapitalize="none"
                    autoComplete="off"
                    error={errors.nickname?.message}
                    helperText={t("students.form.nicknameHelper")}
                    maxLength={60}
                    placeholder={t("students.form.nicknamePlaceholder")}
                    spellCheck={false}
                    title={t("students.form.nicknameLabel")}
                    {...form.register("nickname", {
                      validate: (value) =>
                        value.trim() === "" || nicknamePattern.test(value.trim()) || t("students.form.nicknameInvalid"),
                    })}
                  />
                )}
              </FieldRow>
            </PersonSection>

            <PersonContactFields />
            <PersonDocumentFields currentDocument={student?.maskedDocument} documentTypes={documentTypes} />
            <PersonAddressFields />

            <PersonSection aria-label={t("students.form.observationTitle")}>
              <Text as="h2" fontSize="md" semibold>
                {t("students.form.observationTitle")}
              </Text>
              <Textarea
                helperText={t("students.form.observationHelper", { max: observationMaxLength })}
                maxLength={observationMaxLength}
                placeholder={t("students.form.observationPlaceholder")}
                title={t("students.form.observationLabel")}
                {...form.register("observation")}
              />
            </PersonSection>

            {failure && (
              <Text as="p" color="danger" fontSize="sm" role="alert">
                {failure}
              </Text>
            )}

            <FormActions>
              <Button disabled={isSubmitting} onClick={cancel} variant="outlined">
                {t("common.cancel")}
              </Button>
              <Button disabled={isSubmitting || (isEdit && !isDirty)} type="submit">
                {isEdit ? t("common.save") : t("students.form.saveDraft")}
              </Button>
            </FormActions>
          </PersonSections>
        </form>
      </FormProvider>
    )
  }

  return (
    <>
      <PageHeader
        description={
          isEdit
            ? t("students.form.editDescription", { code: student?.studentCode ?? "" })
            : t("students.form.newDescription")
        }
        icon="school-outline"
        title={isEdit ? t("students.form.editTitle") : t("students.form.newTitle")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderBody()}
      </Card>

      {review && (
        <DuplicateReviewDialog
          kind="STUDENT"
          onClose={() => setReview(null)}
          onOpenExisting={handleOpenExisting}
          onResolved={handleReviewResolved}
          signals={review}
        />
      )}
    </>
  )
}
