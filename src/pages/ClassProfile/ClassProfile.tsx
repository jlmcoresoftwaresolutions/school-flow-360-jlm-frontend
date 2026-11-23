import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, TabsItem } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, StateMessage, Tabs } from "@/ds-components/molecules"
import { spacing } from "@/foundation"
import type { AcademicClassOverview } from "@/models"
import { paths } from "@/routes/paths"
import { getAcademicClassOverview } from "@/services/academicClassDetail"
import { getErrorStatus } from "@/services/httpClient"

import { ClassFormModal } from "../Classes/ClassFormModal"
import { type ClassStateAction, ClassStateDialog } from "../Classes/ClassStateDialog"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { ClassCapacity } from "./capacity/ClassCapacity"
import { ClassGeneral } from "./ClassGeneral"
import { ClassHistory } from "./history/ClassHistory"
import { ClassStudents } from "./students/ClassStudents"
import { ClassTeachers } from "./teachers/ClassTeachers"

type OverviewResult = { error: "failed" | "gone"; key: string } | { key: string; overview: AcademicClassOverview }

type Dialog = "edit" | ClassStateAction | null

// A class's detail (P04-S06): the header with its status, unit and code and the actions `eligibleActions`
// allows (edit the name, shift and room; activate; inactivate), and the tabs the backend lets the person
// open (`tabs`), each read in its own call so one failing leaves the others. A class out of the person's
// reach (for a Professor, one where they don't teach today) answers as not found. Everything is read
// again after a change.
export const ClassProfile = () => {
  const { classId } = useParams()

  const { t } = useTranslation()
  const navigate = useNavigate()
  const units = useAcademicUnits()
  const { classStatusLabel, classStatusTone } = useAcademicLabels(units)

  const [result, setResult] = useState<OverviewResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [tab, setTab] = useState("general")
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${classId}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const overview = await getAcademicClassOverview(Number(classId))
        if (!isStale) setResult({ key: requestKey, overview })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [classId, requestKey])

  const reload = () => {
    setDialog(null)
    setReloadToken((value) => value + 1)
  }

  // Another class's answer is never shown while this one is read.
  const current = result?.key.startsWith(`${classId}#`) ? result : null
  const overview = current && "overview" in current ? current.overview : null

  if (!current || !overview) {
    return (
      <>
        <PageHeader icon="class-outline" title={t("classes.profile.title")} />
        {current && "error" in current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {current.error === "gone" ? (
              <StateMessage
                action={<Button onClick={() => navigate(paths.classes)}>{t("classes.profile.backToList")}</Button>}
                description={t("classes.profile.goneDescription")}
                icon="class-outline"
                title={t("classes.profile.goneTitle")}
              />
            ) : (
              <StateMessage
                action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
                description={t("classes.profile.errorDescription")}
                title={t("classes.profile.errorTitle")}
                variant="error"
              />
            )}
          </Card>
        )}
      </>
    )
  }

  const { schoolClass } = overview

  const actions: ActionMenuItem[] = []
  if (schoolClass.eligibleActions.includes("EDIT")) {
    actions.push({ icon: "pen-outline", key: "edit", label: t("classes.edit"), onClick: () => setDialog("edit") })
  }
  if (schoolClass.eligibleActions.includes("ACTIVATE")) {
    actions.push({
      icon: "check-circle-outline",
      key: "activate",
      label: t("classes.state.activate.action"),
      onClick: () => setDialog("activate"),
    })
  }
  if (schoolClass.eligibleActions.includes("INACTIVATE")) {
    actions.push({
      icon: "lock-outline",
      key: "inactivate",
      label: t("classes.state.inactivate.action"),
      onClick: () => setDialog("inactivate"),
      tone: "danger",
    })
  }

  // The tabs the backend lets the person open, each read in its own call.
  const tabs: TabsItem[] = []
  if (overview.tabs.includes("GENERAL")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <ClassGeneral classId={schoolClass.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "info-outline",
      key: "general",
      label: t("classes.profile.tabs.general"),
    })
  }
  if (overview.tabs.includes("STUDENTS")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <ClassStudents classId={schoolClass.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "school-outline",
      key: "students",
      label: t("classes.profile.tabs.students"),
    })
  }
  if (overview.tabs.includes("TEACHERS")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <ClassTeachers onChanged={reload} refreshKey={reloadToken} schoolClass={schoolClass} />
        </Card>
      ),
      icon: "users-outline",
      key: "teachers",
      label: t("classes.profile.tabs.teachers"),
    })
  }
  if (overview.tabs.includes("CAPACITY")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <ClassCapacity classId={schoolClass.id} onChanged={reload} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "analytics-outline",
      key: "capacity",
      label: t("classes.profile.tabs.capacity"),
    })
  }
  if (overview.tabs.includes("HISTORY")) {
    tabs.push({
      content: (
        <Card elevated style={{ padding: spacing[32] }}>
          <ClassHistory classId={schoolClass.id} refreshKey={reloadToken} />
        </Card>
      ),
      icon: "history",
      key: "history",
      label: t("classes.profile.tabs.history"),
    })
  }

  const unitName = units.nameOf(schoolClass.unitId) ?? t("academic.unitNumber", { id: schoolClass.unitId })

  return (
    <>
      <PageHeader description={t("classes.profile.description")} icon="class-outline" title={schoolClass.name} />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={classStatusTone(schoolClass.status)}>{classStatusLabel(schoolClass.status)}</Badge>
          <Text color="secondary" fontSize="sm">
            {`${schoolClass.code} · ${unitName}`}
          </Text>
        </ProfileBarInfo>
        {actions.length > 0 && <ActionMenu items={actions} triggerLabel={t("classes.profile.actions")} />}
      </ProfileBar>

      <Tabs
        items={tabs}
        label={t("classes.profile.sectionsLabel")}
        onChange={setTab}
        value={tabs.some((item) => item.key === tab) ? tab : (tabs[0]?.key ?? "")}
        attached
      />

      {dialog === "edit" && (
        <ClassFormModal
          grades={[]}
          onClose={() => setDialog(null)}
          onSaved={reload}
          periods={[]}
          schoolClass={schoolClass}
          stages={[]}
          subjects={[]}
          units={units}
        />
      )}
      {(dialog === "activate" || dialog === "inactivate") && (
        <ClassStateDialog
          action={dialog}
          onChanged={reload}
          onClose={() => setDialog(null)}
          schoolClass={schoolClass}
        />
      )}
    </>
  )
}
