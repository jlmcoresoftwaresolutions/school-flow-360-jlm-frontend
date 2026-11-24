import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, useNavigate } from "react-router-dom"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue, useSignedInUser } from "@/hooks"
import type { PersonStatus, StudentSearchParams, StudentSummary } from "@/models"
import { paths } from "@/routes/paths"
import { listStudents } from "@/services/students"
import { hasAnyRole } from "@/utils/access"

import { BadgeGroup } from "../shared/people/people.styles"
import { PeopleListError } from "../shared/people/PeopleListError"
import { AnonymizedBadge } from "../shared/people/privacy/AnonymizedBadge"
import { usePeopleLabels } from "../shared/people/usePeopleLabels"
import { usePeopleList } from "../shared/people/usePeopleList"
import { useAccessLabels } from "../shared/userAccess/useAccessLabels"
import { AccessLines, ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { useUnitDirectory } from "../shared/userAccess/useUnitDirectory"
import { DraftCleanupDialog } from "./DraftCleanupDialog"

const pageSize = 20

const statuses: PersonStatus[] = ["DRAFT", "ACTIVE", "INACTIVE"]

// The students in the operator's reach (an Admin: the whole institution; a Secretaria: its units), read
// from the backend page by page, with a search by name, code, nickname, e-mail or document and filters
// by reference unit and registration status. Each row shows the registration code (not an enrollment
// number), the reference unit, the active guardians and the status. Changing a filter clears the rows
// at once, so data from another context is never left on screen. The list shares the people search
// limit (30 a minute), and says so when it is reached.
export const Students = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const unitDirectory = useUnitDirectory()
  const { unitOptionLabel } = useAccessLabels(unitDirectory.units)
  const { personStatusLabel, personStatusTone } = usePeopleLabels()
  const signedIn = useSignedInUser()

  const [search, setSearch] = useState("")
  const [unitId, setUnitId] = useState("")
  const [status, setStatus] = useState<"" | PersonStatus>("")
  const [page, setPage] = useState(1)
  const [isCleaningDrafts, setIsCleaningDrafts] = useState(false)

  const debouncedSearch = useDebouncedValue(search.trim())

  const params = useMemo<StudentSearchParams>(
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

  const { current, reload } = usePeopleList(listStudents, params)

  const data = current && "data" in current ? current.data : null
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
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

  const renderStudent = (row: StudentSummary) => (
    <PersonCell>
      <Text fontSize="sm" semibold>
        {row.fullName}
      </Text>
      <Text color="secondary" fontSize="sm">
        {row.studentCode}
      </Text>
    </PersonCell>
  )

  // How many active guardians, with a warning when there is none (a draft can't be activated without
  // one) or when none of them is financially responsible.
  const renderGuardians = (row: StudentSummary) => {
    if (row.activeGuardians === 0) {
      return (
        <Text color="warning" fontSize="sm">
          {t("students.noGuardian")}
        </Text>
      )
    }

    return (
      <AccessLines>
        <Text fontSize="sm">{t("students.activeGuardians", { count: row.activeGuardians })}</Text>
        {!row.hasFinancialGuardian && (
          <Text color="secondary" fontSize="sm">
            {t("students.noFinancialGuardian")}
          </Text>
        )}
      </AccessLines>
    )
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("students.errorDescription")}
          errorTitle={t("students.errorTitle")}
          forbiddenDescription={t("students.forbiddenDescription")}
          forbiddenTitle={t("students.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={<Button onClick={() => navigate(paths.studentNew)}>{t("students.newStudent")}</Button>}
          description={t("students.emptyDescription")}
          icon="school-outline"
          title={t("students.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={
            <>
              {isAdmin && (
                <Button onClick={() => setIsCleaningDrafts(true)} size="small" variant="outlined">
                  {t("peoplePrivacy.draftCleanup.action")}
                </Button>
              )}
              <Button
                onClick={() => navigate(paths.studentNew)}
                size="small"
                startIcon={<Icon color="inherit" name="user-add-outline" size={16} />}
              >
                {t("students.newStudent")}
              </Button>
            </>
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("students.filtersLabel")}
          onClear={clearFilters}
          onSearchChange={changeFilter(setSearch)}
          searchLabel={t("students.searchLabel")}
          searchPlaceholder={t("students.searchPlaceholder")}
          searchValue={search}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("students.referenceUnit")}
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
          emptyMessage={t("students.noResults")}
          loading={!current}
          loadingMessage={t("students.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderStudent} field="fullName" header={t("students.student")} />
          <Table.Column
            body={(row: StudentSummary) => (
              <Text fontSize="sm">{row.referenceUnit?.name ?? t("common.notInformed")}</Text>
            )}
            field="referenceUnit"
            header={t("students.referenceUnit")}
          />
          <Table.Column body={renderGuardians} field="activeGuardians" header={t("students.guardians")} />
          <Table.Column
            body={(row: StudentSummary) => (
              <BadgeGroup>
                <Badge tone={personStatusTone(row.status)}>{personStatusLabel(row.status)}</Badge>
                {row.anonymized && <AnonymizedBadge />}
              </BadgeGroup>
            )}
            field="status"
            header={t("people.status")}
          />
          <Table.Column
            align="right"
            body={(row: StudentSummary) => (
              <ActionMenu
                items={[
                  {
                    icon: "eye-outline",
                    key: "view",
                    label: t("students.viewProfile"),
                    onClick: () => navigate(generatePath(paths.studentProfile, { studentId: String(row.id) })),
                  },
                ]}
                triggerLabel={t("students.actionsFor", { name: row.fullName })}
              />
            )}
            field="id"
            header={t("students.actions")}
            width="1%"
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("students.filtersLabel")}
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
      <PageHeader description={t("students.description")} icon="school-outline" title={t("shell.nav.students")} />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {isCleaningDrafts && (
        <DraftCleanupDialog
          onClose={() => setIsCleaningDrafts(false)}
          onDone={() => {
            setIsCleaningDrafts(false)
            reload()
          }}
        />
      )}
    </>
  )
}
