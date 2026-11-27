import type { ReactNode } from "react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link, useNavigate, useParams } from "react-router-dom"

import { toast } from "@/components"
import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, DescriptionList, PageHeader, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { Enrollment, LifecycleConsequence, LifecycleEvent, LifecycleReason } from "@/models"
import { paths } from "@/routes/paths"
import { getEnrollment } from "@/services/enrollments"
import { getErrorStatus } from "@/services/httpClient"
import { getLifecycleEvent, listLifecycleReasons } from "@/services/lifecycleEvents"
import { hasAnyRole } from "@/utils/access"
import { formatDate } from "@/utils/dates"

import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PersonSections, ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { AccessItem, AccessItems } from "../shared/userAccess/userAccess.styles"
import { AbandonLifecycleEventDialog } from "./AbandonLifecycleEventDialog"
import { EventCapacity } from "./EventCapacity"
import { EventFollowUp } from "./EventFollowUp"
import { EventRectifications } from "./EventRectifications"
import { LifecycleCommandDialog } from "./LifecycleCommandDialog"
import { downloadLifecycleEvidence } from "./lifecycleEvidence"
import { RectifyDialog } from "./RectifyDialog"

type LoadResult = { error: "failed" | "gone"; key: string } | { event: LifecycleEvent; key: string }

type Dialog = "abandon" | "confirm" | "rectify" | "return" | null

// An enrollment of either end, read on its own: "unavailable" when it couldn't be read (out of reach of a
// reader of only the other end, or a failure); never taken as missing.
type End = { enrollment: Enrollment; key: string } | { key: string; unavailable: true }

// Reads one end of the event (the origin or the destination preparation), kept with the request it answers.
const useEventEnd = (enrollmentId: number | null, requestKey: string) => {
  const [result, setResult] = useState<End | null>(null)

  const key = `${enrollmentId}#${requestKey}`

  useEffect(() => {
    if (enrollmentId === null) return

    let isStale = false

    const load = async () => {
      try {
        const enrollment = await getEnrollment(enrollmentId, { showLoading: false })
        if (!isStale) setResult({ enrollment, key })
      } catch {
        if (!isStale) setResult({ key, unavailable: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId, key])

  return result?.key === key ? result : null
}

// A lifecycle event of an enrollment (EPIC 7): what was prepared (the type, the reason, the justification,
// a cancellation's effective date or a lock's days), the current enrollment and, for a transfer or a
// re-enrollment, the destination preparation, where the class is chosen in the normal flow. A prepared
// event lists what still stops its confirmation, by code, read now, and is confirmed from the top once
// nothing does (`eligibleActions`; a lock and an institutional cancellation only by the Admin), or given up
// with a reason. A confirmed lock is returned by the Coordenação of the unit or the Admin. After the
// confirmation the page shows the diary projection and the notifications (sent again by the Secretaria or
// the Admin, reprocessed by the Admin); the Admin also corrects the reason or the justification, as a new
// fact, and exports the evidence. An event outside the person's units answers like one that doesn't exist.
export const LifecycleEventProfile = () => {
  const { eventId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const signedIn = useSignedInUser()
  const { units } = useAcademicUnits()
  const {
    formatMoment,
    kindLabel,
    statusLabel: enrollmentStatusLabel,
    statusTone: enrollmentStatusTone,
  } = useEnrollmentLabels()
  const {
    blockerLabel,
    consequenceStatusLabel,
    consequenceStatusTone,
    consumerLabel,
    reasonLabel,
    statusLabel,
    statusTone,
    typeLabel,
  } = useLifecycleLabels()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reasons, setReasons] = useState<LifecycleReason[]>([])
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isExporting, setIsExporting] = useState(false)

  const requestKey = `${eventId}#${reloadToken}`
  // While the same event is read again its last answer stays on screen; another event's never shows.
  const current = result?.key.startsWith(`${eventId}#`) ? result : null
  const event = current && "event" in current ? current.event : null
  const eventType = event?.eventType

  const origin = useEventEnd(event?.originEnrollmentId ?? null, requestKey)
  const destination = useEventEnd(event?.destinationEnrollmentId ?? null, requestKey)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await getLifecycleEvent(Number(eventId))
        if (!isStale) setResult({ event: loaded, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [eventId, requestKey])

  // The catalog's own labels, for a reason the screen doesn't know.
  useEffect(() => {
    if (!eventType) return

    let isStale = false

    const load = async () => {
      try {
        const items = await listLifecycleReasons(eventType, { showLoading: false })
        if (!isStale) setReasons(items)
      } catch {
        if (!isStale) setReasons([])
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [eventType])

  const reload = () => {
    setDialog(null)
    setReloadToken((value) => value + 1)
  }

  const exportEvidence = async () => {
    if (!event) return
    setIsExporting(true)
    try {
      await downloadLifecycleEvidence(event.id)
      toast.success(t("lifecycle.evidence.done"))
    } catch {
      toast.error(t("lifecycle.evidence.failed"))
    } finally {
      setIsExporting(false)
    }
  }

  if (!event) {
    return (
      <>
        <PageHeader icon="file-outline" title={t("lifecycle.profile.title")} />
        {current && "error" in current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {current.error === "gone" ? (
              <StateMessage
                action={
                  <Button onClick={() => navigate(paths.enrollments)}>{t("lifecycle.profile.backToList")}</Button>
                }
                description={t("lifecycle.profile.goneDescription")}
                icon="file-outline"
                title={t("lifecycle.profile.goneTitle")}
              />
            ) : (
              <StateMessage
                action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
                description={t("lifecycle.profile.errorDescription")}
                title={t("lifecycle.profile.errorTitle")}
                variant="error"
              />
            )}
          </Card>
        )}
      </>
    )
  }

  const originEnrollment = origin && "enrollment" in origin ? origin.enrollment : null
  const destinationEnrollment = destination && "enrollment" in destination ? destination.enrollment : null
  const unitName = (unitId: number | null) =>
    unitId === null ? "" : (units.find((unit) => unit.id === unitId)?.name ?? "")
  const isPrepared = event.status === "PREPARED"
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  // A lock, and a cancellation by institutional decision, are confirmed only by the Admin.
  const needsAdmin =
    event.eventType === "LOCK" || (event.eventType === "CANCELLATION" && event.reasonCode === "INSTITUTIONAL_DECISION")
  const offersConfirm = event.eligibleActions.includes("CONFIRM")
  const canConfirm = offersConfirm && (!needsAdmin || isAdmin)
  const isBlocked = event.blockers.length > 0

  const actions: ActionMenuItem[] = []
  if (event.eligibleActions.includes("ABANDON")) {
    actions.push({
      icon: "x-circle-outline",
      key: "abandon",
      label: t("lifecycle.abandon.action"),
      onClick: () => setDialog("abandon"),
      tone: "danger",
    })
  }
  if (isAdmin && event.status !== "ABANDONED") {
    actions.push({
      icon: "pen-outline",
      key: "rectify",
      label: t("lifecycle.rectify.action"),
      onClick: () => setDialog("rectify"),
    })
  }
  if (isAdmin) {
    actions.push({
      disabled: isExporting,
      icon: "download-outline",
      key: "evidence",
      label: t("lifecycle.evidence.action"),
      onClick: () => void exportEvidence(),
    })
  }

  const enrollmentLink = (enrollment: Enrollment, label: string) => (
    <Button
      as={Link}
      size="small"
      to={generatePath(paths.enrollmentProfile, { enrollmentId: String(enrollment.id) })}
      variant="outlined"
    >
      {label}
    </Button>
  )

  const renderEnd = (end: End | null, render: (enrollment: Enrollment) => ReactNode) => {
    if (!end) {
      return (
        <Text color="secondary" fontSize="sm" role="status">
          {t("lifecycle.profile.reading")}
        </Text>
      )
    }
    if ("unavailable" in end) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("lifecycle.profile.endUnavailable")}
        </Text>
      )
    }
    return render(end.enrollment)
  }

  const renderConfirmation = () => {
    if (event.status === "ABANDONED") {
      return (
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "abandonedAt",
              label: t("lifecycle.profile.abandonedAt"),
              value: event.abandonedAt ? formatMoment(event.abandonedAt) : "",
            },
            { key: "abandonReason", label: t("lifecycle.profile.abandonReason"), value: event.abandonReason ?? "" },
          ]}
        />
      )
    }
    if (!isPrepared) {
      return (
        <DescriptionList
          emptyValue={t("common.notInformed")}
          items={[
            {
              key: "confirmedAt",
              label: t("lifecycle.profile.confirmedAtLabel"),
              value: event.confirmedAt ? formatMoment(event.confirmedAt) : "",
            },
            ...(event.eventType === "CANCELLATION"
              ? [
                  {
                    key: "effectiveDate",
                    label: t("lifecycle.profile.effectiveDate"),
                    value: event.effectiveDate ? formatDate(event.effectiveDate) : "",
                  },
                ]
              : []),
            ...(event.destinationEnrollmentId !== null
              ? [
                  {
                    key: "destinationStartDate",
                    label: t("lifecycle.profile.destinationStartDate"),
                    value: event.destinationStartDate ? formatDate(event.destinationStartDate) : "",
                  },
                ]
              : []),
            ...(event.eventType === "LOCK"
              ? [
                  {
                    key: "returnedAt",
                    label: t("lifecycle.profile.returnedAt"),
                    value: event.returnedAt ? formatMoment(event.returnedAt) : t("lifecycle.profile.notReturned"),
                  },
                ]
              : []),
          ]}
        />
      )
    }

    let readiness = t("lifecycle.profile.ready")
    if (isBlocked) readiness = t("lifecycle.profile.notAvailable")
    else if (needsAdmin && !isAdmin) readiness = t("lifecycle.profile.adminConfirms")

    return (
      <>
        <Text color="secondary" fontSize="sm">
          {readiness}
        </Text>
        {event.blockers.length > 0 && (
          <AccessItems aria-label={t("lifecycle.profile.blockersLabel")}>
            {event.blockers.map((blocker) => (
              <AccessItem key={blocker.code}>
                <Text fontSize="sm">{blockerLabel(blocker.code)}</Text>
              </AccessItem>
            ))}
          </AccessItems>
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        description={t(`lifecycle.profile.descriptions.${event.eventType}`)}
        icon="file-outline"
        title={
          originEnrollment
            ? t("lifecycle.profile.titleNamed", {
                name: originEnrollment.student.name,
                type: typeLabel(event.eventType),
              })
            : typeLabel(event.eventType)
        }
      />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={statusTone(event.status)}>{statusLabel(event.status)}</Badge>
          <Text color="secondary" fontSize="sm">
            {t("lifecycle.profile.preparedAt", { moment: formatMoment(event.preparedAt) })}
          </Text>
        </ProfileBarInfo>
        <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
          {canConfirm && (
            <Button disabled={isBlocked} onClick={() => setDialog("confirm")}>
              {t("lifecycle.confirm.open", { type: typeLabel(event.eventType) })}
            </Button>
          )}
          {event.eligibleActions.includes("RETURN") && (
            <Button onClick={() => setDialog("return")}>{t("lifecycle.return.open")}</Button>
          )}
          {actions.length > 0 && <ActionMenu items={actions} triggerLabel={t("lifecycle.profile.actions")} />}
        </span>
      </ProfileBar>

      <Card elevated style={{ padding: spacing[32] }}>
        <PersonSections>
          <PersonBlock title={t("lifecycle.profile.confirmationTitle")}>{renderConfirmation()}</PersonBlock>

          <EventCapacity event={event} onChanged={reload} refreshKey={requestKey} />

          <EventFollowUp event={event} onChanged={reload} refreshKey={requestKey} />

          <EventRectifications event={event} reasons={reasons} refreshKey={requestKey} />

          <PersonBlock title={t("lifecycle.profile.eventTitle")}>
            <DescriptionList
              emptyValue={t("common.notInformed")}
              items={[
                { key: "type", label: t("lifecycle.profile.type"), value: typeLabel(event.eventType) },
                {
                  key: "reason",
                  label: t("lifecycle.profile.reason"),
                  value: reasonLabel(event.eventType, event.reasonCode, reasons),
                },
                ...(event.justification
                  ? [{ key: "justification", label: t("lifecycle.profile.justification"), value: event.justification }]
                  : []),
                ...(event.eventType === "CANCELLATION"
                  ? [
                      {
                        key: "effectiveDateAsked",
                        label: t("lifecycle.profile.effectiveDate"),
                        value: event.effectiveDate
                          ? formatDate(event.effectiveDate)
                          : t("lifecycle.profile.effectiveOnConfirmation"),
                      },
                    ]
                  : []),
                ...(event.eventType === "LOCK" && event.lockDays !== null
                  ? [
                      {
                        key: "lockDays",
                        label: t("lifecycle.profile.lockDays"),
                        value: t("lifecycle.profile.days", { count: event.lockDays }),
                      },
                    ]
                  : []),
                {
                  key: "preparedAt",
                  label: t("lifecycle.profile.preparedAtLabel"),
                  value: formatMoment(event.preparedAt),
                },
              ]}
            />
          </PersonBlock>

          <PersonBlock
            action={originEnrollment && enrollmentLink(originEnrollment, t("lifecycle.profile.openOrigin"))}
            title={t("lifecycle.profile.originTitle")}
          >
            {renderEnd(origin, (enrollment) => (
              <DescriptionList
                emptyValue={t("common.notInformed")}
                items={[
                  { key: "student", label: t("lifecycle.profile.student"), value: enrollment.student.name },
                  {
                    key: "number",
                    label: t("lifecycle.profile.number"),
                    value: enrollment.enrollmentNumber ?? "",
                  },
                  { key: "unit", label: t("enrollments.unit"), value: enrollment.unitName ?? "" },
                  {
                    key: "class",
                    label: t("enrollments.class.class"),
                    value: enrollment.classContext
                      ? `${enrollment.classContext.code} · ${enrollment.classContext.name}`
                      : "",
                  },
                  {
                    key: "status",
                    label: t("lifecycle.profile.enrollmentStatus"),
                    value: (
                      <Badge tone={enrollmentStatusTone(enrollment.status)}>
                        {enrollmentStatusLabel(enrollment.status)}
                      </Badge>
                    ),
                  },
                ]}
              />
            ))}
            {isPrepared && (
              <Text color="secondary" fontSize="sm">
                {t("lifecycle.profile.originUnchanged")}
              </Text>
            )}
          </PersonBlock>

          {event.destinationEnrollmentId !== null && (
            <PersonBlock
              action={
                destinationEnrollment && enrollmentLink(destinationEnrollment, t("lifecycle.profile.openDestination"))
              }
              title={t("lifecycle.profile.destinationTitle")}
            >
              {renderEnd(destination, (enrollment) => (
                <DescriptionList
                  emptyValue={t("common.notInformed")}
                  items={[
                    {
                      key: "unit",
                      label: t("enrollments.unit"),
                      value: enrollment.unitName ?? unitName(event.destinationUnitId),
                    },
                    { key: "kind", label: t("enrollments.kind"), value: kindLabel(enrollment.kind) },
                    {
                      key: "class",
                      label: t("enrollments.class.class"),
                      value: enrollment.classContext
                        ? `${enrollment.classContext.code} · ${enrollment.classContext.name}`
                        : t("lifecycle.profile.noClass"),
                    },
                    {
                      key: "status",
                      label: t("lifecycle.profile.enrollmentStatus"),
                      value: (
                        <Badge tone={enrollmentStatusTone(enrollment.status)}>
                          {enrollmentStatusLabel(enrollment.status)}
                        </Badge>
                      ),
                    },
                  ]}
                />
              ))}
              {isPrepared && (
                <Text color="secondary" fontSize="sm">
                  {t("lifecycle.profile.destinationHelp")}
                </Text>
              )}
            </PersonBlock>
          )}

          <PersonBlock title={t("lifecycle.profile.consequencesTitle")}>
            <Text color="secondary" fontSize="sm">
              {t("lifecycle.profile.consequencesDescription")}
            </Text>
            <Table dataKey="consumer" emptyMessage={t("lifecycle.profile.noConsequences")} value={event.consequences}>
              <Table.Column
                body={(item: LifecycleConsequence) => consumerLabel(item.consumer)}
                field="consumer"
                header={t("lifecycle.profile.consumer")}
              />
              <Table.Column
                body={(item: LifecycleConsequence) =>
                  item.mandatory ? t("lifecycle.profile.beforeSuccess") : t("lifecycle.profile.afterSuccess")
                }
                field="mandatory"
                header={t("lifecycle.profile.when")}
              />
              <Table.Column
                body={(item: LifecycleConsequence) => (
                  <Badge tone={consequenceStatusTone(item.status)}>{consequenceStatusLabel(item.status)}</Badge>
                )}
                field="status"
                header={t("lifecycle.profile.consequenceStatus")}
              />
            </Table>
          </PersonBlock>
        </PersonSections>
      </Card>

      {dialog === "abandon" && (
        <AbandonLifecycleEventDialog event={event} onChanged={reload} onClose={() => setDialog(null)} onGone={reload} />
      )}
      {(dialog === "confirm" || dialog === "return") && (
        <LifecycleCommandDialog
          action={dialog}
          destination={destinationEnrollment}
          event={event}
          onChanged={reload}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "rectify" && (
        <RectifyDialog event={event} onChanged={reload} onClose={() => setDialog(null)} reasons={reasons} />
      )}
    </>
  )
}
