import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate } from "react-router-dom"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { GuardianSearchParams, GuardianSummary, PersonStatus } from "@/models"
import { paths } from "@/routes/paths"
import { listGuardians } from "@/services/guardians"
import { defaultCountry } from "@/utils/countries"
import { formatPhoneForDisplay } from "@/utils/phone"

import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { usePeopleList } from "../shared/people/usePeopleList"
import { PersonSummary } from "../shared/userAccess/PersonSummary"
import { useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { ListContent } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"

const pageSize = 20

const statuses: PersonStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"]

// The guardians in the operator's reach (an Admin: the whole institution; a Secretaria: the guardians
// of its units, which follow the units of their students), read from the backend page by page, with a
// search by name, nickname, e-mail or document and filters by unit and registration status. The
// document and the e-mail come masked; the students counted are only the ones the operator may see.
// Changing a filter clears the rows at once. The list shares the people search limit (30 a minute).
export const Guardians = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const unitDirectory = useUnitDirectory()
  const { unitOptionLabel } = useAccessLabels(unitDirectory.units)
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const [search, setSearch] = useState("")
  const [unitId, setUnitId] = useState("")
  const [status, setStatus] = useState<"" | PersonStatus>("")
  const [page, setPage] = useState(1)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<GuardianSearchParams>(
    () => ({
      direction: "asc",
      page: page - 1,
      q: debouncedSearch || undefined,
      size: pageSize,
      sortBy: "fullName",
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [debouncedSearch, page, status, unitId],
  )

  const { current, reload } = usePeopleList(listGuardians, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || unitId !== "" || status !== ""

  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...unitDirectory.units.map((unit) => ({ label: unitOptionLabel(unit), value: String(unit.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("people.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: personStatusLabel(value), value })),
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

  const renderStudents = (row: GuardianSummary) => {
    if (row.activeStudents === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("guardians.noStudents")}
        </Text>
      )
    }

    return <Text fontSize="sm">{t("guardians.activeStudents", { count: row.activeStudents })}</Text>
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("guardians.errorDescription")}
          errorTitle={t("guardians.errorTitle")}
          forbiddenDescription={t("guardians.forbiddenDescription")}
          forbiddenTitle={t("guardians.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(paths.guardianNew)}>{t("guardians.newGuardian")}</Button>}
          description={t("guardians.emptyDescription")}
          icon="users-outline"
          title={t("guardians.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={
            <Button
              onClick={() => navigate(paths.guardianNew)}
              size="small"
              startIcon={<Icon color="inherit" name="user-add-outline" size={16} />}
            >
              {t("guardians.newGuardian")}
            </Button>
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("guardians.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("guardians.searchLabel")}
          searchPlaceholder={t("guardians.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("userAccess.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setStatus)((option?.value as PersonStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("people.allStatuses")}
            size="small"
            title={t("people.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("guardians.noResults")}
          loading={!current}
          loadingMessage={t("guardians.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: GuardianSummary) => <PersonSummary email={row.maskedEmail} fullName={row.fullName} />}
            field="fullName"
            header={t("guardians.guardian")}
          />
          <Table.Column
            body={(row: GuardianSummary) => <Text fontSize="sm">{row.maskedDocument ?? t("common.notInformed")}</Text>}
            field="maskedDocument"
            header={t("guardians.document")}
          />
          <Table.Column
            body={(row: GuardianSummary) => (
              <Text fontSize="sm">
                {row.phone ? formatPhoneForDisplay(row.phone, defaultCountry) : t("common.notInformed")}
              </Text>
            )}
            field="phone"
            header={t("guardians.phone")}
          />
          <Table.Column body={renderStudents} field="activeStudents" header={t("guardians.students")} />
          <Table.Column
            body={(row: GuardianSummary) => (
              <Badge tone={personStatusTone(row.status)}>{personStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("people.status")}
          />
          <Table.Column
            align="right"
            body={(row: GuardianSummary) => (
              <ActionMenu
                items={[
                  {
                    icon: "eye-outline",
                    key: "view",
                    label: t("guardians.viewProfile"),
                    onClick: () => navigate(generatePath(paths.guardianProfile, { guardianId: String(row.id) })),
                  },
                ]}
                triggerLabel={t("guardians.actionsFor", { name: row.fullName })}
              />
            )}
            field="id"
            header={t("guardians.actions")}
            width="1%"
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("guardians.filtersLabel")}
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
      <PageHeader description={t("guardians.description")} icon="users-outline" title={t("shell.nav.guardians")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>
    </>
  )
}
