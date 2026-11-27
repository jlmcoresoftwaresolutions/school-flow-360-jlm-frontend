import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { LifecycleNotificationTemplate } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { updateNotificationTemplate } from "@/services/lifecyclePolicies"

import { useFailureMessage } from "../shared/people/useFailureMessage"
import { FormFields } from "../shared/userAccess/userAccess.styles"
import { templateFields, templateLimits } from "./lifecyclePolicies.constants"

export type TemplateModalProps = {
  onClose: () => void
  // Saved, or changed by someone else meanwhile: read the texts again.
  onSaved: () => void
  template: LifecycleNotificationTemplate
  // The notification's name (the event type, or a lock's return).
  typeName: string
}

type Errors = { body?: string; subject?: string }

// The Admin edits the subject and the text of a notification (Fatia H): published data, with the backend's
// proposal as the starting text. The text may only use the controlled fields, written {{field}}; one that
// doesn't exist is refused. One changed by someone else meanwhile is read again.
export const TemplateModal = (props: TemplateModalProps) => {
  const { onClose, onSaved, template, typeName } = props

  const formId = useId()
  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [subject, setSubject] = useState(template.subject)
  const [body, setBody] = useState(template.body)
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isChanged = subject !== template.subject || body !== template.body

  useUnsavedChanges(isChanged && !isSaving)

  const submit = async () => {
    const found: Errors = {}
    if (!subject.trim()) found.subject = t("lifecyclePolicies.templates.subjectRequired")
    if (!body.trim()) found.body = t("lifecyclePolicies.templates.bodyRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await updateNotificationTemplate(template.eventType, {
        body: body.trim(),
        subject: subject.trim(),
        version: template.version,
      })
      toast.success(t("lifecyclePolicies.templates.saved"))
      onSaved()
    } catch (error) {
      setIsSaving(false)
      if (getErrorCode(error) === "VERSION_CONFLICT") {
        toast.error(t("lifecyclePolicies.changedMeanwhile"))
        onSaved()
      } else if (getErrorStatus(error) === 400) {
        setErrors({ body: t("lifecyclePolicies.templates.invalid") })
      } else {
        setFailure(toFailureMessage(t("lifecyclePolicies.failed"), error))
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
          <Button disabled={isSaving || !isChanged} form={formId} type="submit">
            {t("common.save")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("lifecyclePolicies.templates.editTitle", { name: typeName })}
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
          <Input
            error={errors.subject}
            maxLength={templateLimits.subject}
            onChange={(event) => {
              setSubject(event.target.value)
              setErrors((current) => ({ ...current, subject: undefined }))
            }}
            placeholder={t("lifecyclePolicies.templates.subjectPlaceholder")}
            title={t("lifecyclePolicies.templates.subject")}
            value={subject}
            required
          />
          <Textarea
            error={errors.body}
            helperText={t("lifecyclePolicies.templates.bodyHelper", {
              fields: templateFields.map((field) => `{{${field}}}`).join(", "),
              interpolation: { escapeValue: false },
            })}
            maxLength={templateLimits.body}
            onChange={(event) => {
              setBody(event.target.value)
              setErrors((current) => ({ ...current, body: undefined }))
            }}
            placeholder={t("lifecyclePolicies.templates.bodyPlaceholder")}
            rows={10}
            title={t("lifecyclePolicies.templates.body")}
            value={body}
            required
          />
          {failure && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
