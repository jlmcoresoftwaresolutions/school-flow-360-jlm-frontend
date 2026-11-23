import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { useDebouncedValue } from "@/hooks"
import type { AcademicCatalogStatus, AcademicGrade, AcademicGradeSearchParams, AcademicStage } from "@/models"
import {
  activateAcademicGrade,
  getAcademicGradeImpact,
  inactivateAcademicGrade,
  listAcademicGrades,
} from "@/services/academicCatalog"

import { CatalogStatusDialog } from "../shared/academic/CatalogStatusDialog"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import type { AcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { GradeFormModal } from "./GradeFormModal"

export type GradesTabProps = {
  // Every stage: the grades' stage names and the stage filter.
  stages: AcademicStage[]
  units: AcademicUnits
}

const pageSize = 20

type Dialog = { grade: AcademicGrade; kind: "activate" | "edit" | "inactivate" } | { kind: "new" } | null

const statuses: AcademicCatalogStatus[] = ["ACTIVE", "INACTIVE"]

// The grades of the institution, each of one stage, filtered by stage, name and status: each one is
// edited (its stage never changes), or inactivated (only without active offers) and reactivated (only
// with its stage active), as `eligibleActions` allows.
export const GradesTab = (props: GradesTabProps) => {
  const { stages, units } = props

  const { t } = useTranslation()
  const { catalogStatusLabel, catalogStatusTone } = useAcademicLabels(units)

  const [search, setSearch] = useState("")
  const [stageId, setStageId] = useState("")
  const [status, setStatus] = useState<"" | AcademicCatalogStatus>("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<AcademicGradeSearchParams>(
    () => ({
      page: page - 1,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "sortOrder",
      stageId: stageId ? Number(stageId) : undefined,
      status: status || undefined,
    }),
    [debouncedSearch, page, stageId, status],
  )

  const { current, reload } = usePeopleList(listAcademicGrades, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || stageId !== "" || status !== ""
  const stageName = (id: number) => stages.find((stage) => stage.id === id)?.name ?? ""
  const stageOptions: SelectOption[] = [
    { label: t("gradeLevels.grades.allStages"), value: "" },
    ...stages.map((stage) => ({ label: stage.name, value: String(stage.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("academic.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: catalogStatusLabel(value), value })),
  ]

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const renderActions = (grade: AcademicGrade) => {
    const items: ActionMenuItem[] = []
    if (grade.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("gradeLevels.edit"),
        onClick: () => setDialog({ grade, kind: "edit" }),
      })
    }
    if (grade.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("academic.catalogStatus.activate.action"),
        onClick: () => setDialog({ grade, kind: "activate" }),
      })
    }
    if (grade.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("academic.catalogStatus.inactivate.action"),
        onClick: () => setDialog({ grade, kind: "inactivate" }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("gradeLevels.actionsFor", { name: grade.name })} />
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("gradeLevels.grades.errorDescription")}
          errorTitle={t("gradeLevels.grades.errorTitle")}
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
            units.canManage && stages.length > 0 ? (
              <Button onClick={() => setDialog({ kind: "new" })}>{t("gradeLevels.grades.new")}</Button>
            ) : undefined
          }
          description={
            stages.length === 0 ? t("gradeLevels.grades.emptyNoStages") : t("gradeLevels.grades.emptyDescription")
          }
          icon="school-outline"
          title={t("gradeLevels.grades.emptyTitle")}
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
                {t("gradeLevels.grades.new")}
              </Button>
            ) : undefined
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("gradeLevels.grades.filtersLabel")}
          onClear={() => {
            setSearch("")
            setStageId("")
            setStatus("")
            setPage(1)
          }}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchLabel={t("gradeLevels.grades.searchLabel")}
          searchPlaceholder={t("gradeLevels.grades.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => {
              setStageId(option?.value ?? "")
              setPage(1)
            }}
            options={stageOptions}
            placeholder={t("gradeLevels.grades.allStages")}
            size="small"
            title={t("gradeLevels.grades.stage")}
            value={stageOptions.find((option) => option.value === stageId) ?? null}
          />
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
            body={(row: AcademicGrade) => <Text fontSize="sm">{row.sortOrder}</Text>}
            field="sortOrder"
            header={t("gradeLevels.sortOrder")}
            width="1%"
          />
          <Table.Column
            body={(row: AcademicGrade) => (
              <Text fontSize="sm" semibold>
                {row.name}
              </Text>
            )}
            field="name"
            header={t("gradeLevels.grades.grade")}
          />
          <Table.Column
            body={(row: AcademicGrade) => <Text fontSize="sm">{stageName(row.stageId)}</Text>}
            field="stageId"
            header={t("gradeLevels.grades.stage")}
          />
          <Table.Column
            body={(row: AcademicGrade) => (
              <Badge tone={catalogStatusTone(row.status)}>{catalogStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("gradeLevels.grades.filtersLabel")}
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

      {dialog?.kind === "new" && (
        <GradeFormModal onClose={() => setDialog(null)} onSaved={afterChange} stages={stages} />
      )}
      {dialog?.kind === "edit" && (
        <GradeFormModal grade={dialog.grade} onClose={() => setDialog(null)} onSaved={afterChange} stages={stages} />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <CatalogStatusDialog
          action={dialog.kind}
          loadImpact={() => getAcademicGradeImpact(dialog.grade.id, { showLoading: false })}
          name={dialog.grade.name}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          run={() =>
            dialog.kind === "activate"
              ? activateAcademicGrade(dialog.grade.id, dialog.grade.version)
              : inactivateAcademicGrade(dialog.grade.id, dialog.grade.version)
          }
          units={units}
        />
      )}
    </>
  )
}
