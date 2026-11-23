import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { CatalogItem, Student } from "@/models"
import { inviteGuardian } from "@/services/students"
import { isValidEmail } from "@/utils/email"

import { personLimits } from "../../shared/people/personForm"
import { FormFields } from "../../shared/userAccess/userAccess.styles"
import { GuardianPicker } from "./GuardianPicker"
import { LinkFields } from "./LinkFields"
import { emptyLink, type LinkFormValues, type PickedGuardian } from "./linkForm"
import { type LinkErrorField, useLinkErrors } from "./useLinkErrors"

export type InviteGuardianModalProps = {
  documentTypes: CatalogItem[]
  linkedGuardianIds: number[]
  relationshipTypes: CatalogItem[]
  student: Student
  onClose: () => void
  // The invitation was sent, or the profile has to be read again.
  onChanged: () => void
}

type FieldErrors = Partial<Record<LinkErrorField, string>>

// Invites a guardian by e-mail from the student (P03-S08): the guardian gets the access invitation (48
// hours) for the student's unit, creates its password and accepts the terms; then the school confirms
// it, and only then the link is born, with the relationship and the responsibilities proposed here and
// the guardian's own consent. A guardian already registered (without an access) is chosen in the picker,
// so the account is tied to that same person instead of a new one; a guardian who already has an access
// is linked directly, without an invitation.
export const InviteGuardianModal = (props: InviteGuardianModalProps) => {
  const { documentTypes, linkedGuardianIds, onChanged, onClose, relationshipTypes, student } = props

  const { t } = useTranslation()
  const toFailure = useLinkErrors()

  const formId = useId()

  const [email, setEmail] = useState("")
  const [fullName, setFullName] = useState("")
  const [guardian, setGuardian] = useState<PickedGuardian | null>(null)
  const [values, setValues] = useState<LinkFormValues>(emptyLink)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const hasChanges =
    email.trim() !== "" || fullName.trim() !== "" || guardian !== null || values.relationshipCode !== ""

  useUnsavedChanges(hasChanges && !isSaving)

  const validate = (): FieldErrors => {
    const found: FieldErrors = {}
    if (!email.trim()) found.email = t("guardianLinks.invite.emailRequired")
    else if (!isValidEmail(email.trim())) found.email = t("people.form.emailInvalid")
    if (!values.relationshipCode) found.relationshipCode = t("guardianLinks.form.relationshipRequired")
    return found
  }

  const send = async () => {
    const found = validate()
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await inviteGuardian(student.id, {
        contactAuthorized: values.contactAuthorized,
        email: email.trim(),
        financialResponsible: values.financialResponsible,
        fullName: guardian ? undefined : fullName.trim() || undefined,
        guardianId: guardian?.guardianId,
        pedagogicalResponsible: values.pedagogicalResponsible,
        relationshipCode: values.relationshipCode,
        reuseRef: guardian?.reuseRef,
      })
      toast.success(t("guardianLinks.invite.done", { email: email.trim() }))
      onChanged()
    } catch (error) {
      const result = toFailure(error)
      if (result.kind === "field") {
        setErrors({ [result.field]: result.message })
      } else if (result.kind === "form") {
        setFailure(result.message)
      } else {
        // No answer: sending again for the same e-mail and student gives the same invitation back, but the
        // profile is read first so the operator sees whether it went.
        toast.error(result.message)
        onChanged()
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
            {t("guardianLinks.invite.submit")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("guardianLinks.invite.title", { name: student.socialName || student.fullName })}
      open
    >
      <form
        id={formId}
        onSubmit={(event) => {
          event.preventDefault()
          void send()
        }}
        noValidate
      >
        <FormFields>
          <Text color="secondary" fontSize="sm">
            {t("guardianLinks.invite.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Input
            error={errors.email}
            maxLength={personLimits.contactEmail}
            onChange={(event) => {
              setEmail(event.target.value)
              setErrors((current) => ({ ...current, email: undefined }))
            }}
            placeholder={t("people.form.contactEmailPlaceholder")}
            title={t("guardianLinks.invite.email")}
            type="email"
            value={email}
            required
          />

          {!guardian && (
            <Input
              helperText={t("guardianLinks.invite.fullNameHelper")}
              maxLength={personLimits.fullName}
              onChange={(event) => setFullName(event.target.value)}
              placeholder={t("people.form.fullNamePlaceholder")}
              title={t("guardianLinks.invite.fullName")}
              value={fullName}
            />
          )}

          <GuardianPicker
            documentTypes={documentTypes}
            error={errors.guardian}
            helperText={t("guardianLinks.invite.guardianHelper")}
            linkedGuardianIds={linkedGuardianIds}
            onChange={(next) => {
              setGuardian(next)
              setErrors((current) => ({ ...current, guardian: undefined }))
            }}
            title={t("guardianLinks.invite.guardian")}
            value={guardian}
          />

          <LinkFields
            onChange={(next) => {
              setValues(next)
              if (next.relationshipCode) setErrors((current) => ({ ...current, relationshipCode: undefined }))
            }}
            relationshipError={errors.relationshipCode}
            relationshipTypes={relationshipTypes}
            value={values}
          />
        </FormFields>
      </form>
    </Modal>
  )
}
