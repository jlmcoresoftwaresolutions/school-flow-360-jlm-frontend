import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate, useParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, TabsItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { GuardianProfile as GuardianProfileData } from "@/models"
import { paths } from "@/routes/paths"
import { getGuardianProfile } from "@/services/guardians"
import { getErrorStatus } from "@/services/httpClient"

import { PersonDocuments } from "../shared/people/documents/PersonDocuments"
import { PersonHistory } from "../shared/people/history/PersonHistory"
import { ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { usePersonPrivacy } from "../shared/people/privacy/usePersonPrivacy"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { GuardianData } from "./GuardianData"
import { type GuardianStateAction, GuardianStateDialog } from "./GuardianStateDialog"
import { GuardianStudents } from "./GuardianStudents"

type ProfileResult = { error: "failed" | "gone"; key: string } | { key: string; profile: GuardianProfileData }

// A guardian's detail (P03-S07): the header with the status, the units and the actions the status allows
// (edit, activate a draft, inactivate, reactivate), and the sections the backend lets the operator open
// (`sections`), each in its own tab - the data, the students it is linked to (only the ones in the
// operator's reach), its documents and its history. A guardian's access comes only from an invitation, never from here. Everything is
// read again after a change.
export const GuardianProfile = () => {
  const { guardianId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const documentTypes = useDocumentTypes()
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const [result, setResult] = useState<ProfileResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState("data")
  const [dialog, setDialog] = useState<GuardianStateAction | null>(null)

  const requestKey = `${guardianId}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const profile = await getGuardianProfile(Number(guardianId))
        if (!isStale) setResult({ key: requestKey, profile })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [guardianId, requestKey])

  const reload = () => {
    setDialog(null)
    setReloadToken((current) => current + 1)
  }

  // Another guardian's answer is never shown while this one is read.
  const current = result?.key.startsWith(`${guardianId}#`) ? result : null
  const profile = current && "profile" in current ? current.profile : null
  const privacy = usePersonPrivacy(
    profile
      ? { name: profile.guardian.fullName, personId: profile.guardian.id, status: profile.guardian.status }
      : null,
    reload,
  )

  if (!current || !profile) {
    return (
      <>
        <PageHeader icon="users-outline" title={t("guardians.profile.title")} />
        {current && "error" in current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {current.error === "gone" ? (
              <StateMessage
                action={<Button onClick={() => navigate(paths.guardians)}>{t("guardians.profile.backToList")}</Button>}
                description={t("guardians.profile.goneDescription")}
                icon="users-outline"
                title={t("guardians.profile.goneTitle")}
              />
            ) : (
              <StateMessage
                action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
                description={t("guardians.profile.errorDescription")}
                title={t("guardians.profile.errorTitle")}
                variant="error"
              />
            )}
          </Card>
        )}
      </>
    )
  }

  const { guardian } = profile

  const actions: ActionMenuItem[] = [
    {
      icon: "pen-outline",
      key: "edit",
      label: t("guardians.profile.edit"),
      onClick: () => navigate(generatePath(paths.guardianEdit, { guardianId: String(guardian.id) })),
    },
  ]
  if (guardian.status === "DRAFT") {
    actions.push({
      icon: "check-circle-outline",
      key: "activate",
      label: t("guardians.state.activate.action"),
      onClick: () => setDialog("activate"),
    })
  }
  if (guardian.status === "ACTIVE") {
    actions.push({
      icon: "lock-outline",
      key: "inactivate",
      label: t("guardians.state.inactivate.action"),
      onClick: () => setDialog("inactivate"),
      tone: "danger",
    })
  }
  if (guardian.status === "INACTIVE") {
    actions.push({
      icon: "unlock-outline",
      key: "reactivate",
      label: t("guardians.state.reactivate.action"),
      onClick: () => setDialog("reactivate"),
    })
  }

  actions.push(...privacy.items)

  const tabs: TabsItem[] = []
  if (profile.sections.includes("IDENTITY")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <GuardianData documentTypes={documentTypes} guardian={guardian} />
        </Card>
      ),
      icon: "info-outline",
      key: "data",
      label: t("guardians.profile.tabs.data"),
    })
  }
  if (profile.sections.includes("STUDENTS")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <GuardianStudents links={profile.students} />
        </Card>
      ),
      icon: "school-outline",
      key: "students",
      label: t("guardians.profile.tabs.students"),
    })
  }
  if (profile.sections.includes("DOCUMENTS")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <PersonDocuments documentTypes={documentTypes} personId={guardian.id} />
        </Card>
      ),
      icon: "file-outline",
      key: "documents",
      label: t("personDocuments.tab"),
    })
  }
  if (profile.sections.includes("HISTORY")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <PersonHistory kind="guardian" personId={guardian.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "history",
      key: "history",
      label: t("personHistory.tab"),
    })
  }

  return (
    <>
      <PageHeader
        description={t("guardians.profile.description")}
        icon="users-outline"
        title={guardian.socialName || guardian.fullName}
      />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={personStatusTone(guardian.status)}>{personStatusLabel(guardian.status)}</Badge>
          <Text color="secondary" fontSize="sm">
            {guardian.units.map((unit) => unit.name).join(", ")}
          </Text>
        </ProfileBarInfo>
        <ActionMenu items={actions} triggerLabel={t("guardians.profile.actions")} />
      </ProfileBar>

      <Tabs
        items={tabs}
        label={t("guardians.profile.sectionsLabel")}
        onChange={setTab}
        value={tabs.some((item) => item.key === tab) ? tab : (tabs[0]?.key ?? "")}
        attached
      />

      {dialog && (
        <GuardianStateDialog
          action={dialog}
          guardian={guardian}
          onChanged={reload}
          onClose={() => setDialog(null)}
          onGone={reload}
        />
      )}

      {privacy.dialog}
    </>
  )
}
