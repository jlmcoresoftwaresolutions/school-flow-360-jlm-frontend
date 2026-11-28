import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { LifecycleEvent } from "@/models"
import { registerFinanceTransferReview } from "@/services/financeLifecycle"
import { getErrorCode } from "@/services/httpClient"

import { useFinanceCommand } from "../../shared/finance/useFinanceCommand"
import { useFailureMessage } from "../../shared/people/useFailureMessage"

export type TransferReviewDialogProps = {
  event: LifecycleEvent
  // Recorded, or no longer needed: read the event again.
  onChanged: () => void
  onClose: () => void
}

const reasonLimits = { max: 300, min: 3 }

// The Financeiro (or the Admin) of the origin unit records the review of a transfer whose price, payer or
// conditions changed (Lucas's answer 6 of 26/11/2026): balances, payments and credit stay with the origin,
// nothing is charged twice, and the destination follows its own formalization. Only then is the transfer
// confirmed. One intent per opening; a lost answer is looked up by it.
export const TransferReviewDialog = (props: TransferReviewDialogProps) => {
  const { event, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(!isSaving && reason.trim() !== "")

  const done = () => {
    toast.success(t("financeLifecycle.review.done"))
    onChanged()
  }

  const confirm = async () => {
    if (reason.trim().length < reasonLimits.min) {
      setReasonError(t("financeLifecycle.reasonRequired", reasonLimits))
      return
    }
    setReasonError("")
    setFailure("")
    setIsSaving(true)
    try {
      await registerFinanceTransferReview(event.id, { intent, reason: reason.trim() })
      done()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (
        code === "FINANCE_REVIEW_NOT_NEEDED" ||
        code === "FINANCE_EVENT_NOT_OPEN" ||
        code === "FINANCE_INTENT_REUSED"
      ) {
        toast.info(t("financeLifecycle.review.notNeeded"))
        onChanged()
      } else if (code === "FINANCE_COMMAND_IN_PROGRESS") {
        setFailure(t("financeLifecycle.inProgress"))
      } else if (isLostAnswer(error) && (await ranMeanwhile())) {
        done()
      } else {
        setFailure(toFailureMessage(t("financeLifecycle.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("financeLifecycle.review.confirm")}
      description={t("financeLifecycle.review.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("financeLifecycle.review.title")}
      open
    >
      <Textarea
        error={reasonError}
        maxLength={reasonLimits.max}
        onChange={(change) => {
          setReason(change.target.value)
          setReasonError("")
        }}
        placeholder={t("financeLifecycle.review.reasonPlaceholder")}
        title={t("financeLifecycle.review.reason")}
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
