import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate } from "react-router-dom"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { Enrollment, EnrollmentSearchParams, EnrollmentStatus } from "@/models"
import { paths } from "@/routes/paths"
import { listEnrollments } from "@/services/enrollments"

import { useEnrollmentAccess } from "../shared/enrollments/useEnrollmentAccess"
import {
  enrollmentFilterStatuses,
  preparationStatuses,
  useEnrollmentLabels,
} from "../shared/enrollments/useEnrollmentLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { NewEnrollmentModal } from "./NewEnrollmentModal"

const pageSize = 20

// The enrollments in reach (JLM-339): the Admin's whole institution, the units of a Secretaria, a
// Financeiro or a Coordenação. Read page by page, the most recently changed first, with a search by the
// student's name or code and filters by unit and status (the abandoned preparations only when asked
// for). A preparation, a confirmed enrollment and an abandoned one are told apart by their status, and a
// preparation shows how many pendencies it still has. Changing a filter clears the rows at once. The
// Admin and the Secretaria start a preparation here; opening one resumes it.
export const Enrollments = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { canOperate, operableUnits, units } = useEnrollmentAccess()
  const { formatMoment, statusLabel, statusTone } = useEnrollmentLabels()

  const [search, setSearch] = useState("")
  const [unitId, setUnitId] = useState("")
  const [status, setStatus] = useState<"" | EnrollmentStatus>("")
  const [page, setPage] = useState(1)
  const [isCreating, setIsCreating] = useState(false)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<EnrollmentSearchParams>(
    () => ({
      direction: "desc",
      page: page - 1,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "updatedAt",
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [debouncedSearch, page, status, unitId],
  )

  const { current, reload } = usePeopleList(listEnrollments, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || unitId !== "" || status !== ""
  const canCreate = canOperate && operableUnits.length > 0

  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("enrollments.allStatuses"), value: "" },
    ...enrollmentFilterStatuses.map((value) => ({ label: statusLabel(value), value })),
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
    setUnitId("")
    setStatus("")
    setPage(1)
  }

  const openEnrollment = (row: Enrollment) =>
    navigate(generatePath(paths.enrollmentProfile, { enrollmentId: String(row.id) }))

  const renderStudent = (row: Enrollment) => (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {row.student.name}
      </Text>
      {row.student.code && (
        <Text color="secondary" fontSize="sm">
          {row.student.code}
        </Text>
      )}
    </PersonCell>
  )

  // What a preparation still lacks; nothing for an enrollment out of preparation.
  const renderPendencies = (row: Enrollment) => {
    if (!preparationStatuses.includes(row.status)) return null
    if (row.pendencies.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("enrollments.noPendencies")}
        </Text>
      )
    }

    return (
      <Text color="warning" fontSize="sm">
        {t("enrollments.pendencyCount", { count: row.pendencies.length })}
      </Text>
    )
  }

  const newButton = (
    <Button
      onClick={() => setIsCreating(true)}
      size="small"
      startIcon={<Icon color="inherit" name="user-add-outline" size={16} />}
    >
      {t("enrollments.newEnrollment")}
    </Button>
  )

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("enrollments.errorDescription")}
          errorTitle={t("enrollments.errorTitle")}
          forbiddenDescription={t("enrollments.forbiddenDescription")}
          forbiddenTitle={t("enrollments.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={canCreate ? newButton : undefined}
          description={canCreate ? t("enrollments.emptyDescription") : t("enrollments.emptyReadOnly")}
          icon="file-outline"
          title={t("enrollments.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={canCreate ? newButton : undefined}
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("enrollments.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("enrollments.searchLabel")}
          searchPlaceholder={t("enrollments.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("enrollments.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setStatus)((option?.value as EnrollmentStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("enrollments.allStatuses")}
            size="small"
            title={t("enrollments.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("enrollments.noResults")}
          loading={!current}
          loadingMessage={t("enrollments.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderStudent} field="student" header={t("enrollments.student")} />
          <Table.Column
            body={(row: Enrollment) => <Text fontSize="sm">{row.unitName ?? t("common.notInformed")}</Text>}
            field="unitName"
            header={t("enrollments.unit")}
          />
          <Table.Column
            body={(row: Enrollment) => <Badge tone={statusTone(row.status)}>{statusLabel(row.status)}</Badge>}
            field="status"
            header={t("enrollments.status")}
          />
          <Table.Column body={renderPendencies} field="pendencies" header={t("enrollments.pendencies")} />
          <Table.Column
            body={(row: Enrollment) => <Text fontSize="sm">{formatMoment(row.updatedAt)}</Text>}
            field="updatedAt"
            header={t("enrollments.updatedAt")}
          />
          <Table.Column
            align="right"
            body={(row: Enrollment) => (
              <ActionMenu
                items={[
                  {
                    icon: "eye-outline",
                    key: "open",
                    label: preparationStatuses.includes(row.status) ? t("enrollments.resume") : t("enrollments.open"),
                    onClick: () => openEnrollment(row),
                  },
                ]}
                triggerLabel={t("enrollments.actionsFor", { name: row.student.name })}
              />
            )}
            field="id"
            header={t("enrollments.actions")}
            width="1%"
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("enrollments.filtersLabel")}
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
      <PageHeader description={t("enrollments.description")} icon="file-outline" title={t("shell.nav.enrollments")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {isCreating && <NewEnrollmentModal onClose={() => setIsCreating(false)} units={operableUnits} />}
    </>
  )
}
