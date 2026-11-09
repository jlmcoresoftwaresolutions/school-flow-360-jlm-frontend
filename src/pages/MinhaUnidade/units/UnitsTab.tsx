import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import type { SchoolUnit, SchoolUnitInput, SchoolUnitStatus } from "@/models"
import { formatCityState } from "@/utils/address"
import { normalizeForSearch } from "@/utils/strings"

import { unitsPageSize } from "../MinhaUnidade.constants"
import { FieldGroup } from "../MinhaUnidade.styles"
import { TabCard } from "../shared/TabCard"
import { useStatusLabels } from "../shared/useStatusLabels"
import { InactivateUnitDialog } from "./InactivateUnitDialog"
import { UnitDetailsModal } from "./UnitDetailsModal"
import { UnitFormModal } from "./UnitFormModal"

type StatusFilter = "all" | SchoolUnitStatus

// Which dialog is open, if any, and for which unit.
type UnitDialog =
  | { kind: "details"; unit: SchoolUnit }
  | { kind: "edit"; unit: SchoolUnit }
  | { kind: "inactivate"; unit: SchoolUnit }
  | null

export type UnitsTabProps = {
  isCreating: boolean
  units: SchoolUnit[]
  onCreate: (input: SchoolUnitInput) => Promise<boolean>
  onCreatingChange: (isCreating: boolean) => void
  onInactivate: (unit: SchoolUnit, reason: string) => Promise<boolean>
  onUpdate: (unit: SchoolUnit, input: SchoolUnitInput) => Promise<boolean>
}

const matchesSearch = (unit: SchoolUnit, search: string) => {
  const term = normalizeForSearch(search)
  if (!term) return true

  return [unit.name, unit.address.city, unit.address.street, unit.address.district].some((text) =>
    normalizeForSearch(text).includes(term),
  )
}

// The organization's units the user may access (search and filter only ever narrow that list): a
// table with a search, a status filter and paging, plus registering, viewing, editing and
// inactivating. An empty organization and a search without results are told apart. The "new unit"
// form is opened from here or from the overview, so whether it is open lives in the page (isCreating).
export const UnitsTab = (props: UnitsTabProps) => {
  const { isCreating, onCreate, onCreatingChange, onInactivate, onUpdate, units } = props

  const { t } = useTranslation()
  const { statusTone, unitStatusLabel } = useStatusLabels()

  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [dialog, setDialog] = useState<UnitDialog>(null)

  const hasFilters = search.trim() !== "" || statusFilter !== "all"
  const filteredUnits = units.filter(
    (unit) => matchesSearch(unit, search) && (statusFilter === "all" || unit.status === statusFilter),
  )

  const statusOptions: SelectOption[] = [
    { label: t("minhaUnidade.units.filterAll"), value: "all" },
    { label: t("minhaUnidade.units.filterActive"), value: "ATIVA" },
    { label: t("minhaUnidade.units.filterInactive"), value: "INATIVA" },
  ]

  const closeDialog = () => setDialog(null)

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
  }

  const createButton = (
    <Button onClick={() => onCreatingChange(true)} startIcon={<Icon color="inverse" name="plus" size={16} />}>
      {t("minhaUnidade.units.create")}
    </Button>
  )

  const renderActions = (unit: SchoolUnit) => {
    const isActive = unit.status === "ATIVA"

    return (
      <ActionMenu
        items={[
          {
            icon: "eye-outline",
            key: "view",
            label: t("minhaUnidade.units.view"),
            onClick: () => setDialog({ kind: "details", unit }),
          },
          {
            disabled: !isActive,
            icon: "pen-outline",
            key: "edit",
            label: t("common.edit"),
            onClick: () => setDialog({ kind: "edit", unit }),
          },
          {
            disabled: !isActive,
            icon: "x-circle-outline",
            key: "inactivate",
            label: t("minhaUnidade.units.inactivate"),
            onClick: () => setDialog({ kind: "inactivate", unit }),
            tone: "danger",
          },
        ]}
        triggerLabel={t("minhaUnidade.units.actionsFor", { name: unit.name })}
      />
    )
  }

  return (
    <>
      <TabCard
        action={units.length > 0 ? createButton : undefined}
        description={t("minhaUnidade.units.description")}
        title={t("minhaUnidade.units.title")}
      >
        {units.length === 0 ? (
          <StateMessage
            action={<Button onClick={() => onCreatingChange(true)}>{t("minhaUnidade.units.createFirst")}</Button>}
            description={t("minhaUnidade.units.emptyDescription")}
            icon="location-outline"
            title={t("minhaUnidade.units.emptyTitle")}
          />
        ) : (
          <FieldGroup>
            <FilterBar
              clearDisabled={!hasFilters}
              clearLabel={t("minhaUnidade.units.clearFilters")}
              label={t("minhaUnidade.units.filtersLabel")}
              onClear={clearFilters}
              onSearchChange={setSearch}
              searchLabel={t("minhaUnidade.units.searchLabel")}
              searchPlaceholder={t("minhaUnidade.units.searchPlaceholder")}
              searchValue={search}
            >
              <Select
                onChange={(option) => setStatusFilter((option?.value as StatusFilter | undefined) ?? "all")}
                options={statusOptions}
                title={t("minhaUnidade.units.status")}
                value={statusOptions.find((option) => option.value === statusFilter) ?? null}
              />
            </FilterBar>

            <Table
              dataKey="id"
              emptyMessage={t("minhaUnidade.units.noResults")}
              nextPageLabel={t("common.nextPage")}
              pageLabel={(page) => t("common.pageLabel", { page })}
              pageSummary={(page, totalPages) => t("common.pageSummary", { page, totalPages })}
              previousPageLabel={t("common.previousPage")}
              rows={unitsPageSize}
              value={filteredUnits}
              paginator
            >
              <Table.Column
                body={(unit: SchoolUnit) => (
                  <Text fontSize="sm" semibold>
                    {unit.name}
                  </Text>
                )}
                field="name"
                header={t("minhaUnidade.units.name")}
                sortable
              />
              <Table.Column
                body={(unit: SchoolUnit) => formatCityState(unit.address) || t("common.notInformed")}
                field="address"
                header={t("minhaUnidade.units.cityState")}
              />
              <Table.Column
                body={(unit: SchoolUnit) => unit.contactPhone || t("common.notInformed")}
                field="contactPhone"
                header={t("minhaUnidade.units.contactPhone")}
              />
              <Table.Column
                body={(unit: SchoolUnit) => (
                  <Badge tone={statusTone(unit.status)}>{unitStatusLabel(unit.status)}</Badge>
                )}
                field="status"
                header={t("minhaUnidade.units.status")}
              />
              <Table.Column
                align="right"
                body={(unit: SchoolUnit) => renderActions(unit)}
                field="id"
                header={t("minhaUnidade.units.actions")}
                width="1%"
              />
            </Table>
          </FieldGroup>
        )}
      </TabCard>

      {isCreating && <UnitFormModal onClose={() => onCreatingChange(false)} onSave={onCreate} />}

      {dialog?.kind === "edit" && (
        <UnitFormModal onClose={closeDialog} onSave={(input) => onUpdate(dialog.unit, input)} unit={dialog.unit} />
      )}

      {dialog?.kind === "details" && (
        <UnitDetailsModal
          onClose={closeDialog}
          onEdit={(unit) => setDialog({ kind: "edit", unit })}
          unit={dialog.unit}
        />
      )}

      {dialog?.kind === "inactivate" && (
        <InactivateUnitDialog
          onClose={closeDialog}
          onConfirm={(reason) => onInactivate(dialog.unit, reason)}
          unit={dialog.unit}
        />
      )}
    </>
  )
}
