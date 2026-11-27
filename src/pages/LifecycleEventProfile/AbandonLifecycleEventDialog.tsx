import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleEvent } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { abandonLifecycleEvent } from "@/services/lifecycleEvents"

import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type AbandonLifecycleEventDialogProps = {
  event: LifecycleEvent
  // The event changed (given up, or changed by someone else meanwhile): read it again.
  onChanged: () => void
  onClose: () => void
  onGone: () => void
}

const reasonMax = 500

// Gives a prepared lifecycle event up, with a reason (1 to 500 characters), confirmed first. Its
// destination preparation is given up with it; the current enrollment is never touched. Only explicit:
// an event is never given up for being idle. One changed by someone else meanwhile is read again instead.
export const AbandonLifecycleEventDialog = (props: AbandonLifecycleEventDialogProps) => {
  const { event, onChanged, onClose, onGone } = props

  const { t } = useTranslation()
  const { typeLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError(t("lifecycle.abandon.reasonRequired"))
      return
    }

    setReasonError("")
    setFailure("")
    setIsSaving(true)
    try {
      await abandonLifecycleEvent(event.id, { reason: trimmed, version: event.version })
      toast.success(t("lifecycle.abandon.done"))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT" || code === "LIFECYCLE_EVENT_NOT_PREPARED") {
        toast.error(t("lifecycle.abandon.conflict"))
        onChanged()
      } else {
        setFailure(toFailureMessage(t("lifecycle.abandon.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("lifecycle.abandon.confirm")}
      description={t(
        event.destinationEnrollmentId ? "lifecycle.abandon.withDestination" : "lifecycle.abandon.description",
      )}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("lifecycle.abandon.title", { type: typeLabel(event.eventType) })}
      tone="danger"
      open
    >
      <Textarea
        error={reasonError}
        maxLength={reasonMax}
        onChange={(change) => {
          setReason(change.target.value)
          if (change.target.value.trim()) setReasonError("")
        }}
        placeholder={t("lifecycle.abandon.reasonPlaceholder")}
        title={t("lifecycle.abandon.reason")}
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
