import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link, useNavigate } from "react-router-dom"

import { leavingAfterSave } from "@/components"
import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { AcademicClass, AcademicClassSearchParams, AcademicClassStatus } from "@/models"
import { paths } from "@/routes/paths"
import { listAcademicGrades, listAcademicStages, listAcademicSubjects } from "@/services/academicCatalog"
import { listAcademicClasses } from "@/services/academicClasses"
import { listAcademicPeriods } from "@/services/academicPeriods"

import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { ClassFormModal } from "./ClassFormModal"
import { type ClassStateAction, ClassStateDialog } from "./ClassStateDialog"

const pageSize = 20

const statuses: AcademicClassStatus[] = ["PREPARATION", "ACTIVE", "INACTIVE"]

type Dialog = { kind: "edit" | ClassStateAction; schoolClass: AcademicClass } | { kind: "new" } | null

// The classes (P04-S05): searched by code or name and filtered by unit, period and status. Each row shows
// the class's grade, where and when it is offered, its shift and capacity, its status and whether it is
// ready for enrollment (computed by the backend, never editable), with what is still missing without
// stopping it (a teacher). A class is created in preparation inside an active offer, then activated; the
// rows offer only what `eligibleActions` allows, and the name opens the class's detail. A Professor only
// reads, and only sees the classes where they teach.
export const Classes = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const units = useAcademicUnits()
  const { classStatusLabel, classStatusTone, pendencyLabel, shiftLabel } = useAcademicLabels(units)
  const periods = useAcademicDirectory(listAcademicPeriods)
  const grades = useAcademicDirectory(listAcademicGrades)
  const stages = useAcademicDirectory(listAcademicStages)
  const subjects = useAcademicDirectory(listAcademicSubjects)

  const [search, setSearch] = useState("")
  const [unitId, setUnitId] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [status, setStatus] = useState<"" | AcademicClassStatus>("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<AcademicClassSearchParams>(
    () => ({
      page: page - 1,
      periodId: periodId ? Number(periodId) : undefined,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "code",
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [debouncedSearch, page, periodId, status, unitId],
  )

  const { current, reload } = usePeopleList(listAcademicClasses, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || unitId !== "" || periodId !== "" || status !== ""

  const unitName = (id: number) => units.nameOf(id) ?? t("academic.unitNumber", { id })
  const periodName = (id: number) => periods.items.find((period) => period.id === id)?.name ?? ""
  const grade = (id: number) => grades.items.find((item) => item.id === id)
  const stageName = (id?: number) => stages.items.find((stage) => stage.id === id)?.name ?? ""
  const profilePath = (schoolClass: AcademicClass) =>
    generatePath(paths.classProfile, { classId: String(schoolClass.id) })

  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...units.units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const periodOptions: SelectOption[] = [
    { label: t("offers.allPeriods"), value: "" },
    ...periods.items.map((period) => ({ label: period.name, value: String(period.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("academic.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: classStatusLabel(value), value })),
  ]

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const renderActions = (schoolClass: AcademicClass) => {
    const items: ActionMenuItem[] = [
      {
        icon: "eye-outline",
        key: "open",
        label: t("classes.open"),
        onClick: () => navigate(profilePath(schoolClass)),
      },
    ]
    if (schoolClass.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("classes.edit"),
        onClick: () => setDialog({ kind: "edit", schoolClass }),
      })
    }
    if (schoolClass.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("classes.state.activate.action"),
        onClick: () => setDialog({ kind: "activate", schoolClass }),
      })
    }
    if (schoolClass.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("classes.state.inactivate.action"),
        onClick: () => setDialog({ kind: "inactivate", schoolClass }),
        tone: "danger",
      })
    }

    return <ActionMenu items={items} triggerLabel={t("classes.actionsFor", { name: schoolClass.name })} />
  }

  const renderReadiness = (schoolClass: AcademicClass) => (
    <PersonCell>
      <Text color={schoolClass.eligibleForEnrollment ? "success" : "secondary"} fontSize="sm">
        {schoolClass.eligibleForEnrollment ? t("classes.ready") : t("classes.notReady")}
      </Text>
      {schoolClass.pendencies.map((pendency) => (
        <Text key={pendency} color="warning" fontSize="sm">
          {pendencyLabel(pendency)}
        </Text>
      ))}
    </PersonCell>
  )

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("classes.errorDescription")}
          errorTitle={t("classes.errorTitle")}
          forbiddenDescription={t("classes.forbiddenDescription")}
          forbiddenTitle={t("classes.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={
            units.canManage ? <Button onClick={() => setDialog({ kind: "new" })}>{t("classes.new")}</Button> : undefined
          }
          description={units.canManage ? t("classes.emptyDescription") : t("classes.emptyReadOnly")}
          icon="class-outline"
          title={t("classes.emptyTitle")}
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
                {t("classes.new")}
              </Button>
            ) : undefined
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("classes.filtersLabel")}
          onClear={() => {
            setSearch("")
            setUnitId("")
            setPeriodId("")
            setStatus("")
            setPage(1)
          }}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("classes.searchLabel")}
          searchPlaceholder={t("classes.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("classes.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setPeriodId)(option?.value ?? "")}
            options={periodOptions}
            placeholder={t("offers.allPeriods")}
            size="small"
            title={t("classes.period")}
            value={periodOptions.find((option) => option.value === periodId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setStatus)((option?.value as AcademicClassStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("academic.allStatuses")}
            size="small"
            title={t("academic.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("classes.noResults")}
          loading={!current}
          loadingMessage={t("classes.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicClass) => (
              <PersonCell>
                <Text as={Link} color="brand" fontSize="sm" to={profilePath(row)} semibold>
                  {row.name}
                </Text>
                <Text color="secondary" fontSize="sm">
                  {row.code}
                </Text>
              </PersonCell>
            )}
            field="name"
            header={t("classes.class")}
          />
          <Table.Column
            body={(row: AcademicClass) => (
              <PersonCell>
                <Text fontSize="sm">{grade(row.gradeId)?.name ?? ""}</Text>
                <Text color="secondary" fontSize="sm">
                  {stageName(grade(row.gradeId)?.stageId)}
                </Text>
              </PersonCell>
            )}
            field="gradeId"
            header={t("classes.grade")}
          />
          <Table.Column
            body={(row: AcademicClass) => (
              <PersonCell>
                <Text fontSize="sm">{unitName(row.unitId)}</Text>
                <Text color="secondary" fontSize="sm">
                  {periodName(row.periodId)}
                </Text>
              </PersonCell>
            )}
            field="unitId"
            header={t("classes.where")}
          />
          <Table.Column
            body={(row: AcademicClass) => (
              <PersonCell>
                <Text fontSize="sm">{shiftLabel(row.shift)}</Text>
                <Text color="secondary" fontSize="sm">
                  {t("classes.capacityValue", { count: row.capacity })}
                </Text>
              </PersonCell>
            )}
            field="shift"
            header={t("classes.shiftAndCapacity")}
          />
          <Table.Column
            body={(row: AcademicClass) => (
              <Badge tone={classStatusTone(row.status)}>{classStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column body={renderReadiness} field="eligibleForEnrollment" header={t("classes.readiness")} />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("classes.filtersLabel")}
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
        description={t("academic.descriptions.classes")}
        icon="class-outline"
        title={t("shell.nav.classes")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {(dialog?.kind === "new" || dialog?.kind === "edit") && (
        <ClassFormModal
          grades={grades.items}
          onClose={() => setDialog(null)}
          onSaved={(saved) => {
            // A new class opens its detail; an edition goes back to the list.
            if (dialog.kind === "new" && saved) {
              navigate(profilePath(saved), { state: leavingAfterSave })
              return
            }
            afterChange()
          }}
          periods={periods.items}
          schoolClass={dialog.kind === "edit" ? dialog.schoolClass : undefined}
          stages={stages.items}
          subjects={subjects.items}
          units={units}
        />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <ClassStateDialog
          action={dialog.kind}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          schoolClass={dialog.schoolClass}
        />
      )}
    </>
  )
}
