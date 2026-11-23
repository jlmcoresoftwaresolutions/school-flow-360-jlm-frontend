import { useEffect, useState } from "react"
import { Controller, FormProvider, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate, useParams } from "react-router-dom"

import { leavingAfterSave, toast, useUnsavedChanges } from "@/components"
import { Button, Card, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DescriptionList, PageHeader, Select, StateMessage } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { Guardian, PersonSignals } from "@/models"
import { paths } from "@/routes/paths"
import { createGuardian, getGuardian, updateGuardian } from "@/services/guardians"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { DuplicateReviewDialog } from "../shared/people/DuplicateReviewDialog"
import { FieldRow, FormActions, PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import {
  PersonAddressFields,
  PersonContactFields,
  PersonDocumentFields,
  PersonIdentityFields,
} from "../shared/people/PersonFields"
import {
  emptyPerson,
  type PersonFormValues,
  toPersonFields,
  toPersonFormValues,
  toPersonSignals,
} from "../shared/people/personForm"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { usePersonFieldErrors } from "../shared/people/usePersonFieldErrors"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"

type GuardianFormValues = PersonFormValues & {
  unitId: string
}

type LoadState = "failed" | "gone" | "loading" | "ready"

const emptyGuardianForm: GuardianFormValues = { ...emptyPerson, unitId: "" }

// A guardian's registration (P03-S06), new or edited: identity, contact, document and address, and -
// when created - the unit it is registered in (an active unit in reach; it then follows the units of its
// students). A new guardian is born active. Saving never creates an access, an invitation or a link: the
// guardian is linked to a student from the student, and gets an access only through an invitation.
// Refusals land on their field; a possible duplicate opens its review, and saving again carries the
// decision; a version conflict reads the guardian again and keeps what was typed. Success is only told
// once the backend saved, and then the guardian's profile opens.
export const GuardianForm = () => {
  const { guardianId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const unitDirectory = useUnitDirectory()
  const documentTypes = useDocumentTypes()
  const toPersonFieldError = usePersonFieldErrors()
  const form = useForm<GuardianFormValues>({ defaultValues: emptyGuardianForm })

  const [guardian, setGuardian] = useState<Guardian | null>(null)
  const [loadState, setLoadState] = useState<LoadState>(guardianId ? "loading" : "ready")
  const [review, setReview] = useState<PersonSignals | null>(null)
  const [failure, setFailure] = useState("")
  const [nextPath, setNextPath] = useState<string | null>(null)

  const isEdit = guardianId !== undefined
  const { isDirty, isSubmitting } = form.formState
  const unitOptions: SelectOption[] = unitDirectory.units
    .filter((unit) => unit.active)
    .map((unit) => ({ label: unit.name, value: String(unit.id) }))

  useUnsavedChanges(isDirty && nextPath === null)

  // An edit starts from the guardian as the backend has it.
  useEffect(() => {
    if (!guardianId) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await getGuardian(Number(guardianId))
        if (isStale) return
        setGuardian(loaded)
        form.reset({ ...toPersonFormValues(loaded), unitId: "" })
        setLoadState("ready")
      } catch (error) {
        if (!isStale) setLoadState(getErrorStatus(error) === 404 ? "gone" : "failed")
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [form, guardianId])

  // Leaves once saved (or to open the existing record), marked so the unsaved-changes guard lets it through.
  useEffect(() => {
    if (nextPath) navigate(nextPath, { state: leavingAfterSave })
  }, [navigate, nextPath])

  // Where each refusal goes: on its field, a possible duplicate to its review, a conflict to a reread.
  const handleSaveError = async (error: unknown, values: GuardianFormValues) => {
    const code = getErrorCode(error)
    const status = getErrorStatus(error)
    const personError = toPersonFieldError(error)

    if (code === "DUPLICATE_REVIEW_REQUIRED") {
      setReview(toPersonSignals(values, guardian))
    } else if (personError) {
      form.setError(personError.field, { message: personError.message }, { shouldFocus: true })
    } else if (code === "UNIT_INACTIVE" || code === "UNIT_REQUIRED" || code === "UNIT_NOT_FOUND") {
      form.setError("unitId", { message: t("guardians.form.unitUnavailable") }, { shouldFocus: true })
    } else if (status === 403 && !isEdit) {
      form.setError("unitId", { message: t("guardians.form.unitOutOfReach") }, { shouldFocus: true })
    } else if (code === "VERSION_CONFLICT" && guardian) {
      try {
        setGuardian(await getGuardian(guardian.id))
        setFailure(t("guardians.form.conflict"))
      } catch {
        setFailure(t("guardians.form.failed"))
      }
    } else if (status === 404 && isEdit) {
      setLoadState("gone")
    } else if (status === undefined && !isEdit) {
      setFailure(t("guardians.form.noAnswer"))
    } else {
      setFailure(t("guardians.form.failed"))
    }
  }

  const save = async (values: GuardianFormValues, duplicateReviewId?: number) => {
    setFailure("")

    try {
      const saved = guardian
        ? await updateGuardian(guardian.id, { ...toPersonFields(values), duplicateReviewId, version: guardian.version })
        : await createGuardian({ ...toPersonFields(values), duplicateReviewId, unitId: Number(values.unitId) })

      toast.success(guardian ? t("guardians.form.saved") : t("guardians.form.created"))
      form.reset(values)
      setNextPath(generatePath(paths.guardianProfile, { guardianId: String(saved.id) }))
    } catch (error) {
      await handleSaveError(error, values)
    }
  }

  const submit = form.handleSubmit((values) => save(values))

  // The review kept the guardian apart (or nobody matches anymore): save again, carrying the decision.
  const handleReviewResolved = (reviewId: number | null) => {
    setReview(null)
    void form.handleSubmit((values) => save(values, reviewId ?? undefined))()
  }

  // The guardian being registered already exists: its profile opens, and the typed data is dropped.
  const handleOpenExisting = (personId: number) => {
    setReview(null)
    setNextPath(generatePath(paths.guardianProfile, { guardianId: String(personId) }))
  }

  const cancel = () => {
    if (guardian) navigate(generatePath(paths.guardianProfile, { guardianId: String(guardian.id) }))
    else navigate(paths.guardians)
  }

  const renderBody = () => {
    if (loadState === "loading") return null

    if (loadState === "gone") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(paths.guardians)}>{t("guardians.profile.backToList")}</Button>}
          description={t("guardians.profile.goneDescription")}
          icon="users-outline"
          title={t("guardians.profile.goneTitle")}
        />
      )
    }

    if (loadState === "failed") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(0)}>{t("common.tryAgain")}</Button>}
          description={t("guardians.profile.errorDescription")}
          title={t("guardians.profile.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <FormProvider {...form}>
        <form noValidate onSubmit={submit}>
          <PersonSections>
            <PersonIdentityFields />

            <PersonBlock title={t("guardians.form.unitTitle")}>
              {isEdit ? (
                <DescriptionList
                  emptyValue={t("common.notInformed")}
                  items={[
                    {
                      key: "units",
                      label: t("guardians.form.unitsLabel"),
                      value: guardian?.units.map((unit) => unit.name).join(", ") ?? "",
                    },
                  ]}
                />
              ) : (
                <FieldRow>
                  <Controller
                    control={form.control}
                    name="unitId"
                    render={(controller) => (
                      <Select
                        error={controller.fieldState.error?.message}
                        helperText={t("guardians.form.unitHelper")}
                        name={controller.field.name}
                        noOptionsMessage={t("common.noOptions")}
                        onBlur={controller.field.onBlur}
                        onChange={(option) => controller.field.onChange(option?.value ?? "")}
                        options={unitOptions}
                        placeholder={t("guardians.form.unitPlaceholder")}
                        title={t("userAccess.unit")}
                        value={unitOptions.find((option) => option.value === controller.field.value) ?? null}
                        required
                      />
                    )}
                    rules={{ validate: (value) => value !== "" || t("guardians.form.unitRequired") }}
                  />
                </FieldRow>
              )}
            </PersonBlock>

            <PersonContactFields />
            <PersonDocumentFields currentDocument={guardian?.maskedDocument} documentTypes={documentTypes} />
            <PersonAddressFields />

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
                {isEdit ? t("common.save") : t("guardians.form.create")}
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
        description={isEdit ? t("guardians.form.editDescription") : t("guardians.form.newDescription")}
        icon="users-outline"
        title={isEdit ? t("guardians.form.editTitle") : t("guardians.form.newTitle")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderBody()}
      </Card>

      {review && (
        <DuplicateReviewDialog
          kind="GUARDIAN"
          onClose={() => setReview(null)}
          onOpenExisting={handleOpenExisting}
          onResolved={handleReviewResolved}
          signals={review}
        />
      )}
    </>
  )
}
