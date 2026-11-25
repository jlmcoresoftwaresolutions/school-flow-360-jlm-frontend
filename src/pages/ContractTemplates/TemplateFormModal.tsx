import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { ContractTemplate } from "@/models"
import { createContractTemplate, updateContractTemplate } from "@/services/contracts"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useFailureMessage } from "../shared/people/useFailureMessage"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import { contractFields, templateLimits } from "./contractTemplates.constants"

export type TemplateFormModalProps = {
  // A model whose text starts a new version (never changed itself).
  copyFrom?: ContractTemplate
  onClose: () => void
  // Saved, or the list has to be read again.
  onSaved: () => void
  // The draft to edit; none creates a new version.
  template?: ContractTemplate
}

type Values = { body: string; title: string }

// Writes a draft of the contract model (Admin only). The system brings no contract text: the school
// writes it, using only the controlled fields as {{field}}; a field that doesn't exist (as a financial
// one, which comes with the financial module) is refused on the text. Saving never approves it, and an
// approved model is never edited: a change is a new version.
export const TemplateFormModal = (props: TemplateFormModalProps) => {
  const { copyFrom, onClose, onSaved, template } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [original] = useState<Values>(() => ({
    body: template?.body ?? copyFrom?.body ?? "",
    title: template?.title ?? copyFrom?.title ?? "",
  }))
  const [values, setValues] = useState<Values>(original)
  const [errors, setErrors] = useState<Partial<Values>>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isEdit = Boolean(template)
  const isChanged = values.body !== original.body || values.title !== original.title
  const fields = template?.allowedFields.length ? template.allowedFields : contractFields

  useUnsavedChanges(isChanged && !isSaving)

  const set = (key: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const submit = async () => {
    setFailure("")
    const found: Partial<Values> = {}
    if (!values.title.trim()) found.title = t("contractTemplates.form.titleRequired")
    if (!values.body.trim()) found.body = t("contractTemplates.form.bodyRequired")
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const request = { body: values.body, title: values.title.trim() }
    setIsSaving(true)
    try {
      if (template) await updateContractTemplate(template.id, { ...request, version: template.version })
      else await createContractTemplate(request)
      toast.success(isEdit ? t("contractTemplates.form.updated") : t("contractTemplates.form.created"))
      onSaved()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "CONTRACT_FIELD_UNKNOWN") {
        setErrors({ body: t("contractTemplates.form.fieldUnknown") })
      } else if (code === "VERSION_CONFLICT" || code === "CONTRACT_TEMPLATE_NOT_DRAFT") {
        toast.error(t("contractTemplates.changedMeanwhile"))
        onSaved()
      } else if (getErrorStatus(error) === undefined && !isEdit) {
        toast.error(t("contractTemplates.form.noAnswer"))
        onSaved()
      } else {
        setFailure(toFailureMessage(t("contractTemplates.form.failed"), error))
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
            {isEdit ? t("common.save") : t("contractTemplates.form.create")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={
        isEdit
          ? t("contractTemplates.form.editTitle", { version: template?.versionNumber })
          : t("contractTemplates.form.createTitle")
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
          <Text color="secondary" fontSize="sm">
            {t("contractTemplates.form.description")}
          </Text>
          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}
          <Input
            error={errors.title}
            maxLength={templateLimits.title}
            onChange={(event) => set("title", event.target.value)}
            placeholder={t("contractTemplates.form.titlePlaceholder")}
            title={t("contractTemplates.form.title")}
            value={values.title}
            required
          />
          <Textarea
            error={errors.body}
            helperText={t("contractTemplates.form.bodyHelper", {
              fields: fields.map((field) => `{{${field}}}`).join(", "),
            })}
            maxLength={templateLimits.body}
            onChange={(event) => set("body", event.target.value)}
            placeholder={t("contractTemplates.form.bodyPlaceholder")}
            rows={14}
            title={t("contractTemplates.form.body")}
            value={values.body}
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
