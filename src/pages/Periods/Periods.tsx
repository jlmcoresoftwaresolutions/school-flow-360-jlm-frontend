import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { AcademicPeriod, AcademicPeriodSearchParams, AcademicPeriodStatus } from "@/models"
import { listAcademicPeriods } from "@/services/academicPeriods"

import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { ActivatePeriodDialog } from "./ActivatePeriodDialog"
import { ClosePeriodDialog } from "./ClosePeriodDialog"
import { PeriodFormModal } from "./PeriodFormModal"

const pageSize = 20

const statuses: AcademicPeriodStatus[] = ["CONFIGURED", "ACTIVE", "CLOSED"]

type Dialog = { kind: "activate" | "close" | "edit"; period: AcademicPeriod } | { kind: "new" } | null

// The school periods (P04-S02): the ones with at least one unit in the person's scope, by name, year
// and status. Each row shows the kind, the dates, the units and the status, and offers only what the
// server allows for it (`eligibleActions`): edit, activate a configured period, close an active one. A
// Professor reads the periods of the units they teach in, without any action. Changing a filter clears
// the rows at once, so data of another context is never left on screen.
export const Periods = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
  const { dateRange, periodKindLabel, periodStatusLabel, periodStatusTone } = useAcademicLabels(units)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"" | AcademicPeriodStatus>("")
  const [year, setYear] = useState("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<AcademicPeriodSearchParams>(
    () => ({
      direction: "desc",
      page: page - 1,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "startDate",
      status: status || undefined,
      year: year ? Number(year) : undefined,
    }),
    [debouncedSearch, page, status, year],
  )

  const { current, reload } = usePeopleList(listAcademicPeriods, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || status !== "" || year !== ""
  const thisYear = new Date().getFullYear()

  const statusOptions: SelectOption[] = [
    { label: t("periods.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: periodStatusLabel(value), value })),
  ]
  const yearOptions: SelectOption[] = [
    { label: t("periods.allYears"), value: "" },
    ...[thisYear + 1, thisYear, thisYear - 1, thisYear - 2].map((value) => ({
      label: String(value),
      value: String(value),
    })),
  ]

  // Every filter starts the list over from its first page.
  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const clearFilters = () => {
    setSearch("")
    setStatus("")
    setYear("")
    setPage(1)
  }

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const unitNames = (period: AcademicPeriod) =>
    period.unitIds.map((unitId) => units.nameOf(unitId) ?? t("academic.unitNumber", { id: unitId })).join(", ")

  const renderActions = (period: AcademicPeriod) => {
    const items: ActionMenuItem[] = []
    if (period.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("periods.edit"),
        onClick: () => setDialog({ kind: "edit", period }),
      })
    }
    if (period.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("periods.activate.action"),
        onClick: () => setDialog({ kind: "activate", period }),
      })
    }
    if (period.eligibleActions.includes("CLOSE")) {
      items.push({
        icon: "lock-outline",
        key: "close",
        label: t("periods.close.action"),
        onClick: () => setDialog({ kind: "close", period }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("periods.actionsFor", { name: period.name })} />
  }

  const newButton = units.canManage && (
    <Button
      onClick={() => setDialog({ kind: "new" })}
      size="small"
      startIcon={<Icon color="inherit" name="plus" size={16} />}
    >
      {t("periods.new")}
    </Button>
  )

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("periods.errorDescription")}
          errorTitle={t("periods.errorTitle")}
          forbiddenDescription={t("periods.forbiddenDescription")}
          forbiddenTitle={t("periods.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={
            units.canManage ? <Button onClick={() => setDialog({ kind: "new" })}>{t("periods.new")}</Button> : undefined
          }
          description={units.canManage ? t("periods.emptyDescription") : t("periods.emptyReadOnly")}
          icon="calendar-outline"
          title={t("periods.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={newButton || undefined}
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("periods.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("periods.searchLabel")}
          searchPlaceholder={t("periods.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setYear)(option?.value ?? "")}
            options={yearOptions}
            placeholder={t("periods.allYears")}
            size="small"
            title={t("periods.year")}
            value={yearOptions.find((option) => option.value === year) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setStatus)((option?.value as AcademicPeriodStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("periods.allStatuses")}
            size="small"
            title={t("periods.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("periods.noResults")}
          loading={!current}
          loadingMessage={t("periods.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicPeriod) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {row.name}
                </Text>
                <Text color="secondary" fontSize="sm">
                  {periodKindLabel(row.kind)}
                </Text>
              </PersonCell>
            )}
            field="name"
            header={t("periods.period")}
          />
          <Table.Column
            body={(row: AcademicPeriod) => <Text fontSize="sm">{row.referenceYear}</Text>}
            field="referenceYear"
            header={t("periods.year")}
          />
          <Table.Column
            body={(row: AcademicPeriod) => <Text fontSize="sm">{dateRange(row.startDate, row.endDate)}</Text>}
            field="startDate"
            header={t("periods.validity")}
          />
          <Table.Column
            body={(row: AcademicPeriod) => <Text fontSize="sm">{unitNames(row)}</Text>}
            field="unitIds"
            header={t("periods.units")}
          />
          <Table.Column
            body={(row: AcademicPeriod) => (
              <Badge tone={periodStatusTone(row.status)}>{periodStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("periods.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("periods.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("periods.filtersLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={data.totalPages}
          />
        )}
      </ListContent>
    )
  }

  return (
    <>
      <PageHeader
        description={t("academic.descriptions.periods")}
        icon="calendar-outline"
        title={t("shell.nav.periods")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {dialog?.kind === "new" && (
        <PeriodFormModal onClose={() => setDialog(null)} onSaved={afterChange} units={units} />
      )}
      {dialog?.kind === "edit" && (
        <PeriodFormModal onClose={() => setDialog(null)} onSaved={afterChange} period={dialog.period} units={units} />
      )}
      {dialog?.kind === "activate" && (
        <ActivatePeriodDialog onChanged={afterChange} onClose={() => setDialog(null)} period={dialog.period} />
      )}
      {dialog?.kind === "close" && (
        <ClosePeriodDialog
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          period={dialog.period}
          units={units}
        />
      )}
    </>
  )
}
