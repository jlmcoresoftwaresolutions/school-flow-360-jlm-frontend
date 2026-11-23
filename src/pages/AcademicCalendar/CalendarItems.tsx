import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem } from "@/ds-components/molecules"
import { ActionMenu, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog, Table } from "@/ds-components/organisms"
import type { AcademicCalendarItem, AcademicPeriod } from "@/models"
import { listAcademicCalendarItems, removeAcademicCalendarItem } from "@/services/academicCalendar"
import { getErrorCode } from "@/services/httpClient"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { CalendarItemModal } from "./CalendarItemModal"

export type CalendarItemsProps = {
  // Whether the person may prepare items in this unit.
  canPrepare: boolean
  period: AcademicPeriod
  // Changes whenever the calendar changed, to read the items again.
  refreshKey: number
  unitId: number
  units: AcademicUnits
  // An item changed: the preview has to be read again.
  onChanged: () => void
}

type ItemsResult = { error: true; key: string } | { items: AcademicCalendarItem[]; key: string }

type Dialog = { item: AcademicCalendarItem; kind: "edit" | "remove" } | { kind: "new" } | null

const itemsSize = 200

// The items being prepared for a unit and period: school days, holidays and events, in date order. Saving
// or removing an item never touches what was published; it changes only the next publication. Removing
// takes the item out of the preparation without deleting anything.
export const CalendarItems = (props: CalendarItemsProps) => {
  const { canPrepare, onChanged, period, refreshKey, unitId, units } = props

  const { t } = useTranslation()
  const { calendarCategoryLabel, calendarCategoryTone, dateRange } = useAcademicLabels()
  const toFailureMessage = useFailureMessage()

  const [result, setResult] = useState<ItemsResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const requestKey = `${period.id}:${unitId}#${refreshKey}#${reloadToken}`

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const page = await listAcademicCalendarItems(
          { direction: "asc", periodId: period.id, size: itemsSize, sortBy: "startDate", status: "ACTIVE", unitId },
          { showLoading: false },
        )
        if (!isStale) setResult({ items: page.items, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [period.id, requestKey, unitId])

  // Only the answer of this unit and period (never another context's).
  const current = result?.key === requestKey ? result : null

  const afterChange = () => {
    setDialog(null)
    onChanged()
  }

  const remove = async (item: AcademicCalendarItem) => {
    setIsRemoving(true)
    try {
      await removeAcademicCalendarItem(item.id, item.version)
      toast.success(t("academicCalendar.remove.done", { title: item.title }))
    } catch (error) {
      const code = getErrorCode(error)
      if (code === "VERSION_CONFLICT" || code === "ACADEMIC_NOT_FOUND") {
        toast.error(t("academicCalendar.changedMeanwhile"))
      } else {
        toast.error(toFailureMessage(t("academicCalendar.remove.failed"), error))
      }
    } finally {
      setIsRemoving(false)
      afterChange()
    }
  }

  const renderActions = (item: AcademicCalendarItem) => {
    const items: ActionMenuItem[] = []
    if (item.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("academicCalendar.edit"),
        onClick: () => setDialog({ item, kind: "edit" }),
      })
    }
    if (item.eligibleActions.includes("REMOVE")) {
      items.push({
        icon: "trash-outline",
        key: "remove",
        label: t("academicCalendar.remove.action"),
        onClick: () => setDialog({ item, kind: "remove" }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("academicCalendar.actionsFor", { title: item.title })} />
  }

  const newButton = canPrepare ? (
    <Button
      onClick={() => setDialog({ kind: "new" })}
      size="small"
      startIcon={<Icon color="inherit" name="plus" size={16} />}
    >
      {t("academicCalendar.new")}
    </Button>
  ) : null

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={<Button onClick={() => setReloadToken((value) => value + 1)}>{t("common.tryAgain")}</Button>}
          description={t("academicCalendar.itemsErrorDescription")}
          title={t("academicCalendar.itemsErrorTitle")}
          variant="error"
        />
      )
    }

    if (current && current.items.length === 0) {
      return (
        <StateMessage
          action={newButton ?? undefined}
          description={t("academicCalendar.emptyItemsDescription")}
          icon="event-note-outline"
          title={t("academicCalendar.emptyItemsTitle")}
        />
      )
    }

    return (
      <ListContent>
        {newButton && <span style={{ alignSelf: "flex-end" }}>{newButton}</span>}
        <Table
          dataKey="id"
          emptyMessage={t("academicCalendar.emptyItemsTitle")}
          loading={!current}
          loadingMessage={t("academicCalendar.loadingItems")}
          value={current?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicCalendarItem) => <Text fontSize="sm">{dateRange(row.startDate, row.endDate)}</Text>}
            field="startDate"
            header={t("academicCalendar.dates")}
          />
          <Table.Column
            body={(row: AcademicCalendarItem) => (
              <Badge tone={calendarCategoryTone(row.category)}>{calendarCategoryLabel(row.category)}</Badge>
            )}
            field="category"
            header={t("academicCalendar.category")}
          />
          <Table.Column
            body={(row: AcademicCalendarItem) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {row.title}
                </Text>
                {row.description && (
                  <Text color="secondary" fontSize="sm">
                    {row.description}
                  </Text>
                )}
              </PersonCell>
            )}
            field="title"
            header={t("academicCalendar.itemTitle")}
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
        <CalendarItemModal
          item={dialog.kind === "edit" ? dialog.item : undefined}
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          period={period}
          unitId={unitId}
          units={units}
        />
      )}
      {dialog?.kind === "remove" && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={t("academicCalendar.remove.confirm")}
          description={t("academicCalendar.remove.description")}
          loading={isRemoving}
          onClose={() => setDialog(null)}
          onConfirm={() => void remove(dialog.item)}
          title={t("academicCalendar.remove.title", { title: dialog.item.title })}
          tone="danger"
          open
        />
      )}
    </>
  )
}
