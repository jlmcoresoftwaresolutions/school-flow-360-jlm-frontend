import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Text } from "@/ds-components/atoms"
import { DescriptionList, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicShiftCode, Enrollment, EnrollmentClassContext } from "@/models"
import { listEnrollmentClasses, saveEnrollmentContext } from "@/services/enrollments"
import { getErrorCode, getErrorStatus } from "@/services/httpClient"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { CandidateHeader, PersonSections } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { AccessItem, AccessItems } from "../shared/userAccess/userAccess.styles"
import { EnrollmentStartDate } from "./EnrollmentStartDate"

export type EnrollmentClassProps = {
  enrollment: Enrollment
  // The enrollment was changed: read it again.
  onChanged: () => void
  onGone: () => void
}

type LoadResult = { classes: EnrollmentClassContext[]; key: string } | { error: true; key: string }

// A change of the class waiting for confirmation: another class, or none (the choice taken back).
type PendingChange = { classContext: EnrollmentClassContext } | { classContext: null } | null

const shifts: AcademicShiftCode[] = ["INTEGRAL", "MANHA", "NOITE", "TARDE"]
const isShift = (value: string | null): value is AcademicShiftCode =>
  value !== null && (shifts as string[]).includes(value)

// The class of the enrollment (JLM-348): the one chosen, with its limit, the occupation read now (and
// when) and the free seats, and the classes of the enrollment's unit open for enrollment to choose from,
// right below the chosen one (asked by Lucas on 25/11/2026), before the start date.
// Seats are information, never a reservation: the class may fill up until the confirmation. An occupation
// that couldn't be read is "unavailable", never zero. Changing or taking back the class is confirmed
// first, since the stages that depend on it will be reviewed. The server checks the class again on every
// change (another unit, missing or no longer open: ENROLLMENT_CONTEXT_INVALID).
export const EnrollmentClass = (props: EnrollmentClassProps) => {
  const { enrollment, onChanged, onGone } = props

  const { t } = useTranslation()
  const { formatMoment, shiftLabel } = useAcademicLabels()
  const { pendencyLabel } = useEnrollmentLabels()
  const toFailureMessage = useFailureMessage()

  const [isChoosing, setIsChoosing] = useState(false)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [pending, setPending] = useState<PendingChange>(null)
  const [failure, setFailure] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const chosen = enrollment.classContext
  const canChoose = enrollment.eligibleActions.includes("CHOOSE_CONTEXT")
  const requestKey = `${enrollment.id}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  // Without a class chosen, the classes to choose from show at once (no need to ask for the list).
  const showOptions = isChoosing || (!chosen && canChoose)
  const classes = current && "classes" in current ? current.classes : null
  // The unit has no class open for enrollment: asking to choose one would only confuse (Lucas, 25/11/2026).
  const noClassToChoose = !chosen && classes !== null && classes.length === 0
  const contextPendencies = enrollment.pendencies.filter(
    (pendency) => pendency.category === "ACADEMIC_CONTEXT" && !(noClassToChoose && pendency.code === "NO_CLASS"),
  )

  useEffect(() => {
    if (!showOptions) return

    let isStale = false

    const load = async () => {
      try {
        const classes = await listEnrollmentClasses(enrollment.id, { showLoading: false })
        if (!isStale) setResult({ classes, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollment.id, requestKey, showOptions])

  const occupationText = (context: EnrollmentClassContext) => {
    if (context.occupation.status !== "AVAILABLE" || context.occupation.value === null) {
      return t("enrollments.class.occupationUnavailable")
    }
    if (!context.occupation.asOf) return String(context.occupation.value)
    return t("enrollments.class.occupationAsOf", {
      count: context.occupation.value,
      moment: formatMoment(context.occupation.asOf),
    })
  }

  const seatsText = (context: EnrollmentClassContext) => {
    if (context.seats === null) return t("enrollments.class.seatsUnavailable")
    if (context.seats === 0) return t("enrollments.class.noSeat")
    return t("enrollments.class.seats", { count: context.seats })
  }

  const describe = (context: EnrollmentClassContext) =>
    [
      isShift(context.shift) ? shiftLabel(context.shift) : context.shift,
      t("enrollments.class.capacity", { count: context.capacity }),
    ]
      .filter(Boolean)
      .join(" · ")

  const save = async (change: NonNullable<PendingChange>) => {
    setFailure("")
    setIsSaving(true)
    try {
      await saveEnrollmentContext(enrollment.id, {
        classId: change.classContext?.classId ?? null,
        version: enrollment.version,
      })
      toast.success(change.classContext ? t("enrollments.class.chosen") : t("enrollments.class.cleared"))
      setPending(null)
      setIsChoosing(false)
      onChanged()
    } catch (error) {
      setPending(null)
      const code = getErrorCode(error)
      if (getErrorStatus(error) === 404) {
        onGone()
      } else if (code === "VERSION_CONFLICT") {
        setFailure(t("enrollments.class.conflict"))
        onChanged()
      } else if (code === "ENROLLMENT_PERIOD_CONFLICT") {
        // The student already has a live enrollment in the class's period and stage (here or in another unit).
        setFailure(t("enrollments.class.periodConflict"))
      } else if (code === "ENROLLMENT_CONTEXT_INVALID") {
        setFailure(t("enrollments.class.invalid"))
        setReloadToken((value) => value + 1)
      } else if (code === "ENROLLMENT_NOT_IN_PREPARATION") {
        toast.error(t("enrollments.notInPreparation"))
        setIsChoosing(false)
        onChanged()
      } else {
        setFailure(toFailureMessage(t("enrollments.class.failed"), error))
      }
    } finally {
      setIsSaving(false)
    }
  }

  // The first class is chosen at once; changing or taking back one asks first.
  const choose = (context: EnrollmentClassContext) => {
    if (chosen) setPending({ classContext: context })
    else void save({ classContext: context })
  }

  const renderChosen = () => {
    if (!chosen) {
      if (noClassToChoose) return null
      return (
        <Text color="secondary" fontSize="sm">
          {canChoose ? t("enrollments.class.selectPrompt") : t("enrollments.preparation.noClass")}
        </Text>
      )
    }

    return (
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "class", label: t("enrollments.class.class"), value: `${chosen.code} · ${chosen.name}` },
          { key: "details", label: t("enrollments.class.details"), value: describe(chosen) },
          { key: "occupation", label: t("enrollments.class.occupation"), value: occupationText(chosen) },
          { key: "seats", label: t("enrollments.class.freeSeats"), value: seatsText(chosen) },
          {
            key: "open",
            label: t("enrollments.class.openForEnrollment"),
            value: chosen.eligible ? t("enrollments.class.open") : t("enrollments.class.notOpen"),
          },
        ]}
      />
    )
  }

  const renderOptions = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
              {t("common.tryAgain")}
            </Button>
          }
          description={t("enrollments.class.errorDescription")}
          title={t("enrollments.class.errorTitle")}
          variant="error"
        />
      )
    }
    if (!current) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("enrollments.class.loading")}
        </Text>
      )
    }
    if (current.classes.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("enrollments.class.empty")}
        </Text>
      )
    }

    return (
      <AccessItems aria-label={t("enrollments.class.optionsLabel")}>
        {current.classes.map((context) => {
          const isChosen = context.classId === chosen?.classId
          return (
            <AccessItem key={context.classId}>
              <CandidateHeader>
                <Text fontSize="sm" semibold>
                  {`${context.code} · ${context.name}`}
                </Text>
                {isChosen && <Badge tone="info">{t("enrollments.class.current")}</Badge>}
                {context.seats === 0 && <Badge tone="warning">{t("enrollments.class.noSeat")}</Badge>}
              </CandidateHeader>
              <Text color="secondary" fontSize="sm">
                {describe(context)}
              </Text>
              <Text color="secondary" fontSize="sm">
                {`${occupationText(context)} · ${seatsText(context)}`}
              </Text>
              {!isChosen && (
                <span>
                  <Button
                    aria-label={t("enrollments.class.chooseNamed", { name: context.code })}
                    disabled={isSaving}
                    onClick={() => choose(context)}
                    size="small"
                    variant="outlined"
                  >
                    {t("enrollments.create.choose")}
                  </Button>
                </span>
              )}
            </AccessItem>
          )
        })}
      </AccessItems>
    )
  }

  const renderActions = () => {
    // Without a class chosen the list is always open.
    if (!canChoose || !chosen) return null
    if (isChoosing) {
      return (
        <Button onClick={() => setIsChoosing(false)} size="small" variant="outlined">
          {t("enrollments.class.closeOptions")}
        </Button>
      )
    }

    return (
      <span style={{ display: "flex", gap: spacing[8] }}>
        <Button onClick={() => setPending({ classContext: null })} size="small" variant="outlined">
          {t("enrollments.class.clear")}
        </Button>
        <Button onClick={() => setIsChoosing(true)} size="small">
          {t("enrollments.class.change")}
        </Button>
      </span>
    )
  }

  return (
    <PersonSections>
      <PersonBlock action={renderActions()} title={t("enrollments.class.title")}>
        <Text color="secondary" fontSize="sm">
          {t("enrollments.class.description")}
        </Text>

        {contextPendencies.length > 0 && (
          <AccessItems aria-label={t("enrollments.class.pendenciesLabel")}>
            {contextPendencies.map((pendency) => (
              <AccessItem key={pendency.code}>
                <Text color="warning" fontSize="sm" semibold>
                  {pendencyLabel(pendency.code)}
                </Text>
              </AccessItem>
            ))}
          </AccessItems>
        )}

        {renderChosen()}

        {failure && (
          <Text as="p" color="danger" fontSize="sm" role="alert">
            {failure}
          </Text>
        )}
      </PersonBlock>

      {showOptions && (
        <PersonBlock title={t("enrollments.class.optionsTitle")}>
          <Text color="secondary" fontSize="sm">
            {t("enrollments.class.optionsDescription")}
          </Text>
          {renderOptions()}
        </PersonBlock>
      )}

      <EnrollmentStartDate enrollment={enrollment} onChanged={onChanged} onGone={onGone} />

      {pending && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={pending.classContext ? t("enrollments.class.changeConfirm") : t("enrollments.class.clear")}
          description={t("enrollments.class.changeDescription")}
          loading={isSaving}
          onClose={() => setPending(null)}
          onConfirm={() => void save(pending)}
          title={
            pending.classContext
              ? t("enrollments.class.changeTitle", { name: pending.classContext.code })
              : t("enrollments.class.clearTitle")
          }
          open
        />
      )}
    </PersonSections>
  )
}
