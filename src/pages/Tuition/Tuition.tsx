import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link, useSearchParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { FinanceTitle, FinanceTitleSearchParams, FinanceTitleSituation } from "@/models"
import { paths } from "@/routes/paths"
import { listFinanceTitles } from "@/services/financeLedger"
import { formatDate } from "@/utils/dates"

import { useFinanceAccess } from "../shared/finance/useFinanceAccess"
import { titleSituations, useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"

const pageSize = 20

type OverdueFilter = "" | "OVERDUE"

// The installments (titles) in reach (EPIC 8, Fatia 1): the Admin's whole institution, the units of a
// Financeiro or a Secretaria (who only reads). Read page by page, with filters by unit, situation and
// "overdue" (a condition of the date: from the day after the due date while something is owed, never a
// status). Opened from an enrollment, the list shows only that student's (`?studentId=`). Each row opens the
// title, with its obligation and payments.
export const Tuition = () => {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { units } = useFinanceAccess()
  const { competenceLabel, money, situationLabel, situationTone } = useFinanceLabels()

  const [unitId, setUnitId] = useState("")
  const [situation, setSituation] = useState<"" | FinanceTitleSituation>("")
  const [overdue, setOverdue] = useState<OverdueFilter>("")
  const [page, setPage] = useState(1)

  const studentId = Number(searchParams.get("studentId")) || undefined
  const studentName = searchParams.get("name")

  const params = useMemo<FinanceTitleSearchParams>(
    () => ({
      overdue: overdue === "OVERDUE" ? true : undefined,
      page: page - 1,
      situation: situation || undefined,
      size: pageSize,
      studentId,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [overdue, page, situation, studentId, unitId],
  )

  const { current, reload } = usePeopleList(listFinanceTitles, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = unitId !== "" || situation !== "" || overdue !== ""
  const unitName = (id: number) => units.find((unit) => unit.id === id)?.name ?? t("finance.unitNumber", { id })

  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const situationOptions: SelectOption[] = [
    { label: t("finance.titles.allSituations"), value: "" },
    ...titleSituations.map((value) => ({ label: situationLabel(value), value })),
  ]
  const overdueOptions: SelectOption[] = [
    { label: t("finance.titles.anyDue"), value: "" },
    { label: t("finance.titles.onlyOverdue"), value: "OVERDUE" },
  ]

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const clearFilters = () => {
    setUnitId("")
    setSituation("")
    setOverdue("")
    setPage(1)
  }

  const renderTitle = (row: FinanceTitle) => (
    <PersonCell>
      <Text
        as={Link}
        color="brand"
        fontSize="sm"
        to={generatePath(paths.tuitionTitle, { titleId: String(row.id) })}
        semibold
      >
        {t("finance.titles.installment", { number: row.installmentNo })}
      </Text>
      <Text color="secondary" fontSize="sm">
        {competenceLabel(row.competence)}
      </Text>
    </PersonCell>
  )

  const renderDue = (row: FinanceTitle) => (
    <PersonCell>
      <Text fontSize="sm">{formatDate(row.dueDate)}</Text>
      {row.overdue && (
        <span>
          <Badge tone="danger">{t("finance.titles.overdue")}</Badge>
        </span>
      )}
    </PersonCell>
  )

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("finance.titles.errorDescription")}
          errorTitle={t("finance.titles.errorTitle")}
          forbiddenDescription={t("finance.forbiddenDescription")}
          forbiddenTitle={t("finance.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters) {
      return (
        <StateMessage
          description={studentId ? t("finance.titles.emptyStudent") : t("finance.titles.emptyDescription")}
          icon="payments-outline"
          title={t("finance.titles.emptyTitle")}
        />
      )
    }

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={t("finance.titles.noResults")}
          loading={!current}
          loadingMessage={t("finance.titles.loading")}
          value={data?.items ?? []}
        >
          <Table.Column body={renderTitle} field="installmentNo" header={t("finance.titles.title")} />
          <Table.Column
            body={(row: FinanceTitle) => (
              <PersonCell>
                <Text fontSize="sm">{t("finance.studentNumber", { id: row.studentId })}</Text>
                <Text color="secondary" fontSize="sm">
                  {unitName(row.unitId)}
                </Text>
              </PersonCell>
            )}
            field="studentId"
            header={t("finance.titles.student")}
          />
          <Table.Column body={renderDue} field="dueDate" header={t("finance.titles.dueDate")} />
          <Table.Column
            body={(row: FinanceTitle) => (
              <PersonCell>
                <Text fontSize="sm">{money(row.amountCents)}</Text>
                <Text color="secondary" fontSize="sm">
                  {t("finance.titles.residual", { amount: money(row.residualCents) })}
                </Text>
              </PersonCell>
            )}
            field="amountCents"
            header={t("finance.titles.amount")}
          />
          <Table.Column
            body={(row: FinanceTitle) => (
              <Badge tone={situationTone(row.situation)}>{situationLabel(row.situation)}</Badge>
            )}
            field="situation"
            header={t("finance.titles.situation")}
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("finance.titles.filtersLabel")}
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
        description={t("finance.titles.description")}
        icon="payments-outline"
        title={t("shell.nav.tuition")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        <ListContent>
          {studentId && (
            <span style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: spacing[8] }}>
              <Text fontSize="sm">
                {studentName
                  ? t("finance.titles.ofStudent", { name: studentName })
                  : t("finance.titles.ofStudentNumber", { id: studentId })}
              </Text>
              <Button
                onClick={() => {
                  setSearchParams({})
                  setPage(1)
                }}
                size="small"
                variant="link"
              >
                {t("finance.titles.allStudents")}
              </Button>
            </span>
          )}
          <FilterBar
            clearLabel={t("userAccess.clearFilters")}
            collapseLabel={t("common.collapseFilters")}
            expandLabel={t("common.expandFilters")}
            hasActiveFilters={hasFilters}
            label={t("finance.titles.filtersLabel")}
            onClear={clearFilters}
            title={t("common.filters")}
          >
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
              options={unitOptions}
              placeholder={t("userAccess.allUnits")}
              size="small"
              title={t("finance.unit")}
              value={unitOptions.find((option) => option.value === unitId) ?? null}
            />
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) =>
                changeFilter(setSituation)((option?.value as FinanceTitleSituation | undefined) ?? "")
              }
              options={situationOptions}
              placeholder={t("finance.titles.allSituations")}
              size="small"
              title={t("finance.titles.situation")}
              value={situationOptions.find((option) => option.value === situation) ?? null}
            />
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => changeFilter(setOverdue)((option?.value as OverdueFilter | undefined) ?? "")}
              options={overdueOptions}
              placeholder={t("finance.titles.anyDue")}
              size="small"
              title={t("finance.titles.dueFilter")}
              value={overdueOptions.find((option) => option.value === overdue) ?? null}
            />
          </FilterBar>

          {renderContent()}
        </ListContent>
      </Card>
    </>
  )
}
