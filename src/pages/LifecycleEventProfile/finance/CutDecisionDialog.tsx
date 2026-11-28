import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DescriptionList, Select, Textarea } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { FinanceCutItem, FinanceCutOutcome, LifecycleEvent } from "@/models"
import { decideFinanceCut } from "@/services/financeLifecycle"
import { getErrorCode } from "@/services/httpClient"
import { formatDate } from "@/utils/dates"
import { formatCents } from "@/utils/money"

import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { useFinanceCommand } from "./useFinanceCommand"

export type CutDecisionDialogProps = {
  // Only the Admin of the institution cancels an installment that crosses the cut (a concession).
  canCancel: boolean
  event: LifecycleEvent
  item: FinanceCutItem
  // Decided, or the installment or the event changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
}

type Errors = { outcome?: string; reason?: string }

const reasonLimits = { max: 300, min: 3 }

// The decision on an installment that crosses a cancellation's cut (JLM-554): keep it due, or cancel it
// (a concession, only by the Admin, never on an installment with a payment), with why. It is tied to the
// version of the installment shown: if a payment arrives meanwhile, the decision stops counting and the
// case blocks again. One intent per opening; a lost answer is looked up by it.
export const CutDecisionDialog = (props: CutDecisionDialogProps) => {
  const { canCancel, event, item, onChanged, onClose } = props

  const { i18n, t } = useTranslation()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const [outcome, setOutcome] = useState<FinanceCutOutcome | "">("")
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const hasPayment = item.allocatedCents > 0
  const outcomes: FinanceCutOutcome[] = canCancel && !hasPayment ? ["KEEP_DUE", "CANCEL"] : ["KEEP_DUE"]
  const outcomeOptions: SelectOption[] = outcomes.map((value) => ({
    label: t(`financeLifecycle.cut.outcomes.${value}`),
    value,
  }))
  const money = (cents: number) => formatCents(cents, i18n.language)

  useUnsavedChanges(!isSaving && (outcome !== "" || reason.trim() !== ""))

  const done = () => {
    toast.success(t("financeLifecycle.cut.decided"))
    onChanged()
  }

  const confirm = async () => {
    const found: Errors = {}
    if (!outcome) found.outcome = t("financeLifecycle.cut.outcomeRequired")
    if (reason.trim().length < reasonLimits.min) found.reason = t("financeLifecycle.reasonRequired", reasonLimits)
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || !outcome) return

    setIsSaving(true)
    try {
      await decideFinanceCut(event.id, {
        intent,
        outcome,
        reason: reason.trim(),
        titleId: item.titleId,
        titleVersion: item.titleVersion,
      })
      done()
    } catch (error) {
      setIsSaving(false)
      switch (getErrorCode(error)) {
        case "FINANCE_DECISION_REQUIRES_ADMIN":
          setErrors({ outcome: t("financeLifecycle.cut.requiresAdmin") })
          break
        case "FINANCE_CANCEL_NEEDS_UNPAID":
          setErrors({ outcome: t("financeLifecycle.cut.needsUnpaid") })
          break
        case "FINANCE_TITLE_VERSION_STALE":
        case "FINANCE_DECISION_NOT_NEEDED":
        case "FINANCE_EVENT_NOT_OPEN":
        case "FINANCE_INTENT_REUSED":
          toast.error(t("financeLifecycle.changedMeanwhile"))
          onChanged()
          break
        case "FINANCE_COMMAND_IN_PROGRESS":
          setFailure(t("financeLifecycle.inProgress"))
          break
        default:
          if (isLostAnswer(error) && (await ranMeanwhile())) done()
          else setFailure(toFailureMessage(t("financeLifecycle.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={t("financeLifecycle.cut.decide")}
      description={t("financeLifecycle.cut.decideDescription")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("financeLifecycle.cut.decideTitle", { number: item.installmentNo })}
      open
    >
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "due", label: t("financeLifecycle.cut.dueDate"), value: formatDate(item.dueDate) },
          { key: "amount", label: t("financeLifecycle.cut.amount"), value: money(item.amountCents) },
          { key: "paid", label: t("financeLifecycle.cut.paid"), value: money(item.allocatedCents) },
          { key: "residual", label: t("financeLifecycle.cut.residual"), value: money(item.residualCents) },
        ]}
      />
      <Select
        error={errors.outcome}
        helperText={
          canCancel
            ? t(hasPayment ? "financeLifecycle.cut.withPayment" : "financeLifecycle.cut.outcomeHelper")
            : t("financeLifecycle.cut.onlyAdminCancels")
        }
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => {
          setOutcome((option?.value as FinanceCutOutcome | undefined) ?? "")
          setErrors((current) => ({ ...current, outcome: undefined }))
        }}
        options={outcomeOptions}
        placeholder={t("financeLifecycle.cut.outcomePlaceholder")}
        title={t("financeLifecycle.cut.outcome")}
        value={outcomeOptions.find((option) => option.value === outcome) ?? null}
        required
      />
      <Textarea
        error={errors.reason}
        maxLength={reasonLimits.max}
        onChange={(change) => {
          setReason(change.target.value)
          setErrors((current) => ({ ...current, reason: undefined }))
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
