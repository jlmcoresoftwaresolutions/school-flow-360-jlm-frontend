import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { DateInput, Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import { authorizeAcademicCapacityException } from "@/services/academicClassDetail"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { toIsoDate } from "@/utils/dates"

import { academicLimits } from "../../shared/academic/academicLimits"
import { FieldRow } from "../../shared/people/people.styles"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { FormFields } from "../../shared/userAccess/userAccess.styles"

export type CapacityExceptionModalProps = {
  classId: number
  onChanged: () => void
  onClose: () => void
}

type Errors = Partial<Record<"quantity" | "reason" | "validUntil", string>>

const requestRefMax = 60

// A formal exception to a class's limit (only the Admin, and only while the institution has it turned
// on): how many seats above the limit, why, until when (not in the past, inside the period) and the
// request it answers. It is only recorded: nothing uses it until the enrollment does.
export const CapacityExceptionModal = (props: CapacityExceptionModalProps) => {
  const { classId, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [quantity, setQuantity] = useState("")
  const [reason, setReason] = useState("")
  const [validUntil, setValidUntil] = useState<Date | null>(null)
  const [requestRef, setRequestRef] = useState("")
  const [errors, setErrors] = useState<Errors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useUnsavedChanges((quantity !== "" || reason.trim() !== "") && !isSaving)

  const submit = async () => {
    const found: Errors = {}
    if (!quantity || Number(quantity) <= 0) found.quantity = t("classCapacity.exception.quantityRequired")
    if (!reason.trim()) found.reason = t("classCapacity.exception.reasonRequired")
    if (!validUntil) found.validUntil = t("classCapacity.exception.validUntilRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || !validUntil) return

    setIsSaving(true)
    try {
      await authorizeAcademicCapacityException(classId, {
        quantity: Number(quantity),
        reason: reason.trim(),
        requestRef: requestRef.trim(),
        validUntil: toIsoDate(validUntil),
      })
      toast.success(t("classCapacity.exception.done"))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "CAPACITY_EXCEPTION_DISABLED") {
        setFailure(t("classCapacity.exception.disabled"))
      } else if (code === "ACADEMIC_INVALID_RANGE") {
        setErrors({ validUntil: t("classCapacity.exception.validUntilInvalid") })
      } else if (code === "ACADEMIC_FIELD_INCOMPATIBLE") {
        setErrors({ quantity: t("classCapacity.exception.quantityRequired") })
      } else if (getErrorStatus(error) === 403) {
        setFailure(t("classCapacity.exception.forbidden"))
      } else {
        setFailure(toFailureMessage(t("classCapacity.exception.failed"), error))
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
          <Button disabled={isSaving} form={formId} type="submit">
            {t("classCapacity.exception.confirm")}
          </Button>
        </>
      }
      onClose={onClose}
      size="md"
      title={t("classCapacity.exception.title")}
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
            {t("classCapacity.exception.description")}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <FieldRow>
            <Input
              error={errors.quantity}
              maxLength={4}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("classCapacity.exception.quantityPlaceholder")}
              title={t("classCapacity.exception.quantity")}
              value={quantity}
              numeric
              required
            />
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.validUntil}
              onChange={setValidUntil}
              placeholder={t("common.datePlaceholder")}
              title={t("classCapacity.exception.validUntil")}
              value={validUntil}
              required
            />
          </FieldRow>
          <Input
            maxLength={requestRefMax}
            onChange={(event) => setRequestRef(event.target.value)}
            placeholder={t("classCapacity.exception.requestRefPlaceholder")}
            title={t("classCapacity.exception.requestRef")}
            value={requestRef}
          />
          <Textarea
            error={errors.reason}
            maxLength={academicLimits.reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder={t("classCapacity.exception.reasonPlaceholder")}
            title={t("classCapacity.exception.reason")}
            value={reason}
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
