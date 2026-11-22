import { type FormEvent, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { PeopleSearchItem, PeopleSearchParams, PersonStatus, PersonType } from "@/models"
import { searchPeople } from "@/services/people"

import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { usePeopleList } from "../shared/people/usePeopleList"
import { useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessLines, ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"

const pageSize = 20

const statuses: PersonStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"]

const types: PersonType[] = ["STUDENT", "GUARDIAN"]

// The global people search (P03-S01): finds students and guardians before a registration, so the right
// record is reused instead of a duplicate being created. Nothing is read until a term is searched (by
// name, document, e-mail, nickname or student code); the filters (type, status, unit) and the pages then
// search the same term again, and an answer of an older search is dropped. It only finds people in the
// operator's reach, so "nobody found" never means the person doesn't exist in the institution. Each row
// shows what matched. The search is limited to 30 a minute per person (shared with the people lists).
export const PeopleSearch = () => {
  const { t } = useTranslation()
  const unitDirectory = useUnitDirectory()
  const { unitOptionLabel } = useAccessLabels(unitDirectory.units)
  const { personStatusLabel, personStatusTone } = usePeopleLabels()

  const [term, setTerm] = useState("")
  const [searched, setSearched] = useState<string | null>(null)
  const [type, setType] = useState<"" | PersonType>("")
  const [status, setStatus] = useState<"" | PersonStatus>("")
  const [unitId, setUnitId] = useState("")
  const [page, setPage] = useState(1)

  const params = useMemo<PeopleSearchParams | null>(() => {
    if (searched === null) return null

    return {
      direction: "asc",
      page: page - 1,
      q: searched,
      size: pageSize,
      sortBy: "fullName",
      status: status || undefined,
      type: type || "ANY",
      unitId: unitId ? Number(unitId) : undefined,
    }
  }, [page, searched, status, type, unitId])

  const { current, reload } = usePeopleList(searchPeople, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = type !== "" || status !== "" || unitId !== ""

  const typeOptions: SelectOption[] = [
    { label: t("peopleSearch.allTypes"), value: "" },
    ...types.map((value) => ({ label: t(`peopleSearch.types.${value}`), value })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("people.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: personStatusLabel(value), value })),
  ]
  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...unitDirectory.units.map((unit) => ({ label: unitOptionLabel(unit), value: String(unit.id) })),
  ]

  // A filter searches the same term again, from the first page.
  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (term.trim() === "") return

    setSearched(term.trim())
    setPage(1)
  }

  // Back to the start: nothing searched, nothing shown.
  const clear = () => {
    setTerm("")
    setSearched(null)
    setType("")
    setStatus("")
    setUnitId("")
    setPage(1)
  }

  const renderPerson = (row: PeopleSearchItem) => (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {row.fullName}
      </Text>
      {row.nickname && (
        <Text color="secondary" fontSize="sm">
          {row.nickname}
        </Text>
      )}
    </PersonCell>
  )

  // Each role the person has in the registry (a person may be both), with its own status.
  const renderRecords = (row: PeopleSearchItem) => {
    const records = types
      .filter((value) => row.types.includes(value))
      .map((value) => ({ status: value === "STUDENT" ? row.studentStatus : row.guardianStatus, type: value }))

    return (
      <AccessLines>
        {records.map((record) => (
          <span key={record.type}>
            {record.status ? (
              <Badge tone={personStatusTone(record.status)}>
                {t("peopleSearch.record", {
                  status: personStatusLabel(record.status),
                  type: t(`peopleSearch.types.${record.type}`),
                })}
              </Badge>
            ) : (
              <Text fontSize="sm">{t(`peopleSearch.types.${record.type}`)}</Text>
            )}
          </span>
        ))}
      </AccessLines>
    )
  }

  const renderIdentifiers = (row: PeopleSearchItem) => {
    const identifiers = [row.studentCode, row.maskedDocument].filter((value) => value)
    if (identifiers.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          {t("common.notInformed")}
        </Text>
      )
    }

    return (
      <AccessLines>
        {identifiers.map((value) => (
          <Text key={value} fontSize="sm">
            {value}
          </Text>
        ))}
      </AccessLines>
    )
  }

  const renderUnits = (row: PeopleSearchItem) => (
    <Text color={row.units.length === 0 ? "secondary" : "default"} fontSize="sm">
      {row.units.length === 0 ? t("common.notInformed") : row.units.map((unit) => unit.name).join(", ")}
    </Text>
  )

  const renderMatch = (row: PeopleSearchItem) => (
    <Text fontSize="sm">{row.matchedBy.map((match) => t(`peopleSearch.matchedBy.${match}`)).join(", ")}</Text>
  )

  const renderResults = () => {
    if (searched === null) {
      return (
        <StateMessage
          description={t("peopleSearch.idleDescription")}
          icon="search-outline"
          title={t("peopleSearch.idleTitle")}
        />
      )
    }

    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("peopleSearch.errorDescription")}
          errorTitle={t("peopleSearch.errorTitle")}
          forbiddenDescription={t("peopleSearch.forbiddenDescription")}
          forbiddenTitle={t("peopleSearch.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={t("peopleSearch.noResults")}
          loading={!current}
          loadingMessage={t("peopleSearch.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderPerson} field="fullName" header={t("peopleSearch.person")} />
          <Table.Column body={renderRecords} field="types" header={t("peopleSearch.records")} />
          <Table.Column body={renderIdentifiers} field="maskedDocument" header={t("peopleSearch.identifiers")} />
          <Table.Column body={renderUnits} field="units" header={t("peopleSearch.units")} />
          <Table.Column body={renderMatch} field="matchedBy" header={t("peopleSearch.match")} />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("peopleSearch.filtersLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={data.totalPages}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PageHeader
        description={t("peopleSearch.description")}
        icon="search-outline"
        title={t("shell.nav.peopleSearch")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        <ListContent>
          <form onSubmit={search}>
            <FilterBar
              actions={
                <Button
                  disabled={term.trim() === ""}
                  size="small"
                  startIcon={<Icon color="inherit" name="search-outline" size={16} />}
                  type="submit"
                >
                  {t("peopleSearch.search")}
                </Button>
              }
              clearLabel={t("userAccess.clearFilters")}
              collapseLabel={t("common.collapseFilters")}
              expandLabel={t("common.expandFilters")}
              hasActiveFilters={hasFilters || term !== "" || searched !== null}
              label={t("peopleSearch.filtersLabel")}
              onClear={clear}
              onSearchChange={setTerm}
              searchLabel={t("peopleSearch.searchLabel")}
              searchPlaceholder={t("peopleSearch.searchPlaceholder")}
              searchValue={term}
              title={t("common.filters")}
            >
              <Select
                noOptionsMessage={t("common.noOptions")}
                onChange={(option) => changeFilter(setType)((option?.value as PersonType | undefined) ?? "")}
                options={typeOptions}
                placeholder={t("peopleSearch.allTypes")}
                size="small"
                title={t("peopleSearch.type")}
                value={typeOptions.find((option) => option.value === type) ?? null}
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
              <Select
                noOptionsMessage={t("common.noOptions")}
                onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
                options={unitOptions}
                placeholder={t("userAccess.allUnits")}
                size="small"
                title={t("userAccess.unit")}
                value={unitOptions.find((option) => option.value === unitId) ?? null}
              />
            </FilterBar>
          </form>

          {renderResults()}
        </ListContent>
      </Card>
    </>
  )
}
