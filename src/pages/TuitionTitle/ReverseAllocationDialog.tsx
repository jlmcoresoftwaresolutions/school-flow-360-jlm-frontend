import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import { Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { FinanceAllocation } from "@/models"
import { reverseFinanceAllocation } from "@/services/financeLedger"
import { getErrorCode } from "@/services/httpClient"

import { useFinanceCommand } from "../shared/finance/useFinanceCommand"
import { useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type ReverseAllocationDialogProps = {
  allocation: FinanceAllocation
  onChanged: () => void
  onClose: () => void
}

const reasonLimits = { max: 300, min: 3 }

// Compensates an allocation (Fatia 1): the original stays, marked, and the title's residual comes back;
// the money stays in the receipt as unallocated. It is never a refund to the payer, which is its own
// operation. One intent per opening; a lost answer is looked up by it.
export const ReverseAllocationDialog = (props: ReverseAllocationDialogProps) => {
  const { allocation, onChanged, onClose } = props

  const { t } = useTranslation()
  const { money } = useFinanceLabels()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const [reason, setReason] = useState("")
  const [reasonError, setReasonError] = useState("")
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(!isSaving && reason.trim() !== "")

  const done = () => {
    toast.success(t("finance.reverse.done"))
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
      await reverseFinanceAllocation(allocation.id, intent, reason.trim())
      done()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "FINANCE_ALLOCATION_NOT_APPLIED" || code === "FINANCE_INTENT_REUSED") {
        toast.error(t("finance.changedMeanwhile"))
        onChanged()
      } else if (code === "FINANCE_COMMAND_IN_PROGRESS") {
        setFailure(t("financeLifecycle.inProgress"))
      } else if (isLostAnswer(error) && (await ranMeanwhile())) {
        done()
      } else {
        setFailure(toFailureMessage(t("finance.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("finance.reverse.action")}
      description={t("finance.reverse.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("finance.reverse.title", { amount: money(allocation.amountCents) })}
      tone="danger"
      open
    >
      <Textarea
        error={reasonError}
        maxLength={reasonLimits.max}
        onChange={(change) => {
          setReason(change.target.value)
          setReasonError("")
        }}
        placeholder={t("financeLifecycle.reasonPlaceholder")}
        title={t("financeLifecycle.reason")}
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
