import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import type { IconName } from "@/ds-components/atoms"
import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, TabsItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { Enrollment, LifecycleEventType } from "@/models"
import { paths } from "@/routes/paths"
import { getEnrollment } from "@/services/enrollments"
import { getErrorStatus } from "@/services/httpClient"
import { hasAnyRole } from "@/utils/access"
import { formatDate } from "@/utils/dates"

import { useEnrollmentAccess } from "../shared/enrollments/useEnrollmentAccess"
import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { lifecycleEventTypes } from "../shared/enrollments/useLifecycleLabels"
import { ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { AbandonEnrollmentDialog } from "./AbandonEnrollmentDialog"
import { ConfirmEnrollmentDialog } from "./ConfirmEnrollmentDialog"
import { EnrollmentContract } from "./contract/EnrollmentContract"
import { EnrollmentDocuments } from "./documents/EnrollmentDocuments"
import { EnrollmentClass } from "./EnrollmentClass"
import { EnrollmentGuardians } from "./EnrollmentGuardians"
import { EnrollmentHistory } from "./EnrollmentHistory"
import { EnrollmentPreparation } from "./EnrollmentPreparation"
import { LifecycleEventNotice } from "./lifecycle/LifecycleEventNotice"
import { PrepareLifecycleEventModal } from "./lifecycle/PrepareLifecycleEventModal"
import { useOpenLifecycleEvent } from "./lifecycle/useOpenLifecycleEvent"

type LoadResult = { error: "failed" | "gone"; key: string } | { enrollment: Enrollment; key: string }

const lifecycleIcons: Record<LifecycleEventType, IconName> = {
  CANCELLATION: "x-circle-outline",
  LOCK: "lock-outline",
  REENROLLMENT: "event-note-outline",
  TRANSFER: "compare-outline",
}

// The enrollment statuses each lifecycle event starts from: a re-enrollment also from a completed one.
const isLifecycleOrigin = (type: LifecycleEventType, enrollment: Enrollment) =>
  enrollment.status === "ACTIVE" || (type === "REENROLLMENT" && enrollment.status === "COMPLETED")

// An enrollment (JLM-339, 375 and 381 in part): the student, the unit and the status in the header, and
// the sections in tabs - the preparation (what was chosen, what is still missing and the stages not
// evaluated yet), the guardians and their roles, the class with its seats, and the history. Every read comes from the backend, so resuming a preparation shows
// only what was saved; the actions are the ones the server allows (`eligibleActions`). An enrollment out
// of reach answers like one that doesn't exist. Another enrollment's answer is never shown while this
// one is read.
export const EnrollmentProfile = () => {
  const { enrollmentId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const { formatMoment, statusLabel, statusTone } = useEnrollmentLabels()
  const signedIn = useSignedInUser()
  const { operableUnits } = useEnrollmentAccess()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState("preparation")
  // Grows when the Preparation asks to choose the participants: the Responsáveis tab opens the choice.
  const [chooseRequest, setChooseRequest] = useState(0)
  const [isAbandoning, setIsAbandoning] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [preparing, setPreparing] = useState<LifecycleEventType | null>(null)

  const requestKey = `${enrollmentId}#${reloadToken}`
  // While the same enrollment is read again its last answer stays on screen, so a choice being made in a
  // tab isn't lost; another enrollment's answer is never shown.
  const current = result?.key.startsWith(`${enrollmentId}#`) ? result : null
  const openEvent = useOpenLifecycleEvent(current && "enrollment" in current ? current.enrollment : null, reloadToken)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const enrollment = await getEnrollment(Number(enrollmentId))
        if (!isStale) setResult({ enrollment, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId, requestKey])

  const reload = () => {
    setIsAbandoning(false)
    setIsConfirming(false)
    setPreparing(null)
    setReloadToken((value) => value + 1)
  }

  if (!current || "error" in current) {
    return (
      <>
        <PageHeader icon="file-outline" title={t("enrollments.profile.title")} />
        {current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {current.error === "gone" ? (
              <StateMessage
                action={
                  <Button onClick={() => navigate(paths.enrollments)}>{t("enrollments.profile.backToList")}</Button>
                }
                description={t("enrollments.profile.goneDescription")}
                icon="file-outline"
                title={t("enrollments.profile.goneTitle")}
              />
            ) : (
              <StateMessage
                action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
                description={t("enrollments.profile.errorDescription")}
                title={t("enrollments.profile.errorTitle")}
                variant="error"
              />
            )}
          </Card>
        )}
      </>
    )
  }

  const { enrollment } = current

  const actions: ActionMenuItem[] = []
  if (enrollment.eligibleActions.includes("ABANDON")) {
    actions.push({
      icon: "x-circle-outline",
      key: "abandon",
      label: t("enrollments.abandon.action"),
      onClick: () => setIsAbandoning(true),
      tone: "danger",
    })
  }

  // The lifecycle events (EPIC 7) start from a confirmed enrollment the person operates, once the events it
  // is part of were read and none is prepared on it (the backend checks everything again).
  const operatesUnit = operableUnits.some((unit) => unit.id === enrollment.unitId)
  if (operatesUnit && openEvent === null) {
    lifecycleEventTypes
      .filter((type) => isLifecycleOrigin(type, enrollment))
      .forEach((type) =>
        actions.push({
          icon: lifecycleIcons[type],
          key: type,
          label: t(`lifecycle.prepare.actions.${type}`),
          onClick: () => setPreparing(type),
          tone: type === "CANCELLATION" ? "danger" : "default",
        }),
      )
  }

  const canConfirm = enrollment.eligibleActions.includes("CONFIRM")

  const tabs: TabsItem[] = [
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentPreparation
            enrollment={enrollment}
            onChooseParticipants={() => {
              setChooseRequest((value) => value + 1)
              setTab("guardians")
            }}
          />
        </Card>
      ),
      icon: "check-circle-outline",
      key: "preparation",
      label: t("enrollments.profile.tabs.preparation"),
    },
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentGuardians
            chooseRequest={chooseRequest}
            enrollment={enrollment}
            onChanged={reload}
            onGone={reload}
          />
        </Card>
      ),
      icon: "users-outline",
      key: "guardians",
      label: t("enrollments.profile.tabs.guardians"),
    },
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentClass enrollment={enrollment} onChanged={reload} onGone={reload} />
        </Card>
      ),
      icon: "school-outline",
      key: "class",
      label: t("enrollments.profile.tabs.class"),
    },
    // The documents and the contract are the Admin's and the Secretaria's only (the Financeiro and the
    // Coordenação see the pendencies on the enrollment, not the files nor the contract).
    ...(hasAnyRole(signedIn, ["SECRETARIA"])
      ? [
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <EnrollmentDocuments enrollmentId={enrollment.id} onChanged={reload} refreshKey={reloadToken} />
              </Card>
            ),
            icon: "file-outline" as const,
            key: "documents",
            label: t("enrollments.profile.tabs.documents"),
          },
          {
            content: (
              <Card elevated style={{ padding: spacing[32] }}>
                <EnrollmentContract enrollment={enrollment} onChanged={reload} refreshKey={reloadToken} />
              </Card>
            ),
            icon: "contract-outline" as const,
            key: "contract",
            label: t("enrollments.profile.tabs.contract"),
          },
        ]
      : []),
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentHistory enrollmentId={enrollment.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "history",
      key: "history",
      label: t("enrollments.profile.tabs.history"),
    },
  ]

  return (
    <>
      <PageHeader
        description={t("enrollments.profile.description")}
        icon="file-outline"
        title={enrollment.student.name}
      />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={statusTone(enrollment.status)}>{statusLabel(enrollment.status)}</Badge>
          {enrollment.inactive && <Badge tone="neutral">{t("enrollments.profile.inactive")}</Badge>}
          {enrollment.enrollmentNumber && (
            <Text fontSize="sm" semibold>
              {t("enrollments.profile.number", { number: enrollment.enrollmentNumber })}
            </Text>
          )}
          <Text color="secondary" fontSize="sm">
            {[enrollment.student.code, enrollment.unitName].filter(Boolean).join(" · ")}
          </Text>
          {enrollment.startDate && (
            <Text color="secondary" fontSize="sm">
              {t("enrollments.profile.startsOn", { date: formatDate(enrollment.startDate) })}
            </Text>
          )}
          <Text color="secondary" fontSize="sm">
            {t("enrollments.profile.savedAt", { moment: formatMoment(enrollment.updatedAt) })}
          </Text>
        </ProfileBarInfo>
        <span style={{ alignItems: "center", display: "flex", gap: spacing[8] }}>
          {canConfirm && (
            <Button onClick={() => setIsConfirming(true)} size="small">
              {t("enrollments.confirm.action")}
            </Button>
          )}
          {actions.length > 0 && <ActionMenu items={actions} triggerLabel={t("enrollments.profile.actions")} />}
        </span>
      </ProfileBar>

      {openEvent && <LifecycleEventNotice open={openEvent} />}

      <Tabs
        items={tabs}
        label={t("enrollments.profile.sectionsLabel")}
        onChange={setTab}
        value={tabs.some((item) => item.key === tab) ? tab : tabs[0].key}
        attached
      />

      {isConfirming && (
        <ConfirmEnrollmentDialog
          enrollment={enrollment}
          onChanged={reload}
          onClose={() => setIsConfirming(false)}
          onGone={reload}
        />
      )}

      {preparing && (
        <PrepareLifecycleEventModal
          enrollment={enrollment}
          eventType={preparing}
          onChanged={reload}
          onClose={() => setPreparing(null)}
          operableUnits={operableUnits}
        />
      )}

      {isAbandoning && (
        <AbandonEnrollmentDialog
          enrollment={enrollment}
          onChanged={reload}
          onClose={() => setIsAbandoning(false)}
          onGone={reload}
        />
      )}
    </>
  )
}
