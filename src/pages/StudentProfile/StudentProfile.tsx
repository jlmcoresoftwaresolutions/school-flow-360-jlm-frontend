import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate, useParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { GuardianInvitation, Student360, StudentGuardianLink } from "@/models"
import { paths } from "@/routes/paths"
import { getErrorStatus } from "@/services/httpClient"
import { getStudentProfile } from "@/services/students"

import { PersonDocuments } from "../shared/people/documents/PersonDocuments"
import { PersonHistory } from "../shared/people/history/PersonHistory"
import { ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { isMinor } from "../shared/people/personAge"
import { AnonymizedBadge } from "../shared/people/privacy/AnonymizedBadge"
import { AnonymizedNotice } from "../shared/people/privacy/AnonymizedNotice"
import { usePersonPrivacy } from "../shared/people/privacy/usePersonPrivacy"
import { useDocumentTypes } from "../shared/people/useDocumentTypes"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { useRelationshipTypes } from "../shared/people/useRelationshipTypes"
import { TemporaryPasswordDialog } from "../shared/userAccess/TemporaryPasswordDialog"
import { EditLinkModal } from "./links/EditLinkModal"
import { EndLinkDialog } from "./links/EndLinkDialog"
import { type InvitationDecision, InvitationDecisionDialog } from "./links/InvitationDecisionDialog"
import { InviteGuardianModal } from "./links/InviteGuardianModal"
import { NewLinkModal } from "./links/NewLinkModal"
import { StudentData } from "./StudentData"
import { StudentGuardians } from "./StudentGuardians"
import { type StudentStateAction, StudentStateDialog } from "./StudentStateDialog"

type ProfileResult = { error: "failed" | "gone" } | { profile: Student360 } | null

type Dialog = StudentStateAction | "access" | null

// A dialog of the guardians tab: a new link or invitation, a change or the end of a link, or the
// school's decision on an accepted invitation.
type LinkDialog =
  | { decision: InvitationDecision; invitation: GuardianInvitation; kind: "decide" }
  | { guardianName: string; kind: "edit" | "end"; link: StudentGuardianLink }
  | { kind: "invite" | "new" }
  | null

// A student's 360 profile (P03-S04): the header with the status, the registration code and the actions
// the status allows, and the sections the backend lets the operator open (`sections`), each in its own
// tab - the data and the guardians with their links and invitations (where a guardian is linked or
// invited, a link changed or ended, and an accepted invitation confirmed or rejected), the documents and
// the history. A section that doesn't come isn't shown. The actions: edit the data, the status changes (activate, discard, inactivate, reactivate)
// and, for an active student, its access (a temporary password: the student signs in with the nickname,
// without an e-mail). Everything is read again after a change. An anonymized student (LGPD) only shows
// what is left, with a notice: nothing that would change it is offered (the backend would refuse it).
export const StudentProfile = () => {
  const { studentId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const documentTypes = useDocumentTypes()
  const relationshipTypes = useRelationshipTypes()
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const [result, setResult] = useState<ProfileResult>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState("data")
  const [dialog, setDialog] = useState<Dialog>(null)
  const [linkDialog, setLinkDialog] = useState<LinkDialog>(null)

  const requestKey = `${studentId}#${reloadToken}`
  const [loadedKey, setLoadedKey] = useState("")

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const profile = await getStudentProfile(Number(studentId))
        if (isStale) return
        setResult({ profile })
        setLoadedKey(requestKey)
      } catch (error) {
        if (isStale) return
        setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed" })
        setLoadedKey(requestKey)
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [requestKey, studentId])

  const reload = () => {
    setDialog(null)
    setLinkDialog(null)
    setReloadToken((current) => current + 1)
  }

  // Another student's answer is never shown while this one is read.
  const current = loadedKey.startsWith(`${studentId}#`) ? result : null
  const profile = current && "profile" in current ? current.profile : null
  const student = profile?.student ?? null
  const privacy = usePersonPrivacy(
    student
      ? { anonymized: student.anonymized, name: student.fullName, personId: student.id, status: student.status }
      : null,
    reload,
  )

  const renderState = () => {
    if (!current) return null

    if ("error" in current && current.error === "gone") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(paths.students)}>{t("students.profile.backToList")}</Button>}
          description={t("students.profile.goneDescription")}
          icon="school-outline"
          title={t("students.profile.goneTitle")}
        />
      )
    }

    return (
      <StateMessage
        action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
        description={t("students.profile.errorDescription")}
        title={t("students.profile.errorTitle")}
        variant="error"
      />
    )
  }

  if (!profile || !student) {
    return (
      <>
        <PageHeader icon="school-outline" title={t("students.profile.title")} />
        {current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {renderState()}
          </Card>
        )}
      </>
    )
  }

  const activeLinks = profile.guardians.filter((item) => item.link.status === "ACTIVE")
  const linkedGuardianIds = activeLinks.map((item) => item.guardian.id)

  const isLocked = student.anonymized
  const actions: ActionMenuItem[] = []
  if (!isLocked) {
    actions.push({
      icon: "pen-outline",
      key: "edit",
      label: t("students.profile.edit"),
      onClick: () => navigate(generatePath(paths.studentEdit, { studentId: String(student.id) })),
    })
  }
  if (!isLocked && student.status === "DRAFT") {
    actions.push(
      {
        icon: "check-circle-outline",
        key: "activate",
        label: t("students.state.activate.action"),
        onClick: () => setDialog("activate"),
      },
      {
        icon: "trash-outline",
        key: "discard",
        label: t("students.state.discard.action"),
        onClick: () => setDialog("discard"),
        tone: "danger",
      },
    )
  }
  if (!isLocked && student.status === "ACTIVE") {
    actions.push(
      {
        icon: "login-outline",
        key: "access",
        label: student.hasAccess ? t("students.profile.newPassword") : t("students.profile.createAccess"),
        onClick: () => setDialog("access"),
      },
      {
        icon: "lock-outline",
        key: "inactivate",
        label: t("students.state.inactivate.action"),
        onClick: () => setDialog("inactivate"),
        tone: "danger",
      },
    )
  }
  if (!isLocked && student.status === "INACTIVE") {
    actions.push({
      icon: "unlock-outline",
      key: "reactivate",
      label: t("students.state.reactivate.action"),
      onClick: () => setDialog("reactivate"),
    })
  }

  actions.push(...privacy.items)

  const tabs = [
    profile.sections.includes("IDENTITY") && {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <StudentData documentTypes={documentTypes} student={student} />
        </Card>
      ),
      icon: "info-outline" as const,
      key: "data",
      label: t("students.profile.tabs.data"),
    },
    profile.sections.includes("GUARDIANS") && {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <StudentGuardians
            canAdd={!isLocked && student.status !== "INACTIVE"}
            canChange={!isLocked}
            guardians={profile.guardians}
            invitations={profile.guardianInvitations}
            onDecide={(invitation, decision) => setLinkDialog({ decision, invitation, kind: "decide" })}
            onEditLink={(link, guardianName) => setLinkDialog({ guardianName, kind: "edit", link })}
            onEndLink={(link, guardianName) => setLinkDialog({ guardianName, kind: "end", link })}
            onInvite={() => setLinkDialog({ kind: "invite" })}
            onNewLink={() => setLinkDialog({ kind: "new" })}
            relationshipTypes={relationshipTypes}
            showInvitations={profile.sections.includes("INVITATIONS")}
          />
        </Card>
      ),
      icon: "users-outline" as const,
      key: "guardians",
      label: t("students.profile.tabs.guardians"),
    },
    profile.sections.includes("DOCUMENTS") && {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <PersonDocuments documentTypes={documentTypes} personId={student.id} readOnly={isLocked} />
        </Card>
      ),
      icon: "file-outline" as const,
      key: "documents",
      label: t("personDocuments.tab"),
    },
    profile.sections.includes("HISTORY") && {
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <PersonHistory kind="student" personId={student.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "history" as const,
      key: "history",
      label: t("personHistory.tab"),
    },
  ].filter((item) => item !== false)

  return (
    <>
      <PageHeader
        description={t("students.profile.description")}
        icon="school-outline"
        title={student.socialName || student.fullName}
      />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={personStatusTone(student.status)}>{personStatusLabel(student.status)}</Badge>
          {isLocked && <AnonymizedBadge />}
          <Text color="secondary" fontSize="sm">
            {[student.studentCode, student.referenceUnit?.name].filter(Boolean).join(" · ")}
          </Text>
        </ProfileBarInfo>
        {actions.length > 0 && <ActionMenu items={actions} triggerLabel={t("students.profile.actions")} />}
      </ProfileBar>

      {isLocked && <AnonymizedNotice />}

      <Tabs
        items={tabs}
        label={t("students.profile.sectionsLabel")}
        onChange={setTab}
        value={tabs.some((item) => item.key === tab) ? tab : (tabs[0]?.key ?? "")}
        attached
      />

      {dialog && dialog !== "access" && (
        <StudentStateDialog
          action={dialog}
          onChanged={reload}
          onClose={() => setDialog(null)}
          onGone={reload}
          student={student}
        />
      )}

      {linkDialog?.kind === "new" && (
        <NewLinkModal
          documentTypes={documentTypes}
          linkedGuardianIds={linkedGuardianIds}
          onChanged={reload}
          onClose={() => setLinkDialog(null)}
          relationshipTypes={relationshipTypes}
          student={student}
        />
      )}

      {linkDialog?.kind === "invite" && (
        <InviteGuardianModal
          documentTypes={documentTypes}
          linkedGuardianIds={linkedGuardianIds}
          onChanged={reload}
          onClose={() => setLinkDialog(null)}
          relationshipTypes={relationshipTypes}
          student={student}
        />
      )}

      {linkDialog?.kind === "edit" && (
        <EditLinkModal
          guardianName={linkDialog.guardianName}
          link={linkDialog.link}
          onChanged={reload}
          onClose={() => setLinkDialog(null)}
          relationshipTypes={relationshipTypes}
        />
      )}

      {linkDialog?.kind === "end" && (
        <EndLinkDialog
          guardianName={linkDialog.guardianName}
          isLastGuardian={student.status === "ACTIVE" && activeLinks.length === 1 && isMinor(student.birthDate)}
          link={linkDialog.link}
          onChanged={reload}
          onClose={() => setLinkDialog(null)}
        />
      )}

      {linkDialog?.kind === "decide" && (
        <InvitationDecisionDialog
          decision={linkDialog.decision}
          invitation={linkDialog.invitation}
          onChanged={reload}
          onClose={() => setLinkDialog(null)}
        />
      )}

      {dialog === "access" && (
        <TemporaryPasswordDialog
          onClose={reload}
          onGone={reload}
          user={{
            email: student.loginEmail,
            fullName: student.fullName,
            id: student.id,
            nickname: student.nickname ?? "",
          }}
        />
      )}

      {privacy.dialog}
    </>
  )
}
