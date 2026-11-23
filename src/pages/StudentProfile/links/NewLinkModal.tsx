import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Checkbox } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { CatalogItem, Student } from "@/models"
import { createStudentGuardianLink } from "@/services/studentGuardianLinks"
import { toIsoDate } from "@/utils/dates"

import { FormFields } from "../../shared/userAccess/userAccess.styles"
import { GuardianPicker } from "./GuardianPicker"
import { LinkFields } from "./LinkFields"
import { emptyLink, type LinkFormValues, type PickedGuardian } from "./linkForm"
import { type LinkErrorField, useLinkErrors } from "./useLinkErrors"

export type NewLinkModalProps = {
  documentTypes: CatalogItem[]
  linkedGuardianIds: number[]
  relationshipTypes: CatalogItem[]
  student: Student
  onClose: () => void
  // The link was made, or the profile has to be read again (the student changed, no answer came).
  onChanged: () => void
}

type FieldErrors = Partial<Record<LinkErrorField, string>>

// Links a registered guardian to the student (P03-S08): the guardian chosen in the picker (in reach, by
// its id; of another unit, by the reuse proof of the exact check), the relationship, the three
// responsibilities, the start date and the school's confirmation that the guardian consented to the
// processing of the child's data (LGPD), without which the backend refuses it. The link is born active.
export const NewLinkModal = (props: NewLinkModalProps) => {
  const { documentTypes, linkedGuardianIds, onChanged, onClose, relationshipTypes, student } = props

  const { t } = useTranslation()
  const toFailure = useLinkErrors()

  const formId = useId()

  const [guardian, setGuardian] = useState<PickedGuardian | null>(null)
  const [values, setValues] = useState<LinkFormValues>(emptyLink)
  const [consent, setConsent] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges = guardian !== null || consent || values.relationshipCode !== ""

  useUnsavedChanges(hasChanges && !isSaving)

  const validate = (): FieldErrors => {
    const found: FieldErrors = {}
    if (!guardian) found.guardian = t("guardianLinks.picker.required")
    if (!values.relationshipCode) found.relationshipCode = t("guardianLinks.form.relationshipRequired")
    if (!consent) found.consent = t("guardianLinks.form.consentRequired")
    return found
  }

  const save = async () => {
    const found = validate()
    setErrors(found)
    setFailure("")
    if (!guardian || Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await createStudentGuardianLink({
        consentConfirmed: consent,
        contactAuthorized: values.contactAuthorized,
        financialResponsible: values.financialResponsible,
        guardianId: guardian.guardianId,
        pedagogicalResponsible: values.pedagogicalResponsible,
        relationshipCode: values.relationshipCode,
        reuseRef: guardian.reuseRef,
        startDate: values.startDate ? toIsoDate(values.startDate) : undefined,
        studentId: student.id,
      })
      toast.success(t("guardianLinks.create.done", { name: guardian.name }))
      onChanged()
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "field") {
        setErrors({ [result.field]: result.message })
      } else if (result.kind === "noAnswer" || result.kind === "gone") {
        // Without an answer the link may exist already (the backend has no idempotency here): the profile
        // is read again before any new attempt.
        toast.error(result.message)
        onChanged()
      } else {
        setFailure(result.message)
      }
      setIsSaving(false)
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
          <Button disabled={isSaving} form={formId} type="submit">
            {t("guardianLinks.create.submit")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("guardianLinks.create.title", { name: student.socialName || student.fullName })}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
        noValidate
      >
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.create.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <GuardianPicker
            documentTypes={documentTypes}
            error={errors.guardian}
            linkedGuardianIds={linkedGuardianIds}
            onChange={(next) => {
              setGuardian(next)
              setErrors((current) => ({ ...current, guardian: undefined }))
            }}
            title={t("guardians.guardian")}
            value={guardian}
            required
          />

          <LinkFields
            onChange={(next) => {
              setValues(next)
              if (next.relationshipCode) setErrors((current) => ({ ...current, relationshipCode: undefined }))
            }}
            relationshipError={errors.relationshipCode}
            relationshipTypes={relationshipTypes}
            value={values}
            withStartDate
          />

          <Checkbox
            checked={consent}
            error={errors.consent}
            helperText={t("guardianLinks.form.consentHelper")}
            label={t("guardianLinks.form.consent")}
            onChange={(_event, checked) => {
              setConsent(checked)
              if (checked) setErrors((current) => ({ ...current, consent: undefined }))
            }}
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
