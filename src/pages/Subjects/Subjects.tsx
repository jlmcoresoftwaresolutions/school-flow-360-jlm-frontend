import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useDebouncedValue } from "@/hooks"
import type { AcademicCatalogSearchParams, AcademicCatalogStatus, AcademicSubject } from "@/models"
import {
  activateAcademicSubject,
  getAcademicSubjectImpact,
  inactivateAcademicSubject,
  listAcademicSubjects,
} from "@/services/academicCatalog"

import { CatalogStatusDialog } from "../shared/academic/CatalogStatusDialog"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { SubjectFormModal } from "./SubjectFormModal"

const pageSize = 20

const statuses: AcademicCatalogStatus[] = ["ACTIVE", "INACTIVE"]

type Dialog = { kind: "activate" | "edit" | "inactivate"; subject: AcademicSubject } | { kind: "new" } | null

// The subjects of the institution (P04-S04), reused by the offers of each unit and period: searched by
// code or name (without accents) and filtered by status. Each one is edited, or inactivated (only
// without active offers, classes or teacher links that use it) and reactivated, as `eligibleActions`
// allows; an inactive subject is never offered for a new link. A Professor only reads.
export const Subjects = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
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
      sortBy: "name",
      status: status || undefined,
    }),
    [debouncedSearch, page, status],
  )

  const { current, reload } = usePeopleList(listAcademicSubjects, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = debouncedSearch !== "" || status !== ""
  const statusOptions: SelectOption[] = [
    { label: t("academic.allStatuses"), value: "" },
    ...statuses.map((value) => ({ label: catalogStatusLabel(value), value })),
  ]

  const afterChange = () => {
    setDialog(null)
    reload()
  }

  const renderActions = (subject: AcademicSubject) => {
    const items: ActionMenuItem[] = []
    if (subject.eligibleActions.includes("EDIT")) {
      items.push({
        icon: "pen-outline",
        key: "edit",
        label: t("subjects.edit"),
        onClick: () => setDialog({ kind: "edit", subject }),
      })
    }
    if (subject.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("academic.catalogStatus.activate.action"),
        onClick: () => setDialog({ kind: "activate", subject }),
      })
    }
    if (subject.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("academic.catalogStatus.inactivate.action"),
        onClick: () => setDialog({ kind: "inactivate", subject }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("subjects.actionsFor", { name: subject.name })} />
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("subjects.errorDescription")}
          errorTitle={t("subjects.errorTitle")}
          forbiddenDescription={t("subjects.forbiddenDescription")}
          forbiddenTitle={t("subjects.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters && search.trim() === "") {
      return (
        <StateMessage
          action={
            units.canManage ? (
              <Button onClick={() => setDialog({ kind: "new" })}>{t("subjects.new")}</Button>
            ) : undefined
          }
          description={units.canManage ? t("subjects.emptyDescription") : t("subjects.emptyReadOnly")}
          icon="book-outline"
          title={t("subjects.emptyTitle")}
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
                {t("subjects.new")}
              </Button>
            ) : undefined
          }
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters || search !== ""}
          label={t("subjects.filtersLabel")}
          onClear={() => {
            setSearch("")
            setStatus("")
            setPage(1)
          }}
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          searchLabel={t("subjects.searchLabel")}
          searchPlaceholder={t("subjects.searchPlaceholder")}
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
          emptyMessage={t("subjects.noResults")}
          loading={!current}
          loadingMessage={t("subjects.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicSubject) => <Text fontSize="sm">{row.code}</Text>}
            field="code"
            header={t("subjects.code")}
          />
          <Table.Column
            body={(row: AcademicSubject) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {row.name}
                </Text>
                {row.description && (
                  <Text color="secondary" fontSize="sm">
                    {row.description}
                  </Text>
                )}
              </PersonCell>
            )}
            field="name"
            header={t("subjects.subject")}
          />
          <Table.Column
            body={(row: AcademicSubject) => (
              <Badge tone={catalogStatusTone(row.status)}>{catalogStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("subjects.filtersLabel")}
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
        description={t("academic.descriptions.subjects")}
        icon="book-outline"
        title={t("shell.nav.subjects")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {dialog?.kind === "new" && <SubjectFormModal onClose={() => setDialog(null)} onSaved={afterChange} />}
      {dialog?.kind === "edit" && (
        <SubjectFormModal onClose={() => setDialog(null)} onSaved={afterChange} subject={dialog.subject} />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <CatalogStatusDialog
          action={dialog.kind}
          loadImpact={() => getAcademicSubjectImpact(dialog.subject.id, { showLoading: false })}
          name={dialog.subject.name}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          run={() =>
            dialog.kind === "activate"
              ? activateAcademicSubject(dialog.subject.id, dialog.subject.version)
              : inactivateAcademicSubject(dialog.subject.id, dialog.subject.version)
          }
          units={units}
        />
      )}
    </>
  )
}
