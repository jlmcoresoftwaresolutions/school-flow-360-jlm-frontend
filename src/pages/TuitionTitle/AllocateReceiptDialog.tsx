import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { Input, Select } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { FinanceReceipt, FinanceTitle } from "@/models"
import { allocateFinanceReceipt, listFinanceReceipts } from "@/services/financeLedger"
import { getErrorCode } from "@/services/httpClient"
import { formatDate } from "@/utils/dates"
import { parseCents } from "@/utils/money"

import { useFinanceCommand } from "../shared/finance/useFinanceCommand"
import { useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type AllocateReceiptDialogProps = {
  // Allocated, or the title or the receipt changed meanwhile: read the title again.
  onChanged: () => void
  onClose: () => void
  title: FinanceTitle
}

type Errors = { amount?: string; receipt?: string }

// The backend's page limit, for the receipts of the unit read at once.
const receiptsPageSize = 100

// Allocates part of a confirmed receipt of the title's unit to it (Fatia 1): the receipt is chosen among
// the confirmed ones with something left, and the amount starts as the smaller of what is left in the
// receipt and the title's residual. The allocation carries the version of the title shown: if it changed
// meanwhile, nothing is allocated and the title is read again. What is left over stays unallocated in the
// receipt (never credit). One intent per opening; a lost answer is looked up by it.
export const AllocateReceiptDialog = (props: AllocateReceiptDialogProps) => {
  const { onChanged, onClose, title } = props

  const { t } = useTranslation()
  const { methodLabel, money } = useFinanceLabels()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const [receipts, setReceipts] = useState<FinanceReceipt[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [receiptId, setReceiptId] = useState("")
  const [amount, setAmount] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const available = (receipts ?? []).filter((receipt) => receipt.unallocatedCents > 0)
  const chosen = available.find((receipt) => String(receipt.id) === receiptId)
  const options: SelectOption[] = available.map((receipt) => ({
    label: t("finance.allocate.receiptOption", {
      date: formatDate(receipt.occurredOn),
      left: money(receipt.unallocatedCents),
      method: methodLabel(receipt.method),
    }),
    value: String(receipt.id),
  }))

  useUnsavedChanges(!isSaving && (receiptId !== "" || amount !== ""))

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const page = await listFinanceReceipts(
          { size: receiptsPageSize, status: "CONFIRMED", unitId: title.unitId },
          { showLoading: false },
        )
        if (!isStale) setReceipts(page.items)
      } catch {
        if (!isStale) setLoadFailed(true)
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [title.unitId])

  const done = () => {
    toast.success(t("finance.allocate.done"))
    onChanged()
  }

  const confirm = async () => {
    const cents = parseCents(amount)
    const found: Errors = {}
    if (!chosen) found.receipt = t("finance.allocate.receiptRequired")
    if (cents === null || cents <= 0) found.amount = t("finance.allocate.amountRequired")
    else if (chosen && cents > chosen.unallocatedCents) found.amount = t("finance.allocate.aboveReceipt")
    else if (cents > title.residualCents) found.amount = t("finance.allocate.aboveTitle")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || !chosen || cents === null) return

    setIsSaving(true)
    try {
      await allocateFinanceReceipt({
        amountCents: cents,
        intent,
        receiptId: chosen.id,
        titleId: title.id,
        titleVersion: title.version,
      })
      done()
    } catch (error) {
      setIsSaving(false)
      switch (getErrorCode(error)) {
        case "FINANCE_ALLOCATION_EXCEEDS_RECEIPT":
          setErrors({ amount: t("finance.allocate.aboveReceipt") })
          break
        case "FINANCE_ALLOCATION_EXCEEDS_TITLE":
          setErrors({ amount: t("finance.allocate.aboveTitle") })
          break
        case "FINANCE_UNIT_MISMATCH":
        case "FINANCE_RECEIPT_NOT_CONFIRMED":
          setErrors({ receipt: t("finance.allocate.receiptInvalid") })
          break
        case "FINANCE_TITLE_VERSION_STALE":
        case "FINANCE_TITLE_NOT_PAYABLE":
        case "FINANCE_INTENT_REUSED":
          toast.error(t("finance.changedMeanwhile"))
          onChanged()
          break
        case "FINANCE_COMMAND_IN_PROGRESS":
          setFailure(t("financeLifecycle.inProgress"))
          break
        default:
          if (isLostAnswer(error) && (await ranMeanwhile())) done()
          else setFailure(toFailureMessage(t("finance.failed"), error))
      }
    }
  }

  const renderReceipts = () => {
    if (loadFailed) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("finance.allocate.receiptsFailed")}
        </Text>
      )
    }
    if (receipts && available.length === 0) {
      return (
        <Text color="secondary" fontSize="sm" role="note">
          {t("finance.allocate.noReceipts")}
        </Text>
      )
    }
    return (
      <Select
        error={errors.receipt}
        isDisabled={!receipts}
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => {
          const next = available.find((receipt) => String(receipt.id) === option?.value)
          setReceiptId(option?.value ?? "")
          if (next && amount === "") {
            setAmount((Math.min(next.unallocatedCents, title.residualCents) / 100).toFixed(2).replace(".", ","))
          }
          setErrors((current) => ({ ...current, receipt: undefined }))
        }}
        options={options}
        placeholder={receipts ? t("finance.allocate.receiptPlaceholder") : t("finance.allocate.receiptsLoading")}
        title={t("finance.allocate.receipt")}
        value={options.find((option) => option.value === receiptId) ?? null}
        required
      />
    )
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmDisabled={!receipts || available.length === 0}
      confirmLabel={t("finance.allocate.confirm")}
      description={t("finance.allocate.description", { residual: money(title.residualCents) })}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={t("finance.allocate.title", { number: title.installmentNo })}
      open
    >
      {renderReceipts()}
      <Input
        error={errors.amount}
        helperText={t("finance.allocate.amountHelper")}
        inputMode="decimal"
        onChange={(event) => {
          setAmount(event.target.value)
          setErrors((current) => ({ ...current, amount: undefined }))
        }}
        placeholder={t("finance.amountPlaceholder")}
        title={t("finance.allocate.amount")}
        value={amount}
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
