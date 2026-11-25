import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicCatalogStatus, AcademicRoom, ApiItemsPage } from "@/models"
import { activateAcademicRoom, inactivateAcademicRoom, listAcademicRooms } from "@/services/academicCatalog"
import type { RequestConfig } from "@/services/httpClient"
import { normalizeForSearch } from "@/utils/strings"

import { CatalogStatusDialog } from "../shared/academic/CatalogStatusDialog"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { RoomFormModal } from "./RoomFormModal"

const statuses: AcademicCatalogStatus[] = ["ACTIVE", "INACTIVE"]

type Dialog = { kind: "activate" | "edit" | "inactivate"; room: AcademicRoom } | { kind: "new" } | null

// The backend lists every room of a unit at once; the list reads it as a single page.
const loadRooms = async (params: { unitId: number }, config?: RequestConfig): Promise<ApiItemsPage<AcademicRoom>> => {
  const items = await listAcademicRooms(params, config)

  return { items, page: 0, size: items.length, totalElements: items.length, totalPages: 1 }
}

// The physical rooms of a unit (P04-S04), where its classes meet: one unit at a time (the first one the
// person knows, to begin with), searched by name and filtered by status on the screen. A room is renamed
// (never moved to another unit), inactivated (only while no class in preparation or active uses it) and
// reactivated, as `eligibleActions` allows; an inactive room is never offered for a new class. A class
// without a room is marked as such when it is created, never by a placeholder room. A Professor only reads.
export const Rooms = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
  const { catalogStatusLabel, catalogStatusTone } = useAcademicLabels(units)

  const [chosenUnitId, setChosenUnitId] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"" | AcademicCatalogStatus>("")
  const [dialog, setDialog] = useState<Dialog>(null)

  // To begin with, the first unit the person may manage (an inactive one never takes a new room), or else
  // the first one they know.
  const firstUnit = units.manageableUnits[0] ?? units.units[0]
  const unitId = chosenUnitId || (firstUnit ? String(firstUnit.id) : "")
  const params = useMemo(() => (unitId ? { unitId: Number(unitId) } : null), [unitId])

  const { current, reload } = usePeopleList(loadRooms, params)

  const unitName = units.nameOf(Number(unitId)) ?? ""
  const canCreate = units.manageableUnits.some((unit) => String(unit.id) === unitId)
  const isUnitInactive = units.units.some((unit) => String(unit.id) === unitId && !unit.active)
  const rooms = current && "data" in current ? current.data.items : null
  const term = normalizeForSearch(search.trim())
  const shown = (rooms ?? []).filter(
    (room) => (!status || room.status === status) && (!term || normalizeForSearch(room.name).includes(term)),
  )
  const hasFilters = search.trim() !== "" || status !== ""

  const unitOptions: SelectOption[] = units.units.map((unit) => ({
    label: unit.active ? unit.name : t("rooms.inactiveUnit", { name: unit.name }),
    value: String(unit.id),
  }))
  const statusOptions: SelectOption[] = [
    { label: t("academic.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: catalogStatusLabel(value), value })),
  ]

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const renderActions = (room: AcademicRoom) => {
    const items: ActionMenuItem[] = []
    if (room.eligibleActions.includes("RENAME")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("rooms.rename"),
        onClick: () => setDialog({ kind: "edit", room }),
      })
    }
    if (room.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("academic.catalogStatus.activate.action"),
        onClick: () => setDialog({ kind: "activate", room }),
      })
    }
    if (room.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("academic.catalogStatus.inactivate.action"),
        onClick: () => setDialog({ kind: "inactivate", room }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("rooms.actionsFor", { name: room.name })} />
  }

  const renderList = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("rooms.errorDescription")}
          errorTitle={t("rooms.errorTitle")}
          forbiddenDescription={t("rooms.forbiddenDescription")}
          forbiddenTitle={t("rooms.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (rooms && rooms.length === 0) {
      return (
        <StateMessage
          action={canCreate ? <Button onClick={() => setDialog({ kind: "new" })}>{t("rooms.new")}</Button> : undefined}
          description={canCreate ? t("rooms.emptyDescription") : t("rooms.emptyReadOnly")}
          icon="location-outline"
          title={t("rooms.emptyTitle", { unit: unitName })}
        />
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("rooms.noResults")}
        loading={!current}
        loadingMessage={t("rooms.loading")}
        value={shown}
      >
        <Table.Column
          body={(row: AcademicRoom) => (
            <Text fontSize="sm" semibold>
              {row.name}
            </Text>
          )}
          field="name"
          header={t("rooms.room")}
        />
        <Table.Column
          body={(row: AcademicRoom) => (
            <Badge tone={catalogStatusTone(row.status)}>{catalogStatusLabel(row.status)}</Badge>
          )}
          field="status"
          header={t("academic.status")}
        />
        <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
      </Table>
    )
  }

  const renderContent = () => {
    if (units.units.length === 0) {
      return (
        <StateMessage
          description={t("rooms.noUnitsDescription")}
          icon="location-outline"
          title={t("rooms.noUnitsTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={
            canCreate ? (
              <Button
                onClick={() => setDialog({ kind: "new" })}
                size="small"
                startIcon={<Icon color="inherit" name="plus" size={16} />}
              >
                {t("rooms.new")}
              </Button>
            ) : undefined
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters}
          label={t("rooms.filtersLabel")}
          onClear={() => {
            setSearch("")
            setStatus("")
          }}
          onSearchChange={setSearch}
          searchLabel={t("rooms.searchLabel")}
          searchPlaceholder={t("rooms.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              if (option) setChosenUnitId(option.value)
            }}
            options={unitOptions}
            placeholder={t("rooms.unitPlaceholder")}
            size="small"
            title={t("rooms.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => setStatus((option?.value as AcademicCatalogStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("academic.allStatuses")}
            size="small"
            title={t("academic.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        {!canCreate && units.canManage && (
          <Text color="secondary" fontSize="sm">
            {isUnitInactive ? t("rooms.unitInactive", { unit: unitName }) : t("rooms.notManaged", { unit: unitName })}
          </Text>
        )}

        {renderList()}
      </ListContent>
    )
  }

  return (
    <>
      <PageHeader description={t("academic.descriptions.rooms")} icon="location-outline" title={t("shell.nav.rooms")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {dialog?.kind === "new" && (
        <RoomFormModal
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          unitId={Number(unitId)}
          unitName={unitName}
        />
      )}
      {dialog?.kind === "edit" && (
        <RoomFormModal
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          room={dialog.room}
          unitId={dialog.room.unitId}
          unitName={unitName}
        />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <CatalogStatusDialog
          action={dialog.kind}
          name={dialog.room.name}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          run={() =>
            dialog.kind === "activate"
              ? activateAcademicRoom(dialog.room.id, dialog.room.version)
              : inactivateAcademicRoom(dialog.room.id, dialog.room.version)
          }
          units={units}
        />
      )}
    </>
  )
}
