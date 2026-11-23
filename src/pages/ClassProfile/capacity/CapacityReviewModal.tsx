import { useId, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import { Input, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { AcademicClassCapacity } from "@/models"
import { reviewAcademicClassCapacity } from "@/services/academicClassDetail"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { academicLimits } from "../../shared/academic/academicLimits"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { FormFields } from "../../shared/userAccess/userAccess.styles"

export type CapacityReviewModalProps = {
  capacity: AcademicClassCapacity
  onChanged: () => void
  onClose: () => void
}

// Reviews a class's limit, with a reason that goes to its history with the old and new limits. Raising
// it needs no count; lowering it asks the enrollment again on confirmation - while the enrollment doesn't
// answer it can't be lowered, and a limit below the enrolled students is refused (they stay enrolled).
export const CapacityReviewModal = (props: CapacityReviewModalProps) => {
  const { capacity, onChanged, onClose } = props

  const { t } = useTranslation()
  const toFailureMessage = useFailureMessage()

  const formId = useId()

  const [value, setValue] = useState(String(capacity.capacity))
  const [reason, setReason] = useState("")
  const [errors, setErrors] = useState<{ capacity?: string; reason?: string }>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const newCapacity = value === "" ? null : Number(value)
  const isLowering = newCapacity !== null && newCapacity < capacity.capacity
  const isChanged = newCapacity !== capacity.capacity || reason.trim() !== ""

  useUnsavedChanges(isChanged && !isSaving)

  const submit = async () => {
    const found: typeof errors = {}
    if (newCapacity === null) found.capacity = t("classCapacity.review.capacityRequired")
    else if (newCapacity === capacity.capacity) found.capacity = t("classCapacity.review.unchanged")
    if (!reason.trim()) found.reason = t("classCapacity.review.reasonRequired")
    setErrors(found)
    setFailure("")
    if (Object.keys(found).length > 0 || newCapacity === null) return

    setIsSaving(true)
    try {
      await reviewAcademicClassCapacity(capacity.classId, {
        newCapacity,
        reason: reason.trim(),
        version: capacity.version,
      })
      toast.success(t("classCapacity.review.done", { capacity: newCapacity }))
      onChanged()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      if (code === "ACADEMIC_SOURCE_UNAVAILABLE") {
        setFailure(t("classCapacity.review.sourceUnavailable"))
      } else if (code === "ACADEMIC_CAPACITY_BELOW_OCCUPATION") {
        setErrors({ capacity: t("classCapacity.review.belowOccupation") })
      } else if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("classCapacity.changedMeanwhile"))
        onChanged()
      } else if (code === "ACADEMIC_NOT_ELIGIBLE") {
        setFailure(t("classCapacity.review.notEligible"))
      } else if (code === "ACADEMIC_FIELD_INCOMPATIBLE" || getErrorStatus(error) === 400) {
        setErrors({ capacity: t("classCapacity.review.capacityInvalid") })
      } else {
        setFailure(toFailureMessage(t("classCapacity.review.failed"), error))
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
            {t("classCapacity.review.confirm")}
          </Button>
        </>
      }
      onClose={onClose}
      size="sm"
      title={t("classCapacity.review.title")}
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
            {t("classCapacity.review.description", { capacity: capacity.capacity })}
          </Text>

          {failure && (
            <Text color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}

          <Input
            error={errors.capacity}
            helperText={isLowering ? t("classCapacity.review.loweringHelper") : undefined}
            maxLength={4}
            onChange={(event) => {
              setValue(event.target.value)
              setErrors((current) => ({ ...current, capacity: undefined }))
            }}
            placeholder={t("classCapacity.review.capacityPlaceholder")}
            title={t("classCapacity.review.newCapacity")}
            value={value}
            numeric
            required
          />
          <Textarea
            error={errors.reason}
            maxLength={academicLimits.reason}
            onChange={(event) => {
              setReason(event.target.value)
              setErrors((current) => ({ ...current, reason: undefined }))
            }}
            placeholder={t("classCapacity.review.reasonPlaceholder")}
            title={t("classCapacity.review.reason")}
            value={reason}
            required
          />
        </FormFields>
      </form>
    </Modal>
  )
}
