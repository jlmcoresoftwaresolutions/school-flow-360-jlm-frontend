import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { useDebouncedValue } from "@/hooks"
import type { AcademicCatalogSearchParams, AcademicCatalogStatus, AcademicStage } from "@/models"
import {
  activateAcademicStage,
  getAcademicStageImpact,
  inactivateAcademicStage,
  listAcademicStages,
} from "@/services/academicCatalog"

import { CatalogStatusDialog } from "../shared/academic/CatalogStatusDialog"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { GradeFormModal } from "./GradeFormModal"
import { StageFormModal } from "./StageFormModal"

export type StagesTabProps = {
  // Every stage, for the grade form.
  stages: AcademicStage[]
  units: AcademicUnits
  // A stage was created or changed: the stages known by the page are read again.
  onCatalogChanged: () => void
}

const pageSize = 20

type Dialog = { kind: "activate" | "edit" | "inactivate" | "newGrade"; stage: AcademicStage } | { kind: "new" } | null

const statuses: AcademicCatalogStatus[] = ["ACTIVE", "INACTIVE"]

// The stages of the institution, in their order: each one is edited, gets a new grade, or is
// inactivated (only without active grades) and reactivated, as `eligibleActions` allows.
export const StagesTab = (props: StagesTabProps) => {
  const { onCatalogChanged, stages, units } = props

  const { t } = useTranslation()
  const { catalogStatusLabel, catalogStatusTone } = useAcademicLabels(units)

  const [search, setSearch] = useState("")
  const [status, setStatus] = useState<"" | AcademicCatalogStatus>("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<AcademicCatalogSearchParams>(
    () => ({
      page: page - 1,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "sortOrder",
      status: status || undefined,
    }),
    [debouncedSearch, page, status],
  )

  const { current, reload } = usePeopleList(listAcademicStages, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || status !== ""
  const statusOptions: SelectOption[] = [
    { label: t("academic.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: catalogStatusLabel(value), value })),
  ]

  const afterChange = () => {
    setDialog(null)
    reload()
    onCatalogChanged()
  }

  const renderActions = (stage: AcademicStage) => {
    const items: ActionMenuItem[] = []
    if (stage.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("gradeLevels.edit"),
        onClick: () => setDialog({ kind: "edit", stage }),
      })
    }
    if (stage.eligibleActions.includes("ADD_GRADE")) {
      items.push({
        icon: "plus",
        key: "newGrade",
        label: t("gradeLevels.stages.newGrade"),
        onClick: () => setDialog({ kind: "newGrade", stage }),
      })
    }
    if (stage.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("academic.catalogStatus.activate.action"),
        onClick: () => setDialog({ kind: "activate", stage }),
      })
    }
    if (stage.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("academic.catalogStatus.inactivate.action"),
        onClick: () => setDialog({ kind: "inactivate", stage }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("gradeLevels.actionsFor", { name: stage.name })} />
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("gradeLevels.stages.errorDescription")}
          errorTitle={t("gradeLevels.stages.errorTitle")}
          forbiddenDescription={t("gradeLevels.forbiddenDescription")}
          forbiddenTitle={t("gradeLevels.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={
            units.canManage ? (
              <Button onClick={() => setDialog({ kind: "new" })}>{t("gradeLevels.stages.new")}</Button>
            ) : undefined
          }
          description={
            units.canManage ? t("gradeLevels.stages.emptyDescription") : t("gradeLevels.stages.emptyReadOnly")
          }
          icon="school-outline"
          title={t("gradeLevels.stages.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={
            units.canManage ? (
              <Button
                onClick={() => setDialog({ kind: "new" })}
                size="small"
                startIcon={<Icon color="inherit" name="plus" size={16} />}
              >
                {t("gradeLevels.stages.new")}
              </Button>
            ) : undefined
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("gradeLevels.stages.filtersLabel")}
          onClear={() => {
            setSearch("")
            setStatus("")
            setPage(1)
          }}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchLabel={t("gradeLevels.stages.searchLabel")}
          searchPlaceholder={t("gradeLevels.stages.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setStatus((option?.value as AcademicCatalogStatus | undefined) ?? "")
              setPage(1)
            }}
            options={statusOptions}
            placeholder={t("academic.allStatuses")}
            size="small"
            title={t("academic.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("gradeLevels.noResults")}
          loading={!current}
          loadingMessage={t("gradeLevels.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicStage) => <Text fontSize="sm">{row.sortOrder}</Text>}
            field="sortOrder"
            header={t("gradeLevels.sortOrder")}
            width="1%"
          />
          <Table.Column
            body={(row: AcademicStage) => (
              <Text fontSize="sm" semibold>
                {row.name}
              </Text>
            )}
            field="name"
            header={t("gradeLevels.stages.stage")}
          />
          <Table.Column
            body={(row: AcademicStage) => (
              <Badge tone={catalogStatusTone(row.status)}>{catalogStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("gradeLevels.stages.filtersLabel")}
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
      {renderContent()}

      {dialog?.kind === "new" && <StageFormModal onClose={() => setDialog(null)} onSaved={afterChange} />}
      {dialog?.kind === "edit" && (
        <StageFormModal onClose={() => setDialog(null)} onSaved={afterChange} stage={dialog.stage} />
      )}
      {dialog?.kind === "newGrade" && (
        <GradeFormModal
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          stageId={dialog.stage.id}
          stages={stages}
        />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <CatalogStatusDialog
          action={dialog.kind}
          loadImpact={() => getAcademicStageImpact(dialog.stage.id, { showLoading: false })}
          name={dialog.stage.name}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          run={() =>
            dialog.kind === "activate"
              ? activateAcademicStage(dialog.stage.id, dialog.stage.version)
              : inactivateAcademicStage(dialog.stage.id, dialog.stage.version)
          }
          units={units}
        />
      )}
    </>
  )
}
