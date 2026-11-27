import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleEvent } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { authorizeLifecycleCapacity } from "@/services/lifecycleEvents"

import { useFailureMessage } from "../shared/people/useFailureMessage"

export type AuthorizeCapacityDialogProps = {
  event: LifecycleEvent
  // Authorized, or the event changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
}

const reasonMax = 500

// The Admin authorizes one seat above the destination class's limit for this event (Lucas's answer 4 of
// 26/11/2026), with a reason: tied to the event and its destination class, valid 24 hours from now and
// used once by the confirmation; the class never goes above capacity + 1, however many are authorized.
// The backend refuses it where the unit didn't enable the exception, where the class has a seat again or
// is already at capacity + 1.
export const AuthorizeCapacityDialog = (props: AuthorizeCapacityDialogProps) => {
  const { event, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(reason.trim() !== "" && !isSaving)

  const confirm = async () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setReasonError(t("lifecycle.capacity.reasonRequired"))
      return
    }

    setReasonError("")
    setFailure("")
    setIsSaving(true)
    try {
      await authorizeLifecycleCapacity(event.id, trimmed)
      toast.success(t("lifecycle.capacity.authorized"))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      switch (getErrorCode(error)) {
        case "CAPACITY_EXCEPTION_NOT_PUBLISHED":
        case "CAPACITY_EXCEPTION_DISABLED":
          setFailure(t("lifecycle.capacity.notEnabled"))
          break
        case "CAPACITY_EXCEPTION_CEILING":
          setFailure(t("lifecycle.capacity.ceiling"))
          break
        case "CAPACITY_EXCEPTION_NOT_NEEDED":
          toast.info(t("lifecycle.capacity.notNeeded"))
          onChanged()
          break
        case "CAPACITY_EXCEPTION_EXISTS":
        case "CAPACITY_EXCEPTION_DESTINATION_MISSING":
        case "CAPACITY_EXCEPTION_NOT_APPLICABLE":
        case "LIFECYCLE_EVENT_NOT_PREPARED":
          toast.error(t("lifecycle.capacity.changedMeanwhile"))
          onChanged()
          break
        default:
          setFailure(toFailureMessage(t("lifecycle.capacity.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("lifecycle.capacity.authorize")}
      description={t("lifecycle.capacity.authorizeDescription")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("lifecycle.capacity.authorizeTitle")}
      open
    >
      <Textarea
        error={reasonError}
        maxLength={reasonMax}
        onChange={(change) => {
          setReason(change.target.value)
          if (change.target.value.trim()) setReasonError("")
        }}
        placeholder={t("lifecycle.capacity.reasonPlaceholder")}
        title={t("lifecycle.capacity.reason")}
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
