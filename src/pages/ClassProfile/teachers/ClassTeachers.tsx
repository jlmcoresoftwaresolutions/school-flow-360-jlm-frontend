import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { AcademicClass, AcademicTeacherLink } from "@/models"
import { listAcademicSubjects } from "@/services/academicCatalog"
import { listAcademicTeacherLinks } from "@/services/academicClasses"

import { useAcademicDirectory } from "../../shared/academic/useAcademicDirectory"
import { useAcademicLabels } from "../../shared/academic/useAcademicLabels"
import { ListContent, PersonCell } from "../../shared/userAccess/userAccess.styles"
import { EndTeacherLinkDialog } from "./EndTeacherLinkDialog"
import { TeacherLinkModal } from "./TeacherLinkModal"

export type ClassTeachersProps = {
  schoolClass: AcademicClass
  // A link changed: the class is read again (its pending items depend on the teachers).
  onChanged: () => void
  // Changes whenever the class changed, to read the links again.
  refreshKey: number
}

type LinksResult = { error: true; key: string } | { key: string; links: AcademicTeacherLink[] }

type Dialog = { kind: "edit" | "end"; link: AcademicTeacherLink } | { kind: "new" } | null

// The Teachers tab of a class (P04-S07): who teaches each subject and when - the dates inclusive, an open
// end, the state computed for today (scheduled, current, ended) and whether the teaching is shared. The
// unit's management links a Professor of the unit, edits a link not ended and ends one, as `eligibleActions`
// allows; ended links stay listed. A Professor sees only their own links.
export const ClassTeachers = (props: ClassTeachersProps) => {
  const { onChanged, refreshKey, schoolClass } = props

  const { t } = useTranslation()
  const { dateRange, linkStateLabel, linkStateTone } = useAcademicLabels()
  const subjects = useAcademicDirectory(listAcademicSubjects)

  const [result, setResult] = useState<LinksResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${schoolClass.id}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const links = await listAcademicTeacherLinks(schoolClass.id, { showLoading: false })
        if (!isStale) setResult({ key: requestKey, links })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [requestKey, schoolClass.id])

  // Another class's links are never shown while this one's are read.
  const current = result?.key.startsWith(`${schoolClass.id}#`) ? result : null
  const canAdd = schoolClass.eligibleActions.includes("ADD_TEACHER")

  const subjectName = (subjectId: number) => {
    const subject = subjects.items.find((item) => item.id === subjectId)
    return subject ? `${subject.code} · ${subject.name}` : ""
  }

  const afterChange = () => {
    setDialog(null)
    onChanged()
  }

  const renderActions = (link: AcademicTeacherLink) => {
    const items: ActionMenuItem[] = []
    if (link.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("classTeachers.editAction"),
        onClick: () => setDialog({ kind: "edit", link }),
      })
    }
    if (link.eligibleActions.includes("END")) {
      items.push({
        icon: "lock-outline",
        key: "end",
        label: t("classTeachers.end.action"),
        onClick: () => setDialog({ kind: "end", link }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("classTeachers.actionsFor", { name: link.teacherName })} />
  }

  const addButton = canAdd ? (
    <Button
      onClick={() => setDialog({ kind: "new" })}
      size="small"
      startIcon={<Icon color="inherit" name="plus" size={16} />}
    >
      {t("classTeachers.new")}
    </Button>
  ) : null

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
          description={t("classTeachers.errorDescription")}
          title={t("classTeachers.errorTitle")}
          variant="error"
        />
      )
    }

    if (current && current.links.length === 0) {
      return (
        <StateMessage
          action={addButton ?? undefined}
          description={canAdd ? t("classTeachers.emptyDescription") : t("classTeachers.emptyReadOnly")}
          icon="users-outline"
          title={t("classTeachers.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        {addButton && <span style={{ alignSelf: "flex-end" }}>{addButton}</span>}
        <Table
          dataKey="id"
          emptyMessage={t("classTeachers.emptyTitle")}
          loading={!current}
          loadingMessage={t("classTeachers.loading")}
          value={current?.links ?? []}
        >
          <Table.Column
            body={(row: AcademicTeacherLink) => (
              <Text fontSize="sm" semibold>
                {row.teacherName}
              </Text>
            )}
            field="teacherName"
            header={t("classTeachers.teacher")}
          />
          <Table.Column
            body={(row: AcademicTeacherLink) => <Text fontSize="sm">{subjectName(row.subjectId)}</Text>}
            field="subjectId"
            header={t("classTeachers.subject")}
          />
          <Table.Column
            body={(row: AcademicTeacherLink) => (
              <PersonCell>
                <Text fontSize="sm">{dateRange(row.startDate, row.endDate)}</Text>
                {row.joint && (
                  <Text color="secondary" fontSize="sm">
                    {t("classTeachers.jointTag")}
                  </Text>
                )}
              </PersonCell>
            )}
            field="startDate"
            header={t("classTeachers.dates")}
          />
          <Table.Column
            body={(row: AcademicTeacherLink) => (
              <Badge tone={linkStateTone(row.state)}>{linkStateLabel(row.state)}</Badge>
            )}
            field="state"
            header={t("academic.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>
      </ListContent>
    )
  }

  return (
    <>
      {renderContent()}

      {(dialog?.kind === "new" || dialog?.kind === "edit") && (
        <TeacherLinkModal
          link={dialog.kind === "edit" ? dialog.link : undefined}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          schoolClass={schoolClass}
          subjects={subjects.items}
        />
      )}
      {dialog?.kind === "end" && (
        <EndTeacherLinkDialog
          link={dialog.link}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          unitId={schoolClass.unitId}
        />
      )}
    </>
  )
}
