import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Select, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleEvent, LifecycleReason, LifecycleRectifiableField } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { rectifyLifecycleEvent } from "@/services/lifecycleEvents"

import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type RectifyDialogProps = {
  event: LifecycleEvent
  // Corrected, or the event changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
  // The event type's catalog of reasons.
  reasons: LifecycleReason[]
}

type Errors = { newValue?: string; reason?: string }

const textMax = 500

// The Admin corrects the reason or the justification of an event, with why (Lucas's answer 16): a new
// related fact, the original stays in the event. The state, the seat, the number and the financial effect
// are never corrected.
export const RectifyDialog = (props: RectifyDialogProps) => {
  const { event, onChanged, onClose, reasons } = props

  const { t } = useTranslation()
  const { reasonLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [field, setField] = useState<LifecycleRectifiableField>("REASON")
  const [newValue, setNewValue] = useState("")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const fieldOptions: SelectOption[] = (["REASON", "JUSTIFICATION"] as const).map((value) => ({
    label: t(`lifecycle.rectify.fields.${value}`),
    value,
  }))
  const reasonOptions: SelectOption[] = reasons
    .filter((item) => item.code !== event.reasonCode)
    .map((item) => ({ label: reasonLabel(event.eventType, item.code, reasons), value: item.code }))

  useUnsavedChanges((newValue.trim() !== "" || reason.trim() !== "") && !isSaving)

  const confirm = async () => {
    const found: Errors = {}
    if (!newValue.trim()) {
      found.newValue =
        field === "REASON" ? t("lifecycle.rectify.newReasonRequired") : t("lifecycle.rectify.newJustificationRequired")
    }
    if (!reason.trim()) found.reason = t("lifecycle.rectify.reasonRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await rectifyLifecycleEvent(event.id, { field, newValue: newValue.trim(), reason: reason.trim() })
      toast.success(t("lifecycle.rectify.done"))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "LIFECYCLE_REASON_INVALID") {
        setErrors({ newValue: t("lifecycle.rectify.reasonInvalid") })
      } else if (code === "LIFECYCLE_EVENT_NOT_PREPARED" || getErrorStatus(error) === 404) {
        toast.error(t("lifecycle.confirm.changedMeanwhile"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("lifecycle.rectify.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("lifecycle.rectify.confirm")}
      description={t("lifecycle.rectify.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("lifecycle.rectify.title")}
      open
    >
      <Select
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => {
          setField((option?.value as LifecycleRectifiableField | undefined) ?? "REASON")
          setNewValue("")
          setErrors({})
        }}
        options={fieldOptions}
        placeholder={t("lifecycle.rectify.fieldPlaceholder")}
        title={t("lifecycle.rectify.field")}
        value={fieldOptions.find((option) => option.value === field) ?? null}
        required
      />

      {field === "REASON" ? (
        <Select
          error={errors.newValue}
          helperText={t("lifecycle.rectify.currentReason", {
            reason: reasonLabel(event.eventType, event.reasonCode, reasons),
          })}
          noOptionsMessage={t("common.noOptions")}
          onChange={(option) => {
            setNewValue(option?.value ?? "")
            setErrors((current) => ({ ...current, newValue: undefined }))
          }}
          options={reasonOptions}
          placeholder={t("lifecycle.rectify.newReasonPlaceholder")}
          title={t("lifecycle.rectify.newReason")}
          value={reasonOptions.find((option) => option.value === newValue) ?? null}
          required
        />
      ) : (
        <Textarea
          error={errors.newValue}
          helperText={t("lifecycle.prepare.justificationHelper")}
          maxLength={textMax}
          onChange={(change) => {
            setNewValue(change.target.value)
            setErrors((current) => ({ ...current, newValue: undefined }))
          }}
          placeholder={t("lifecycle.prepare.justificationPlaceholder")}
          title={t("lifecycle.rectify.newJustification")}
          value={newValue}
          required
        />
      )}

      <Textarea
        error={errors.reason}
        maxLength={textMax}
        onChange={(change) => {
          setReason(change.target.value)
          setErrors((current) => ({ ...current, reason: undefined }))
        }}
        placeholder={t("lifecycle.rectify.reasonPlaceholder")}
        title={t("lifecycle.rectify.reason")}
        value={reason}
        required
      />

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
