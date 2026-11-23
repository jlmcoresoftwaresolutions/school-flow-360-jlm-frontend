import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { ActionMenuItem, SelectOption } from "@/ds-components/molecules"
import { ActionMenu, PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { AcademicCatalogStatus, AcademicOffer, AcademicOfferSearchParams } from "@/models"
import {
  activateAcademicOffer,
  inactivateAcademicOffer,
  listAcademicGrades,
  listAcademicOffers,
  listAcademicStages,
  listAcademicSubjects,
} from "@/services/academicCatalog"
import { listAcademicPeriods } from "@/services/academicPeriods"

import { CatalogStatusDialog } from "../shared/academic/CatalogStatusDialog"
import { useAcademicDirectory } from "../shared/academic/useAcademicDirectory"
import { useAcademicLabels } from "../shared/academic/useAcademicLabels"
import { useAcademicUnits } from "../shared/academic/useAcademicUnits"
import { PeopleListError } from "../shared/people/PeopleListError"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { OfferFormModal } from "./OfferFormModal"
import { OfferSubjectsModal } from "./OfferSubjectsModal"

const pageSize = 20

const statuses: AcademicCatalogStatus[] = ["ACTIVE", "INACTIVE"]

type Dialog = { kind: "activate" | "inactivate" | "subjects"; offer: AcademicOffer } | { kind: "new" } | null

// The offers (P04-S03): each a grade of the catalog offered in a unit and a period, with the subjects it
// teaches - what a class is created on. Filtered by unit, period and status. Each row offers only what
// `eligibleActions` allows: choosing its subjects, inactivating it (only without classes in preparation or
// active) and reactivating it (only with the period not closed). A Professor only reads.
export const Offers = () => {
  const { t } = useTranslation()
  const units = useAcademicUnits()
  const { catalogStatusLabel, catalogStatusTone } = useAcademicLabels(units)
  const periods = useAcademicDirectory(listAcademicPeriods)
  const grades = useAcademicDirectory(listAcademicGrades)
  const stages = useAcademicDirectory(listAcademicStages)
  const subjects = useAcademicDirectory(listAcademicSubjects)

  const [unitId, setUnitId] = useState("")
  const [periodId, setPeriodId] = useState("")
  const [status, setStatus] = useState<"" | AcademicCatalogStatus>("")
  const [page, setPage] = useState(1)
  const [dialog, setDialog] = useState<Dialog>(null)

  const params = useMemo<AcademicOfferSearchParams>(
    () => ({
      page: page - 1,
      periodId: periodId ? Number(periodId) : undefined,
      size: pageSize,
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [page, periodId, status, unitId],
  )

  const { current, reload } = usePeopleList(listAcademicOffers, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = unitId !== "" || periodId !== "" || status !== ""

  const unitName = (id: number) => units.nameOf(id) ?? t("academic.unitNumber", { id })
  const periodName = (id: number) => periods.items.find((period) => period.id === id)?.name ?? ""
  const grade = (id: number) => grades.items.find((item) => item.id === id)
  const stageName = (id?: number) => stages.items.find((stage) => stage.id === id)?.name ?? ""
  const subjectNames = (offer: AcademicOffer) =>
    offer.subjectIds.map((id) => subjects.items.find((subject) => subject.id === id)?.name ?? "").filter(Boolean)
  const offerLabel = (offer: AcademicOffer) =>
    [grade(offer.gradeId)?.name, unitName(offer.unitId), periodName(offer.periodId)].filter(Boolean).join(" · ")

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
    ...statuses.map((value) => ({ label: catalogStatusLabel(value), value })),
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

  const renderActions = (offer: AcademicOffer) => {
    const items: ActionMenuItem[] = []
    if (offer.eligibleActions.includes("EDIT_SUBJECTS")) {
      items.push({
        icon: "book-outline",
        key: "subjects",
        label: t("offers.subjects.action"),
        onClick: () => setDialog({ kind: "subjects", offer }),
      })
    }
    if (offer.eligibleActions.includes("ACTIVATE")) {
      items.push({
        icon: "check-circle-outline",
        key: "activate",
        label: t("academic.catalogStatus.activate.action"),
        onClick: () => setDialog({ kind: "activate", offer }),
      })
    }
    if (offer.eligibleActions.includes("INACTIVATE")) {
      items.push({
        icon: "lock-outline",
        key: "inactivate",
        label: t("academic.catalogStatus.inactivate.action"),
        onClick: () => setDialog({ kind: "inactivate", offer }),
        tone: "danger",
      })
    }
    if (items.length === 0) return null

    return <ActionMenu items={items} triggerLabel={t("offers.actionsFor", { name: offerLabel(offer) })} />
  }

  const renderSubjects = (offer: AcademicOffer) => {
    const names = subjectNames(offer)
    if (names.length === 0) {
      return (
        <Text color="warning" fontSize="sm">
          {t("offers.noSubjects")}
        </Text>
      )
    }
    return <Text fontSize="sm">{names.join(", ")}</Text>
  }

  const newButton = units.canManage ? (
    <Button
      onClick={() => setDialog({ kind: "new" })}
      size="small"
      startIcon={<Icon color="inherit" name="plus" size={16} />}
    >
      {t("offers.new")}
    </Button>
  ) : undefined

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("offers.errorDescription")}
          errorTitle={t("offers.errorTitle")}
          forbiddenDescription={t("offers.forbiddenDescription")}
          forbiddenTitle={t("offers.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters) {
      return (
        <StateMessage
          action={
            units.canManage ? <Button onClick={() => setDialog({ kind: "new" })}>{t("offers.new")}</Button> : undefined
          }
          description={units.canManage ? t("offers.emptyDescription") : t("offers.emptyReadOnly")}
          icon="fact-check-outline"
          title={t("offers.emptyTitle")}
        />
      )
    }

    return (
      <ListContent>
        <FilterBar
          actions={newButton}
          clearLabel={t("userAccess.clearFilters")}
          collapseLabel={t("common.collapseFilters")}
          expandLabel={t("common.expandFilters")}
          hasActiveFilters={hasFilters}
          label={t("offers.filtersLabel")}
          onClear={() => {
            setUnitId("")
            setPeriodId("")
            setStatus("")
            setPage(1)
          }}
          title={t("common.filters")}
        >
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setUnitId)(option?.value ?? "")}
            options={unitOptions}
            placeholder={t("userAccess.allUnits")}
            size="small"
            title={t("offers.unit")}
            value={unitOptions.find((option) => option.value === unitId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setPeriodId)(option?.value ?? "")}
            options={periodOptions}
            placeholder={t("offers.allPeriods")}
            size="small"
            title={t("offers.period")}
            value={periodOptions.find((option) => option.value === periodId) ?? null}
          />
          <Select
            noOptionsMessage={t("common.noOptions")}
            onChange={(option) => changeFilter(setStatus)((option?.value as AcademicCatalogStatus | undefined) ?? "")}
            options={statusOptions}
            placeholder={t("academic.allStatuses")}
            size="small"
            title={t("academic.status")}
            value={statusOptions.find((option) => option.value === status) ?? null}
          />
        </FilterBar>

        <Table
          dataKey="id"
          emptyMessage={t("offers.noResults")}
          loading={!current}
          loadingMessage={t("offers.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: AcademicOffer) => (
              <PersonCell>
                <Text fontSize="sm" semibold>
                  {grade(row.gradeId)?.name ?? ""}
                </Text>
                <Text color="secondary" fontSize="sm">
                  {stageName(grade(row.gradeId)?.stageId)}
                </Text>
              </PersonCell>
            )}
            field="gradeId"
            header={t("offers.grade")}
          />
          <Table.Column
            body={(row: AcademicOffer) => <Text fontSize="sm">{unitName(row.unitId)}</Text>}
            field="unitId"
            header={t("offers.unit")}
          />
          <Table.Column
            body={(row: AcademicOffer) => <Text fontSize="sm">{periodName(row.periodId)}</Text>}
            field="periodId"
            header={t("offers.period")}
          />
          <Table.Column body={renderSubjects} field="subjectIds" header={t("offers.subjectsColumn")} />
          <Table.Column
            body={(row: AcademicOffer) => (
              <Badge tone={catalogStatusTone(row.status)}>{catalogStatusLabel(row.status)}</Badge>
            )}
            field="status"
            header={t("academic.status")}
          />
          <Table.Column align="right" body={renderActions} field="id" header={t("academic.actions")} width="1%" />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("offers.filtersLabel")}
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
        description={t("academic.descriptions.offers")}
        icon="fact-check-outline"
        title={t("shell.nav.offers")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        {renderContent()}
      </Card>

      {dialog?.kind === "new" && (
        <OfferFormModal
          grades={grades.items}
          onClose={() => setDialog(null)}
          onSaved={(offer) => {
            reload()
            // A new offer goes straight on to the subjects it teaches.
            setDialog(offer ? { kind: "subjects", offer } : null)
          }}
          periods={periods.items}
          stages={stages.items}
          units={units}
        />
      )}
      {dialog?.kind === "subjects" && (
        <OfferSubjectsModal
          label={offerLabel(dialog.offer)}
          offer={dialog.offer}
          onClose={() => setDialog(null)}
          onSaved={afterChange}
          subjects={subjects.items}
        />
      )}
      {(dialog?.kind === "activate" || dialog?.kind === "inactivate") && (
        <CatalogStatusDialog
          action={dialog.kind}
          name={offerLabel(dialog.offer)}
          onChanged={afterChange}
          onClose={() => setDialog(null)}
          run={() =>
            dialog.kind === "activate"
              ? activateAcademicOffer(dialog.offer.id, dialog.offer.version)
              : inactivateAcademicOffer(dialog.offer.id, dialog.offer.version)
          }
          units={units}
        />
      )}
    </>
  )
}
