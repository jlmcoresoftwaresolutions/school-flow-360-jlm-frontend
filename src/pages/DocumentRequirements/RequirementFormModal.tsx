import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Checkbox, DateInput, Input, Select } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { DocumentEnrollmentKind, DocumentParty, DocumentRequirement, DocumentRequirementWrite } from "@/models"
import { createDocumentRequirement, updateDocumentRequirement } from "@/services/enrollmentDocuments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { fromIsoDate, toIsoDate } from "@/utils/dates"
import { stripNonDigits } from "@/utils/formats"

import { FieldRow } from "../shared/people/people.styles"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import { enrollmentKinds, neverWaivedCodes, parties, requirementLimits } from "./documentRequirements.constants"

export type RequirementFormModalProps = {
  onClose: () => void
  // Saved, or the catalog has to be read again (someone else changed it meanwhile).
  onSaved: () => void
  // The requirement to edit; none creates one.
  requirement?: DocumentRequirement
  stageOptions: SelectOption[]
  unitOptions: SelectOption[]
}

type Values = {
  acceptedTypes: string[]
  code: string
  enrollmentKind: DocumentEnrollmentKind
  exemptable: boolean
  label: string
  mandatory: boolean
  party: DocumentParty
  stageId: string
  unitId: string
  useDocumentExpiry: boolean
  validFrom: Date | null
  validTo: Date | null
  validityDays: string
}

type Errors = Partial<Record<"acceptedTypes" | "code" | "label" | "validTo" | "validityDays", string>>

const codePattern = /^[A-Z0-9_]{2,40}$/

const toValues = (requirement?: DocumentRequirement): Values => ({
  acceptedTypes: requirement?.acceptedTypes ?? [],
  code: requirement?.code ?? "",
  enrollmentKind: requirement?.enrollmentKind ?? "ALL",
  exemptable: requirement?.exemptable ?? true,
  label: requirement?.label ?? "",
  mandatory: requirement?.mandatory ?? true,
  party: requirement?.party ?? "STUDENT",
  stageId: requirement?.stageId ? String(requirement.stageId) : "",
  unitId: requirement?.unitId ? String(requirement.unitId) : "",
  useDocumentExpiry: requirement?.useDocumentExpiry ?? false,
  validFrom: requirement?.validFrom ? fromIsoDate(requirement.validFrom) : null,
  validTo: requirement?.validTo ? fromIsoDate(requirement.validTo) : null,
  validityDays: requirement?.validityDays ? String(requirement.validityDays) : "",
})

const isoOrEmpty = (date: Date | null) => (date ? toIsoDate(date) : "")

const comparable = (values: Values) =>
  JSON.stringify({ ...values, validFrom: isoOrEmpty(values.validFrom), validTo: isoOrEmpty(values.validTo) })

// Registers or edits a requirement of the school's document catalog (Admin only; backend slice 3B). Its
// code and whose document it is (the student's or each signatory's) are set when it is created and never
// change. It says which document types it accepts, where it applies (a unit and a stage, or all of them),
// for which kind of enrollment, whether it is mandatory and may be waived by an exception (a legal
// obligation or the proof of representation never may), how long it stays valid and from when it is in
// force. Saving never publishes it: a new requirement is born withdrawn.
export const RequirementFormModal = (props: RequirementFormModalProps) => {
  const { onClose, onSaved, requirement, stageOptions, unitOptions } = props

  const { t } = useTranslation()
  const documentTypes = useDocumentTypes()
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [original] = useState<Values>(() => toValues(requirement))
  const [values, setValues] = useState<Values>(original)
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = Boolean(requirement)
  // The identity of who signs and the proof of representation are never waived (the backend forces it).
  const neverWaived = neverWaivedCodes.includes((requirement?.code ?? values.code).trim().toUpperCase())
  const isChanged = comparable(values) !== comparable(original)
  const allUnits = { label: t("documentRequirements.allUnits"), value: "" }
  const allStages = { label: t("documentRequirements.allStages"), value: "" }
  const units = [allUnits, ...unitOptions]
  const stages = [allStages, ...stageOptions]
  const kindOptions: SelectOption[] = enrollmentKinds.map((value) => ({
    label: t(`documentRequirements.kinds.${value}`),
    value,
  }))
  const partyOptions: SelectOption[] = parties.map((value) => ({
    label: t(`documentRequirements.parties.${value}`),
    value,
  }))

  useUnsavedChanges(isChanged && !isSaving)

  const set = (patch: Partial<Values>, cleared: (keyof Errors)[] = []) => {
    setValues((current) => ({ ...current, ...patch }))
    if (cleared.length > 0) {
      setErrors((current) => {
        const next = { ...current }
        cleared.forEach((key) => delete next[key])
        return next
      })
    }
  }

  const validate = (): Errors => {
    const found: Errors = {}
    if (!isEdit && !codePattern.test(values.code.trim().toUpperCase())) {
      found.code = t("documentRequirements.form.codeInvalid")
    }
    if (!values.label.trim()) found.label = t("documentRequirements.form.labelRequired")
    if (values.acceptedTypes.length === 0) found.acceptedTypes = t("documentRequirements.form.typesRequired")
    if (values.validityDays && !(Number(values.validityDays) > 0)) {
      found.validityDays = t("documentRequirements.form.validityDaysInvalid")
    }
    if (values.validFrom && values.validTo && values.validTo < values.validFrom) {
      found.validTo = t("documentRequirements.form.datesInvalid")
    }
    return found
  }

  const submit = async () => {
    setFailure("")
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const request: DocumentRequirementWrite = {
      acceptedTypes: values.acceptedTypes,
      code: requirement?.code ?? values.code.trim().toUpperCase(),
      enrollmentKind: values.enrollmentKind,
      exemptable: values.exemptable && !neverWaived,
      label: values.label.trim(),
      mandatory: values.mandatory,
      party: requirement?.party ?? values.party,
      sortOrder: requirement?.sortOrder,
      stageId: values.stageId ? Number(values.stageId) : null,
      unitId: values.unitId ? Number(values.unitId) : null,
      useDocumentExpiry: values.useDocumentExpiry,
      validFrom: values.validFrom ? toIsoDate(values.validFrom) : null,
      validTo: values.validTo ? toIsoDate(values.validTo) : null,
      validityDays: values.validityDays ? Number(values.validityDays) : null,
      version: requirement?.version,
    }

    setIsSaving(true)
    try {
      if (requirement) await updateDocumentRequirement(requirement.id, request)
      else await createDocumentRequirement(request)
      toast.success(isEdit ? t("documentRequirements.form.updated") : t("documentRequirements.form.created"))
      onSaved()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "REQUIREMENT_DUPLICATE") {
        setErrors({ code: t("documentRequirements.form.duplicate") })
      } else if (code === "VERSION_CONFLICT" || code === "ENROLLMENT_NOT_FOUND") {
        toast.error(t("documentRequirements.changedMeanwhile"))
        onSaved()
      } else if (code === "ENROLLMENT_DOCUMENT_INVALID") {
        setErrors({ acceptedTypes: t("documentRequirements.form.typeUnknown") })
      } else if (getErrorStatus(error) === undefined && !isEdit) {
        toast.error(t("documentRequirements.form.noAnswer"))
        onSaved()
      } else {
        setFailure(toFailureMessage(t("documentRequirements.form.failed"), error))
      }
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
            {isEdit ? t("common.save") : t("documentRequirements.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={
        isEdit
          ? t("documentRequirements.form.editTitle", { name: requirement?.label })
          : t("documentRequirements.form.createTitle")
      }
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
          {!isEdit && (
            <Text color="secondary" fontSize="sm">
              {t("documentRequirements.form.bornWithdrawn")}
            </Text>
          )}
          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <FieldRow>
            <Input
              disabled={isEdit}
              error={errors.code}
              helperText={t("documentRequirements.form.codeHelper")}
              maxLength={requirementLimits.code}
              onChange={(event) => set({ code: event.target.value.toUpperCase() }, ["code"])}
              placeholder={t("documentRequirements.form.codePlaceholder")}
              title={t("documentRequirements.form.code")}
              value={values.code}
              required
            />
            <Input
              error={errors.label}
              maxLength={requirementLimits.label}
              onChange={(event) => set({ label: event.target.value }, ["label"])}
              placeholder={t("documentRequirements.form.labelPlaceholder")}
              title={t("documentRequirements.form.label")}
              value={values.label}
              required
            />
          </FieldRow>

          <FieldRow>
            <Select
              isDisabled={isEdit}
              helperText={isEdit ? t("documentRequirements.form.partyFixed") : undefined}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => set({ party: (option?.value as DocumentParty | undefined) ?? "STUDENT" })}
              options={partyOptions}
              placeholder={t("documentRequirements.form.partyPlaceholder")}
              title={t("documentRequirements.form.party")}
              value={partyOptions.find((option) => option.value === values.party) ?? null}
              required
            />
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) =>
                set({ enrollmentKind: (option?.value as DocumentEnrollmentKind | undefined) ?? "ALL" })
              }
              options={kindOptions}
              placeholder={t("documentRequirements.form.kindPlaceholder")}
              title={t("documentRequirements.form.kind")}
              value={kindOptions.find((option) => option.value === values.enrollmentKind) ?? null}
              required
            />
          </FieldRow>

          <FieldRow>
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => set({ unitId: option?.value ?? "" })}
              options={units}
              placeholder={t("documentRequirements.allUnits")}
              title={t("documentRequirements.form.unit")}
              value={units.find((option) => option.value === values.unitId) ?? allUnits}
            />
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => set({ stageId: option?.value ?? "" })}
              options={stages}
              placeholder={t("documentRequirements.allStages")}
              title={t("documentRequirements.form.stage")}
              value={stages.find((option) => option.value === values.stageId) ?? allStages}
            />
          </FieldRow>

          <FormFields aria-label={t("documentRequirements.form.acceptedTypes")} role="group">
            <Text fontSize="sm" semibold>
              {t("documentRequirements.form.acceptedTypes")}
            </Text>
            {documentTypes.map((type) => (
              <Checkbox
                key={type.code}
                checked={values.acceptedTypes.includes(type.code)}
                label={type.label}
                onChange={(_event, checked) =>
                  set(
                    {
                      acceptedTypes: checked
                        ? [...values.acceptedTypes, type.code]
                        : values.acceptedTypes.filter((code) => code !== type.code),
                    },
                    ["acceptedTypes"],
                  )
                }
              />
            ))}
            {errors.acceptedTypes && (
              <Text color="danger" fontSize="sm" role="alert">
                {errors.acceptedTypes}
              </Text>
            )}
          </FormFields>

          <Checkbox
            checked={values.mandatory}
            helperText={t("documentRequirements.form.mandatoryHelper")}
            label={t("documentRequirements.form.mandatory")}
            onChange={(_event, checked) => set({ mandatory: checked })}
          />
          <Checkbox
            checked={values.exemptable && !neverWaived}
            disabled={neverWaived}
            helperText={
              neverWaived
                ? t("documentRequirements.form.neverWaivedHelper")
                : t("documentRequirements.form.exemptableHelper")
            }
            label={t("documentRequirements.form.exemptable")}
            onChange={(_event, checked) => set({ exemptable: checked })}
          />

          <FieldRow>
            <Input
              error={errors.validityDays}
              helperText={t("documentRequirements.form.validityDaysHelper")}
              inputMode="numeric"
              maxLength={requirementLimits.validityDays}
              onChange={(event) => set({ validityDays: stripNonDigits(event.target.value) }, ["validityDays"])}
              placeholder={t("documentRequirements.form.validityDaysPlaceholder")}
              title={t("documentRequirements.form.validityDays")}
              value={values.validityDays}
            />
            <Checkbox
              checked={values.useDocumentExpiry}
              helperText={t("documentRequirements.form.useDocumentExpiryHelper")}
              label={t("documentRequirements.form.useDocumentExpiry")}
              onChange={(_event, checked) => set({ useDocumentExpiry: checked })}
            />
          </FieldRow>

          <FieldRow>
            <DateInput
              clearLabel={t("people.form.clearDate")}
              helperText={t("documentRequirements.form.validFromHelper")}
              onChange={(value) => set({ validFrom: value }, ["validTo"])}
              placeholder={t("common.datePlaceholder")}
              title={t("documentRequirements.form.validFrom")}
              value={values.validFrom}
            />
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.validTo}
              helperText={t("documentRequirements.form.validToHelper")}
              onChange={(value) => set({ validTo: value }, ["validTo"])}
              placeholder={t("common.datePlaceholder")}
              title={t("documentRequirements.form.validTo")}
              value={values.validTo}
            />
          </FieldRow>
        </FormFields>
      </form>
    </Modal>
  )
}
