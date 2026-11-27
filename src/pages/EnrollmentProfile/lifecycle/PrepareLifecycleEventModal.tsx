import { useEffect, useId, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate } from "react-router-dom"

import { toast, useUnsavedChanges } from "@/components"
import { Button, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { DateInput, Input, Select, Textarea } from "@/ds-components/molecules"
import { Modal } from "@/ds-components/organisms"
import type { Enrollment, LifecycleEvent, LifecycleEventType, LifecycleReason } from "@/models"
import { paths } from "@/routes/paths"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"
import {
  getLifecycleEventByIntent,
  listLifecycleEvents,
  listLifecycleReasons,
  prepareLifecycleEvent,
} from "@/services/lifecycleEvents"
import { toIsoDate } from "@/utils/dates"
import { stripNonDigits } from "@/utils/formats"

import { useLifecycleLabels } from "../../shared/enrollments/useLifecycleLabels"
import { useFailureMessage } from "../../shared/people/useFailureMessage"
import { FormFields } from "../../shared/userAccess/userAccess.styles"
import type { DirectoryUnit } from "../../shared/userAccess/useUnitDirectory"

export type PrepareLifecycleEventModalProps = {
  enrollment: Enrollment
  eventType: LifecycleEventType
  // The active units where the person operates: the destination of a transfer or a re-enrollment.
  operableUnits: DirectoryUnit[]
  // The origin enrollment changed meanwhile (no longer active, for instance): read it again.
  onChanged: () => void
  onClose: () => void
}

type Reasons = { error: true } | { items: LifecycleReason[] }

type FieldErrors = {
  destination?: string
  effectiveDate?: string
  justification?: string
  lockDays?: string
  reason?: string
}

const justificationMax = 500

// The window of a cancellation's effective date around today, and the length a lock may be asked for (the
// backend's limits; the unit's lock policy may allow less, which the event then shows as a blocker).
const effectiveWindowDays = 30
const lockDaysLimits = { max: 366, min: 1 }

const shiftDays = (days: number) => {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date
}

// Prepares a lifecycle event on an enrollment (EPIC 7): the reason from the event's catalog (a short
// justification only where the reason asks, never sensitive data), for a transfer the destination unit
// (another one where the person operates; a re-enrollment may stay in the same unit), for a cancellation
// its effective date (the cut the finance counts: up to 30 days before or after today, empty = the day it
// is confirmed) and for a lock how many days it is asked for. Preparing never
// changes the current enrollment nor holds a seat, and nothing is confirmed here: a transfer or a
// re-enrollment opens the destination preparation, where the class is chosen in the normal flow. One
// `intent` per content sent: sending the same again (no answer, a second click) gives the same event back,
// and a lost answer is recovered by it. The prepared event opens on its own page.
export const PrepareLifecycleEventModal = (props: PrepareLifecycleEventModalProps) => {
  const { enrollment, eventType, onChanged, onClose, operableUnits } = props

  const formId = useId()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { reasonLabel, typeLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const hasDestination = eventType === "TRANSFER" || eventType === "REENROLLMENT"
  const destinationUnits =
    eventType === "TRANSFER" ? operableUnits.filter((unit) => unit.id !== enrollment.unitId) : operableUnits
  const startsInOrigin = eventType === "REENROLLMENT" && destinationUnits.some((unit) => unit.id === enrollment.unitId)

  const [reasons, setReasons] = useState<Reasons | null>(null)
  const [reasonsToken, setReasonsToken] = useState(0)
  const [reasonCode, setReasonCode] = useState("")
  const [justification, setJustification] = useState("")
  const [destinationUnitId, setDestinationUnitId] = useState(startsInOrigin ? String(enrollment.unitId) : "")
  const [effectiveDate, setEffectiveDate] = useState<Date | null>(null)
  const [lockDays, setLockDays] = useState("")
  // The intent of the content last sent: the same content keeps it, other content gets a new one.
  const [attempt, setAttempt] = useState<{ content: string; intent: string } | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [failure, setFailure] = useState("")
  const [openEventId, setOpenEventId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const reasonItems = reasons && "items" in reasons ? reasons.items : []
  // A single reason (the re-enrollment's) is the one chosen.
  const chosenCode = reasonItems.length === 1 ? reasonItems[0].code : reasonCode
  const reason = reasonItems.find((item) => item.code === chosenCode)
  const asksJustification = Boolean(reason?.requiresJustification)
  const reasonOptions: SelectOption[] = reasonItems.map((item) => ({
    label: reasonLabel(eventType, item.code, reasonItems),
    value: item.code,
  }))
  const unitOptions: SelectOption[] = destinationUnits.map((unit) => ({ label: unit.name, value: String(unit.id) }))
  const noDestination = eventType === "TRANSFER" && destinationUnits.length === 0
  const isDirty = reasonCode !== "" || justification.trim() !== "" || effectiveDate !== null || lockDays !== ""
  const earliestEffective = shiftDays(-effectiveWindowDays)
  const latestEffective = shiftDays(effectiveWindowDays)

  useUnsavedChanges(isDirty && !isSaving)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const items = await listLifecycleReasons(eventType, { showLoading: false })
        if (!isStale) setReasons({ items })
      } catch {
        if (!isStale) setReasons({ error: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [eventType, reasonsToken])

  const opened = (event: LifecycleEvent) => {
    toast.success(t("lifecycle.prepare.done", { type: typeLabel(event.eventType) }))
    navigate(generatePath(paths.lifecycleEvent, { eventId: String(event.id) }))
  }

  // The prepared event already open on this enrollment, found in the list (never read from the message).
  const findOpenEvent = async () => {
    try {
      const page = await listLifecycleEvents(
        { size: 20, status: "PREPARED", studentId: enrollment.student.id },
        { showLoading: false },
      )
      setOpenEventId(page.items.find((item) => item.originEnrollmentId === enrollment.id)?.id ?? null)
    } catch {
      setOpenEventId(null)
    }
  }

  // No answer came: the event may have been prepared all the same, so it is looked for by the intent.
  const recover = async (intent: string) => {
    try {
      opened(await getLifecycleEventByIntent(intent, { showLoading: false }))
    } catch {
      setFailure(t("lifecycle.prepare.noAnswer"))
    }
  }

  const refuse = async (error: unknown, intent: string) => {
    const code = getErrorCode(error)
    const status = getErrorStatus(error)
    if (code === "LIFECYCLE_EVENT_OPEN") {
      setFailure(t("lifecycle.prepare.eventOpen"))
      await findOpenEvent()
    } else if (code === "LIFECYCLE_ORIGIN_NOT_ELIGIBLE") {
      toast.error(t("lifecycle.prepare.originNotEligible"))
      onChanged()
    } else if (code === "LIFECYCLE_REASON_INVALID" && asksJustification) {
      setErrors({ justification: t("lifecycle.prepare.justificationRequired") })
    } else if (code === "LIFECYCLE_REASON_INVALID") {
      // The reason is no longer in the catalog: it is read again.
      setErrors({ reason: t("lifecycle.prepare.reasonInvalid") })
      setReasonCode("")
      setReasonsToken((value) => value + 1)
    } else if (code === "LIFECYCLE_DESTINATION_INVALID") {
      setErrors({ destination: t("lifecycle.prepare.destinationInvalid") })
    } else if (code === "UNIT_INACTIVE") {
      setErrors({ destination: t("lifecycle.prepare.destinationInactive") })
    } else if (code === "ENROLLMENT_CONFLICT") {
      setErrors({ destination: t("lifecycle.prepare.destinationConflict") })
    } else if (code === "LIFECYCLE_INTENT_REUSED") {
      // The intent went with other content: the next try gets a new one.
      setAttempt(null)
      setFailure(t("lifecycle.prepare.tryAgain"))
    } else if (status === 404) {
      toast.error(t("lifecycle.prepare.originGone"))
      onChanged()
    } else if (status === 400 && eventType === "CANCELLATION" && effectiveDate) {
      // The window is the backend's term: a date it refuses is pointed out on the field.
      setErrors({ effectiveDate: t("lifecycle.prepare.effectiveDateInvalid", { days: effectiveWindowDays }) })
    } else if (status === 403) {
      setFailure(t("lifecycle.prepare.outOfReach"))
    } else if (status === undefined) {
      await recover(intent)
    } else {
      setFailure(toFailureMessage(t("lifecycle.prepare.failed"), error))
    }
  }

  const submit = async () => {
    const found: FieldErrors = {}
    const text = justification.trim()
    if (!chosenCode) found.reason = t("lifecycle.prepare.reasonRequired")
    if (asksJustification && !text) found.justification = t("lifecycle.prepare.justificationRequired")
    if (eventType === "TRANSFER" && !destinationUnitId) found.destination = t("lifecycle.prepare.destinationRequired")
    const days = Number(lockDays)
    if (eventType === "LOCK" && (!Number.isInteger(days) || days < lockDaysLimits.min || days > lockDaysLimits.max)) {
      found.lockDays = t("lifecycle.prepare.lockDaysInvalid", lockDaysLimits)
    }
    if (effectiveDate && (effectiveDate < earliestEffective || effectiveDate > latestEffective)) {
      found.effectiveDate = t("lifecycle.prepare.effectiveDateInvalid", { days: effectiveWindowDays })
    }
    setErrors(found)
    setFailure("")
    setOpenEventId(null)
    if (Object.keys(found).length > 0) return

    const request = {
      destinationUnitId: hasDestination && destinationUnitId ? Number(destinationUnitId) : undefined,
      effectiveDate: eventType === "CANCELLATION" && effectiveDate ? toIsoDate(effectiveDate) : undefined,
      eventType,
      justification: asksJustification ? text : undefined,
      lockDays: eventType === "LOCK" ? days : undefined,
      originEnrollmentId: enrollment.id,
      reasonCode: chosenCode,
    }
    const content = JSON.stringify(request)
    const intent = attempt?.content === content ? attempt.intent : crypto.randomUUID()
    setAttempt({ content, intent })

    setIsSaving(true)
    try {
      opened(await prepareLifecycleEvent({ ...request, intent }))
    } catch (error) {
      await refuse(error, intent)
    } finally {
      setIsSaving(false)
    }
  }

  const renderReasons = () => {
    if (reasons && "error" in reasons) {
      return (
        <Text as="p" color="danger" fontSize="sm" role="alert">
          {t("lifecycle.prepare.reasonsFailed")}{" "}
          <Button onClick={() => setReasonsToken((value) => value + 1)} size="small" variant="link">
            {t("common.tryAgain")}
          </Button>
        </Text>
      )
    }

    return (
      <Select
        error={errors.reason}
        isDisabled={!reasons}
        noOptionsMessage={t("common.noOptions")}
        onChange={(option) => {
          setReasonCode(option?.value ?? "")
          setErrors((value) => ({ ...value, justification: undefined, reason: undefined }))
        }}
        options={reasonOptions}
        placeholder={reasons ? t("lifecycle.prepare.reasonPlaceholder") : t("lifecycle.prepare.reasonsLoading")}
        title={t("lifecycle.prepare.reason")}
        value={reasonOptions.find((option) => option.value === chosenCode) ?? null}
        required
      />
    )
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
          <Button disabled={isSaving || !reasons || noDestination} form={formId} type="submit">
            {t("lifecycle.prepare.submit")}
          </Button>
        </>
      }
      onClose={onClose}
      size="lg"
      title={t(`lifecycle.prepare.titles.${eventType}`, { name: enrollment.student.name })}
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
            {t(`lifecycle.prepare.descriptions.${eventType}`)}
          </Text>
          <Text color="secondary" fontSize="sm">
            {t("lifecycle.prepare.nothingChanges")}
          </Text>

          {renderReasons()}

          {asksJustification && (
            <Textarea
              error={errors.justification}
              helperText={t("lifecycle.prepare.justificationHelper")}
              maxLength={justificationMax}
              onChange={(event) => {
                setJustification(event.target.value)
                if (event.target.value.trim()) setErrors((value) => ({ ...value, justification: undefined }))
              }}
              placeholder={t("lifecycle.prepare.justificationPlaceholder")}
              title={t("lifecycle.prepare.justification")}
              value={justification}
              required
            />
          )}

          {eventType === "CANCELLATION" && (
            <DateInput
              clearLabel={t("people.form.clearDate")}
              error={errors.effectiveDate}
              helperText={t("lifecycle.prepare.effectiveDateHelper", { days: effectiveWindowDays })}
              maxDate={latestEffective}
              minDate={earliestEffective}
              onChange={(value) => {
                setEffectiveDate(value)
                setErrors((current) => ({ ...current, effectiveDate: undefined }))
              }}
              placeholder={t("common.datePlaceholder")}
              title={t("lifecycle.prepare.effectiveDate")}
              value={effectiveDate}
            />
          )}

          {eventType === "LOCK" && (
            <Input
              error={errors.lockDays}
              helperText={t("lifecycle.prepare.lockDaysHelper")}
              inputMode="numeric"
              maxLength={3}
              onChange={(event) => {
                setLockDays(stripNonDigits(event.target.value))
                setErrors((current) => ({ ...current, lockDays: undefined }))
              }}
              placeholder={t("lifecycle.prepare.lockDaysPlaceholder")}
              title={t("lifecycle.prepare.lockDays")}
              value={lockDays}
              required
            />
          )}

          {hasDestination && (
            <Select
              error={errors.destination}
              helperText={
                noDestination
                  ? t("lifecycle.prepare.noDestination")
                  : t(`lifecycle.prepare.destinationHelpers.${eventType}`)
              }
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => {
                setDestinationUnitId(option?.value ?? "")
                setErrors((value) => ({ ...value, destination: undefined }))
              }}
              options={unitOptions}
              placeholder={t("lifecycle.prepare.destinationPlaceholder")}
              required={eventType === "TRANSFER"}
              title={t("lifecycle.prepare.destination")}
              value={unitOptions.find((option) => option.value === destinationUnitId) ?? null}
            />
          )}

          {failure && (
            <Text as="p" color="danger" fontSize="sm" role="alert">
              {failure}
            </Text>
          )}
          {openEventId !== null && (
            <span>
              <Button
                onClick={() => navigate(generatePath(paths.lifecycleEvent, { eventId: String(openEventId) }))}
                size="small"
                variant="outlined"
              >
                {t("lifecycle.openEvent")}
              </Button>
            </span>
          )}
        </FormFields>
      </form>
    </Modal>
  )
}
