import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, TabsItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { Enrollment } from "@/models"
import { paths } from "@/routes/paths"
import { getEnrollment } from "@/services/enrollments"
import { getErrorStatus } from "@/services/httpClient"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { AbandonEnrollmentDialog } from "./AbandonEnrollmentDialog"
import { EnrollmentClass } from "./EnrollmentClass"
import { EnrollmentGuardians } from "./EnrollmentGuardians"
import { EnrollmentHistory } from "./EnrollmentHistory"
import { EnrollmentPreparation } from "./EnrollmentPreparation"

type LoadResult = { error: "failed" | "gone"; key: string } | { enrollment: Enrollment; key: string }

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

  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState("preparation")
  const [isAbandoning, setIsAbandoning] = useState(false)

  const requestKey = `${enrollmentId}#${reloadToken}`
  // While the same enrollment is read again its last answer stays on screen, so a choice being made in a
  // tab isn't lost; another enrollment's answer is never shown.
  const current = result?.key.startsWith(`${enrollmentId}#`) ? result : null

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

  const tabs: TabsItem[] = [
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentPreparation enrollment={enrollment} />
        </Card>
      ),
      icon: "check-circle-outline",
      key: "preparation",
      label: t("enrollments.profile.tabs.preparation"),
    },
    {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <EnrollmentGuardians enrollment={enrollment} onChanged={reload} onGone={reload} />
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
          <Text color="secondary" fontSize="sm">
            {[enrollment.student.code, enrollment.unitName].filter(Boolean).join(" · ")}
          </Text>
          <Text color="secondary" fontSize="sm">
            {t("enrollments.profile.savedAt", { moment: formatMoment(enrollment.updatedAt) })}
          </Text>
        </ProfileBarInfo>
        {actions.length > 0 && <ActionMenu items={actions} triggerLabel={t("enrollments.profile.actions")} />}
      </ProfileBar>

      <Tabs
        items={tabs}
        label={t("enrollments.profile.sectionsLabel")}
        onChange={setTab}
        value={tabs.some((item) => item.key === tab) ? tab : tabs[0].key}
        attached
      />

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
