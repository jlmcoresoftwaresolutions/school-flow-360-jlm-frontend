import { useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate } from "react-router-dom"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, Input, Select, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { Enrollment } from "@/models"
import { paths } from "@/routes/paths"
import { regularizeFinanceObligation } from "@/services/financeLedger"
import { getErrorCode } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"
import { stripNonDigits } from "@/utils/formats"
import { parseCents } from "@/utils/money"

import { useFinanceCommand } from "../../shared/finance/useFinanceCommand"
import { FieldRow } from "../../shared/people/people.styles"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { FormFields } from "../../shared/userAccess/userAccess.styles"

export type RegularizeModalProps = {
  enrollment: Enrollment
  onClose: () => void
}

type Errors = Partial<Record<"basis" | "firstDue" | "installments" | "party" | "total", string>>

const basisLimits = { max: 300, min: 5 }
const installmentLimits = { max: 60, min: 1 }

// Regularizes the financial side of one confirmed enrollment that has no obligation yet (Lucas's answer 26
// of 27/11/2026): nothing is charged automatically. The Financeiro (or the Admin) of the unit checks the
// contract, the titles already issued and the payments, and records only the balance still due: the
// financial party (one of the enrollment's financial guardians, or the adult student with none), the total,
// the number of installments (the division's remainder goes to the last) and the first due date, with
// what was checked. An enrollment no longer in force is regularized as an old obligation, without
// reactivating anyone. If the enrollment already has an obligation, the case goes to a check instead of
// a second charge. One intent per opening; a lost answer is looked up by it.
export const RegularizeModal = (props: RegularizeModalProps) => {
  const { enrollment, onClose } = props

  const formId = useId()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toFailureMessage = useFailureMessage()
  const { intent, isLostAnswer, ranMeanwhile } = useFinanceCommand()

  const historical = enrollment.status !== "ACTIVE"
  const guardians = enrollment.parties.filter((party) => party.financial && (historical || party.linkActive))
  const partyOptions: SelectOption[] = [
    ...guardians.map((party) => ({ label: party.guardianName, value: String(party.guardianId) })),
    ...(historical || guardians.length === 0
      ? [
          {
            label: t("finance.regularize.theStudent", { name: enrollment.student.name }),
            value: String(enrollment.student.id),
          },
        ]
      : []),
  ]

  const [party, setParty] = useState(partyOptions.length === 1 ? partyOptions[0].value : "")
  const [total, setTotal] = useState("")
  const [installments, setInstallments] = useState("")
  const [firstDue, setFirstDue] = useState<Date | null>(null)
  const [basis, setBasis] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges(!isSaving && (total !== "" || installments !== "" || basis.trim() !== ""))

  const done = (firstTitleId?: number) => {
    toast.success(t("finance.regularize.done"))
    onClose()
    if (firstTitleId) navigate(generatePath(paths.tuitionTitle, { titleId: String(firstTitleId) }))
  }

  const submit = async () => {
    const totalCents = parseCents(total)
    const count = Number(installments)
    const found: Errors = {}
    if (!party) found.party = t("finance.regularize.partyRequired")
    if (totalCents === null || totalCents <= 0) found.total = t("finance.regularize.totalRequired")
    if (!Number.isInteger(count) || count < installmentLimits.min || count > installmentLimits.max) {
      found.installments = t("finance.regularize.installmentsInvalid", installmentLimits)
    }
    if (!firstDue) found.firstDue = t("finance.regularize.firstDueRequired")
    if (basis.trim().length < basisLimits.min) found.basis = t("financeLifecycle.reasonRequired", basisLimits)
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || totalCents === null || !firstDue) return

    setIsSaving(true)
    try {
      const obligation = await regularizeFinanceObligation({
        basis: basis.trim(),
        enrollmentId: enrollment.id,
        firstDueDate: toIsoDate(firstDue),
        ...(historical ? { historical: true } : {}),
        installments: count,
        intent,
        partyPersonId: Number(party),
        totalCents,
      })
      done(obligation.titles[0]?.id)
    } catch (error) {
      setIsSaving(false)
      switch (getErrorCode(error)) {
        case "FINANCE_ORIGIN_ALREADY_REGISTERED":
          setFailure(t("finance.regularize.alreadyRegistered"))
          break
        case "FINANCE_PARTY_NOT_ELIGIBLE":
          setErrors({ party: t("finance.regularize.partyNotEligible") })
          break
        case "FINANCE_ENROLLMENT_NOT_ELIGIBLE":
          setFailure(t("finance.regularize.notEligible"))
          break
        case "FINANCE_AMOUNT_INVALID":
          setErrors({ total: t("finance.regularize.totalRequired") })
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
            {t("finance.regularize.confirm")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t("finance.regularize.title", { name: enrollment.student.name })}
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
            {historical ? t("finance.regularize.descriptionHistorical") : t("finance.regularize.description")}
          </Text>
          <Select
            error={errors.party}
            helperText={t("finance.regularize.partyHelper")}
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setParty(option?.value ?? "")
              clear("party")
            }}
            options={partyOptions}
            placeholder={t("finance.regularize.partyPlaceholder")}
            title={t("finance.regularize.party")}
            value={partyOptions.find((option) => option.value === party) ?? null}
            required
          />
          <FieldRow>
            <Input
              error={errors.total}
              helperText={t("finance.regularize.totalHelper")}
              inputMode="decimal"
              onChange={(event) => {
                setTotal(event.target.value)
                clear("total")
              }}
              placeholder={t("finance.amountPlaceholder")}
              title={t("finance.regularize.total")}
              value={total}
              required
            />
            <Input
              error={errors.installments}
              inputMode="numeric"
              maxLength={2}
              onChange={(event) => {
                setInstallments(stripNonDigits(event.target.value))
                clear("installments")
              }}
              placeholder={t("finance.regularize.installmentsPlaceholder")}
              title={t("finance.regularize.installments")}
              value={installments}
              required
            />
          </FieldRow>
          <DateInput
            clearLabel={t("people.form.clearDate")}
            error={errors.firstDue}
            helperText={t("finance.regularize.firstDueHelper")}
            onChange={(value) => {
              setFirstDue(value)
              clear("firstDue")
            }}
            placeholder={t("common.datePlaceholder")}
            title={t("finance.regularize.firstDue")}
            value={firstDue}
            required
          />
          <Textarea
            error={errors.basis}
            helperText={t("finance.regularize.basisHelper")}
            maxLength={basisLimits.max}
            onChange={(event) => {
              setBasis(event.target.value)
              clear("basis")
            }}
            placeholder={t("finance.regularize.basisPlaceholder")}
            title={t("finance.regularize.basis")}
            value={basis}
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
