import { useState } from "react"
import { useTranslation } from "react-i18next"

import { toast, useUnsavedChanges } from "@/components"
import { Text } from "@/ds-components/atoms"
import type { DescriptionListItem } from "@/ds-components/molecules"
import { DateInput, DescriptionList, Input } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import type { Enrollment, LifecycleEvent } from "@/models"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import { confirmLifecycleEvent, getLifecycleEvent, returnLifecycleLock } from "@/services/lifecycleEvents"
import { formatDate, toIsoDate } from "@/utils/dates"

import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type LifecycleCommandDialogProps = {
  // "confirm" confirms a prepared event; "return" returns a confirmed lock.
  action: "confirm" | "return"
  // The destination preparation, when the event has one (its class and start date are summed up).
  destination: Enrollment | null
  event: LifecycleEvent
  // Done, or the event changed meanwhile: read it again.
  onChanged: () => void
  onClose: () => void
}

type ReturnErrors = { attendanceRef?: string; requestedOn?: string }

// The backend's limit for the attendance's reference of a lock's return.
const attendanceRefMax = 80

// Confirms a prepared lifecycle event, or returns a confirmed lock, after a summary of what happens. The
// backend does it in one local transaction (origin, destination, seat, number and the mandatory
// consequences together, or nothing) and checks everything again: what still blocks it answers 422 and the
// page is read again to show it. A return records the day the family asked for it (never in the future)
// and the reference of the attendance in the school's channel (Lucas's answer 3 of 27/11/2026). Each
// opening of the dialog makes one `intent`: sending again after a lost answer gives the same result, never a
// second one, and a lost answer is checked by reading the event.
export const LifecycleCommandDialog = (props: LifecycleCommandDialogProps) => {
  const { action, destination, event, onChanged, onClose } = props

  const { t } = useTranslation()
  const { typeLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [intent] = useState(() => crypto.randomUUID())
  const [requestedOn, setRequestedOn] = useState<Date | null>(null)
  const [attendanceRef, setAttendanceRef] = useState("")
  const [returnErrors, setReturnErrors] = useState<ReturnErrors>({})
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const isConfirm = action === "confirm"
  const type = event.eventType
  const effectiveDate = event.effectiveDateOnConfirmation ?? event.effectiveDate

  useUnsavedChanges(!isConfirm && !isSaving && (requestedOn !== null || attendanceRef.trim() !== ""))

  const summary: DescriptionListItem[] = []
  if (isConfirm && type === "CANCELLATION") {
    summary.push({
      key: "effectiveDate",
      label: t("lifecycle.profile.effectiveDate"),
      value: effectiveDate ? formatDate(effectiveDate) : t("lifecycle.confirm.effectiveToday"),
    })
  }
  if (isConfirm && type === "LOCK" && event.lockDays !== null) {
    summary.push({
      key: "lockDays",
      label: t("lifecycle.profile.lockDays"),
      value: t("lifecycle.profile.days", { count: event.lockDays }),
    })
  }
  if (isConfirm && destination) {
    summary.push(
      {
        key: "unit",
        label: t("enrollments.unit"),
        value: destination.unitName ?? "",
      },
      {
        key: "class",
        label: t("enrollments.class.class"),
        value: destination.classContext ? `${destination.classContext.code} · ${destination.classContext.name}` : "",
      },
      {
        key: "startDate",
        label: t("lifecycle.profile.destinationStartDate"),
        value: destination.startDate ? formatDate(destination.startDate) : "",
      },
    )
  }

  const done = () => {
    toast.success(isConfirm ? t("lifecycle.confirm.done", { type: typeLabel(type) }) : t("lifecycle.return.done"))
    onChanged()
  }

  // No answer came: the event may have been confirmed (or returned) all the same.
  const recover = async () => {
    try {
      const read = await getLifecycleEvent(event.id, { showLoading: false })
      const happened = isConfirm ? read.status === "CONFIRMED" : read.returnedAt !== null
      if (happened) done()
      else setFailure(t("lifecycle.confirm.noAnswer"))
    } catch {
      setFailure(t("lifecycle.confirm.noAnswer"))
    }
  }

  const checkReturn = () => {
    const found: ReturnErrors = {}
    if (!requestedOn) found.requestedOn = t("lifecycle.return.requestedOnRequired")
    else if (requestedOn > new Date()) found.requestedOn = t("lifecycle.return.requestedOnFuture")
    if (!attendanceRef.trim()) found.attendanceRef = t("lifecycle.return.attendanceRefRequired")
    setReturnErrors(found)
    return Object.keys(found).length === 0
  }

  const confirm = async () => {
    if (!isConfirm && !checkReturn()) return

    setFailure("")
    setIsSaving(true)
    try {
      const request = { intent, version: event.version }
      if (isConfirm) await confirmLifecycleEvent(event.id, request)
      else {
        await returnLifecycleLock(event.id, {
          ...request,
          attendanceRef: attendanceRef.trim(),
          requestedOn: toIsoDate(requestedOn as Date),
        })
      }
      done()
    } catch (error) {
      setIsSaving(false)
      const code = getErrorCode(error)
      const status = getErrorStatus(error)
      if (code === "LIFECYCLE_CONFIRMATION_BLOCKED") {
        toast.error(t("lifecycle.confirm.blocked"))
        onChanged()
      } else if (
        code === "VERSION_CONFLICT" ||
        code === "LIFECYCLE_EVENT_NOT_PREPARED" ||
        code === "LIFECYCLE_LOCK_NOT_RETURNABLE" ||
        code === "LIFECYCLE_INTENT_REUSED"
      ) {
        toast.error(t("lifecycle.confirm.changedMeanwhile"))
        onChanged()
      } else if (status === 403) {
        setFailure(isConfirm ? t("lifecycle.confirm.forbidden") : t("lifecycle.return.forbidden"))
      } else if (status === 400 && !isConfirm) {
        setFailure(t("lifecycle.return.invalid"))
      } else if (status === undefined) {
        await recover()
      } else {
        setFailure(toFailureMessage(t("lifecycle.confirm.failed"), error))
      }
    }
  }

  return (
    <ConfirmDialog
      cancelLabel={t("common.cancel")}
      confirmLabel={isConfirm ? t("lifecycle.confirm.action") : t("lifecycle.return.action")}
      description={isConfirm ? t(`lifecycle.confirm.descriptions.${type}`) : t("lifecycle.return.description")}
      loading={isSaving}
      onClose={onClose}
      onConfirm={() => void confirm()}
      title={isConfirm ? t("lifecycle.confirm.title", { type: typeLabel(type) }) : t("lifecycle.return.title")}
      tone={isConfirm && type === "CANCELLATION" ? "danger" : undefined}
      open
    >
      {summary.length > 0 && <DescriptionList emptyValue={t("common.notInformed")} items={summary} />}
      {!isConfirm && (
        <>
          <DateInput
            clearLabel={t("people.form.clearDate")}
            error={returnErrors.requestedOn}
            helperText={t("lifecycle.return.requestedOnHelper")}
            maxDate={new Date()}
            onChange={(value) => {
              setRequestedOn(value)
              setReturnErrors((current) => ({ ...current, requestedOn: undefined }))
            }}
            placeholder={t("common.datePlaceholder")}
            title={t("lifecycle.return.requestedOn")}
            value={requestedOn}
            required
          />
          <Input
            error={returnErrors.attendanceRef}
            helperText={t("lifecycle.return.attendanceRefHelper")}
            maxLength={attendanceRefMax}
            onChange={(change) => {
              setAttendanceRef(change.target.value)
              setReturnErrors((current) => ({ ...current, attendanceRef: undefined }))
            }}
            placeholder={t("lifecycle.return.attendanceRefPlaceholder")}
            title={t("lifecycle.return.attendanceRef")}
            value={attendanceRef}
            required
          />
        </>
      )}
      {isConfirm && (
        <Text color="secondary" fontSize="sm">
          {t("lifecycle.confirm.after")}
        </Text>
      )}

      {failure && (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {failure}
        </Text>
      )}
    </ConfirmDialog>
  )
}
