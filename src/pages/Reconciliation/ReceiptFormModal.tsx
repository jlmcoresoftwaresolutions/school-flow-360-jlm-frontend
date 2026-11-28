import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, Input, Select, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { FinanceReceiptMethod, FinanceReceiptNature } from "@/models"
import { registerFinanceReceipt } from "@/services/financeLedger"
import { getErrorCode } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"
import { parseCents } from "@/utils/money"

import { useFinanceAccess } from "../shared/finance/useFinanceAccess"
import { useFinanceCommand } from "../shared/finance/useFinanceCommand"
import { receiptMethods, useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { FieldRow } from "../shared/people/people.styles"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { FormFields } from "../shared/userAccess/userAccess.styles"

export type ReceiptFormModalProps = {
  onClose: () => void
  onSaved: () => void
}

type Errors = Partial<Record<"evidence" | "fee" | "gross" | "method" | "nature" | "occurredOn" | "unit", string>>

const evidenceLimits = { max: 300, min: 3 }

// Registers a manual receipt (Fatia 1): the unit, whether it is still a report to validate (it satisfies
// nothing) or a validated receipt (it may be allocated), how it came in, the gross and the fee (never the
// student's debt), the day it was received (never in the future) and the proof. One intent per opening: a
// lost answer is looked up by it, never sent again blind (one receipt per payment).
export const ReceiptFormModal = (props: ReceiptFormModalProps) => {
  const { onClose, onSaved } = props

  const formId = useId()
  const { t } = useTranslation()
  const { units } = useFinanceAccess()
  const { methodLabel } = useFinanceLabels()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const [unitId, setUnitId] = useState(units.length === 1 ? String(units[0].id) : "")
  const [nature, setNature] = useState<FinanceReceiptNature | "">("")
  const [method, setMethod] = useState<FinanceReceiptMethod | "">("")
  const [gross, setGross] = useState("")
  const [fee, setFee] = useState("")
  const [occurredOn, setOccurredOn] = useState<Date | null>(null)
  const [evidence, setEvidence] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const unitOptions: SelectOption[] = units
    .filter((unit) => unit.active)
    .map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const natureOptions: SelectOption[] = (["VALIDATED", "REPORTED"] as const).map((value) => ({
    label: t(`finance.natures.${value}`),
    value,
  }))
  const methodOptions: SelectOption[] = receiptMethods.map((value) => ({ label: methodLabel(value), value }))
  const isDirty = nature !== "" || method !== "" || gross !== "" || fee !== "" || evidence.trim() !== ""

  useUnsavedChanges(isDirty && !isSaving)

  const done = () => {
    toast.success(t("finance.receipts.registered"))
    onSaved()
  }

  const submit = async () => {
    const grossCents = parseCents(gross)
    const feeCents = fee.trim() ? parseCents(fee) : 0
    const found: Errors = {}
    if (!unitId) found.unit = t("finance.receipts.unitRequired")
    if (!nature) found.nature = t("finance.receipts.natureRequired")
    if (!method) found.method = t("finance.receipts.methodRequired")
    if (grossCents === null || grossCents <= 0) found.gross = t("finance.receipts.grossRequired")
    if (feeCents === null || (grossCents !== null && feeCents > grossCents))
      found.fee = t("finance.receipts.feeInvalid")
    if (!occurredOn) found.occurredOn = t("finance.receipts.occurredOnRequired")
    else if (occurredOn > new Date()) found.occurredOn = t("finance.receipts.occurredOnFuture")
    if (evidence.trim().length < evidenceLimits.min)
      found.evidence = t("financeLifecycle.reasonRequired", evidenceLimits)
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || !nature || !method || grossCents === null || !occurredOn) return

    setIsSaving(true)
    try {
      await registerFinanceReceipt({
        evidenceNote: evidence.trim(),
        ...(feeCents ? { feeCents } : {}),
        grossCents,
        intent,
        method,
        nature,
        occurredOn: toIsoDate(occurredOn),
        unitId: Number(unitId),
      })
      done()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "FINANCE_AMOUNT_INVALID") setErrors({ gross: t("finance.receipts.grossRequired") })
      else if (code === "FINANCE_COMMAND_IN_PROGRESS") setFailure(t("financeLifecycle.inProgress"))
      else if (isLostAnswer(error) && (await ranMeanwhile())) done()
      else setFailure(toFailureMessage(t("finance.failed"), error))
    }
  }

  const clear = (key: keyof Errors) => setErrors((current) => ({ ...current, [key]: undefined }))

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
            {t("finance.receipts.register")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("finance.receipts.new")}
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
            {t("finance.receipts.formDescription")}
          </Text>
          <FieldRow>
            <Select
              error={errors.unit}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => {
                setUnitId(option?.value ?? "")
                clear("unit")
              }}
              options={unitOptions}
              placeholder={t("finance.unitPlaceholder")}
              title={t("finance.unit")}
              value={unitOptions.find((option) => option.value === unitId) ?? null}
              required
            />
            <Select
              error={errors.nature}
              helperText={nature ? t(`finance.natureHelpers.${nature}`) : undefined}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => {
                setNature((option?.value as FinanceReceiptNature | undefined) ?? "")
                clear("nature")
              }}
              options={natureOptions}
              placeholder={t("finance.receipts.naturePlaceholder")}
              title={t("finance.receipts.nature")}
              value={natureOptions.find((option) => option.value === nature) ?? null}
              required
            />
          </FieldRow>
          <FieldRow>
            <Select
              error={errors.method}
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => {
                setMethod((option?.value as FinanceReceiptMethod | undefined) ?? "")
                clear("method")
              }}
              options={methodOptions}
              placeholder={t("finance.receipts.methodPlaceholder")}
              title={t("finance.receipts.method")}
              value={methodOptions.find((option) => option.value === method) ?? null}
              required
            />
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.occurredOn}
              maxDate={new Date()}
              onChange={(value) => {
                setOccurredOn(value)
                clear("occurredOn")
              }}
              placeholder={t("common.datePlaceholder")}
              title={t("finance.receipts.occurredOn")}
              value={occurredOn}
              required
            />
          </FieldRow>
          <FieldRow>
            <Input
              error={errors.gross}
              inputMode="decimal"
              onChange={(event) => {
                setGross(event.target.value)
                clear("gross")
              }}
              placeholder={t("finance.amountPlaceholder")}
              title={t("finance.receipts.gross")}
              value={gross}
              required
            />
            <Input
              error={errors.fee}
              helperText={t("finance.receipts.feeHelper")}
              inputMode="decimal"
              onChange={(event) => {
                setFee(event.target.value)
                clear("fee")
              }}
              placeholder={t("finance.amountPlaceholder")}
              title={t("finance.receipts.fee")}
              value={fee}
            />
          </FieldRow>
          <Textarea
            error={errors.evidence}
            helperText={t("finance.receipts.evidenceHelper")}
            maxLength={evidenceLimits.max}
            onChange={(event) => {
              setEvidence(event.target.value)
              clear("evidence")
            }}
            placeholder={t("finance.receipts.evidencePlaceholder")}
            title={t("finance.receipts.evidence")}
            value={evidence}
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
