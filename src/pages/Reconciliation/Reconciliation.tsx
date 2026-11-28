import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Card, Icon, Text } from "@/ds-components/atoms"
import type { SelectOption } from "@/ds-components/molecules"
import { PageHeader, Pagination, Select, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog, FilterBar, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { FinanceReceipt, FinanceReceiptSearchParams, FinanceReceiptStatus } from "@/models"
import { listFinanceReceipts, validateFinanceReceipt } from "@/services/financeLedger"
import { getErrorCode } from "@/services/httpClient"
import { formatDate } from "@/utils/dates"

import { useFinanceAccess } from "../shared/finance/useFinanceAccess"
import { useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { PeopleListError } from "../shared/people/PeopleListError"
import { useFailureMessage } from "../shared/people/useFailureMessage"
import { usePeopleList } from "../shared/people/usePeopleList"
import { ListContent, PersonCell } from "../shared/userAccess/userAccess.styles"
import { ReceiptFormModal } from "./ReceiptFormModal"

const pageSize = 20

// The receipts of the units in reach (EPIC 8, Fatia 1), for the Admin and the Financeiro: gross, fee
// (never the student's debt) and net, what was allocated to titles and what is left unallocated (never
// credit, donation or refund by itself). A manual receipt comes in as a report still to be validated
// (it satisfies nothing) or validated at once; a validated one is then allocated from the title's page.
// The provider's receipts and the reconciliation of what doesn't match come in a later slice.
export const Reconciliation = () => {
  const { t } = useTranslation()
  const { operates, units } = useFinanceAccess()
  const { methodLabel, money, receiptStatusLabel, receiptStatusTone } = useFinanceLabels()
  const toFailureMessage = useFailureMessage()

  const [unitId, setUnitId] = useState("")
  const [status, setStatus] = useState<"" | FinanceReceiptStatus>("")
  const [page, setPage] = useState(1)
  const [isRegistering, setIsRegistering] = useState(false)
  const [validating, setValidating] = useState<FinanceReceipt | null>(null)
  const [validateIntent, setValidateIntent] = useState("")
  const [isValidating, setIsValidating] = useState(false)

  const params = useMemo<FinanceReceiptSearchParams>(
    () => ({
      page: page - 1,
      size: pageSize,
      status: status || undefined,
      unitId: unitId ? Number(unitId) : undefined,
    }),
    [page, status, unitId],
  )

  const { current, reload } = usePeopleList(listFinanceReceipts, params)

  const data = current && "data" in current ? current.data : null
  const hasFilters = unitId !== "" || status !== ""
  const unitName = (id: number) => units.find((unit) => unit.id === id)?.name ?? t("finance.unitNumber", { id })
  const unitOptions: SelectOption[] = [
    { label: t("userAccess.allUnits"), value: "" },
    ...units.map((unit) => ({ label: unit.name, value: String(unit.id) })),
  ]
  const statusOptions: SelectOption[] = [
    { label: t("finance.receipts.allStatuses"), value: "" },
    { label: receiptStatusLabel("PENDING"), value: "PENDING" },
    { label: receiptStatusLabel("CONFIRMED"), value: "CONFIRMED" },
  ]

  const changeFilter =
    <T,>(setter: (value: T) => void) =>
    (value: T) => {
      setter(value)
      setPage(1)
    }

  const openValidation = (receipt: FinanceReceipt) => {
    setValidateIntent(crypto.randomUUID())
    setValidating(receipt)
  }

  const validate = async () => {
    if (!validating) return
    setIsValidating(true)
    try {
      await validateFinanceReceipt(validating.id, validateIntent)
      toast.success(t("finance.receipts.validated"))
    } catch (error) {
      if (getErrorCode(error) === "FINANCE_RECEIPT_ALREADY_CONFIRMED")
        toast.info(t("finance.receipts.alreadyValidated"))
      else toast.error(toFailureMessage(t("finance.failed"), error))
    } finally {
      setIsValidating(false)
      setValidating(null)
      reload()
    }
  }

  const newButton = (
    <Button
      onClick={() => setIsRegistering(true)}
      size="small"
      startIcon={<Icon color="inherit" name="plus" size={16} />}
    >
      {t("finance.receipts.new")}
    </Button>
  )

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <PeopleListError
          error={current.error}
          errorDescription={t("finance.receipts.errorDescription")}
          errorTitle={t("finance.receipts.errorTitle")}
          forbiddenDescription={t("finance.forbiddenDescription")}
          forbiddenTitle={t("finance.forbiddenTitle")}
          onRetry={reload}
        />
      )
    }

    if (data && data.totalElements === 0 && !hasFilters) {
      return (
        <StateMessage
          action={operates ? newButton : undefined}
          description={t("finance.receipts.emptyDescription")}
          icon="payments-outline"
          title={t("finance.receipts.emptyTitle")}
        />
      )
    }

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={t("finance.receipts.noResults")}
          loading={!current}
          loadingMessage={t("finance.receipts.loading")}
          value={data?.items ?? []}
        >
          <Table.Column
            body={(row: FinanceReceipt) => (
              <PersonCell>
                <Text fontSize="sm">{formatDate(row.occurredOn)}</Text>
                <Text color="secondary" fontSize="sm">
                  {[methodLabel(row.method), unitName(row.unitId)].join(" · ")}
                </Text>
              </PersonCell>
            )}
            field="occurredOn"
            header={t("finance.receipts.occurredOn")}
          />
          <Table.Column
            body={(row: FinanceReceipt) => (
              <PersonCell>
                <Text fontSize="sm">{money(row.grossCents)}</Text>
                <Text color="secondary" fontSize="sm">
                  {t("finance.receipts.feeAndNet", { fee: money(row.feeCents), net: money(row.netCents) })}
                </Text>
              </PersonCell>
            )}
            field="grossCents"
            header={t("finance.receipts.gross")}
          />
          <Table.Column
            body={(row: FinanceReceipt) => (
              <PersonCell>
                <Text fontSize="sm">{t("finance.receipts.allocated", { amount: money(row.allocatedCents) })}</Text>
                <Text color={row.unallocatedCents > 0 ? "warning" : "secondary"} fontSize="sm">
                  {t("finance.receipts.unallocated", { amount: money(row.unallocatedCents) })}
                </Text>
              </PersonCell>
            )}
            field="unallocatedCents"
            header={t("finance.receipts.allocation")}
          />
          <Table.Column
            body={(row: FinanceReceipt) => (
              <PersonCell>
                <span>
                  <Badge tone={receiptStatusTone(row.status)}>{receiptStatusLabel(row.status)}</Badge>
                </span>
                {row.evidenceNote && (
                  <Text color="secondary" fontSize="sm">
                    {row.evidenceNote}
                  </Text>
                )}
              </PersonCell>
            )}
            field="status"
            header={t("finance.receipts.status")}
          />
          <Table.Column
            align="right"
            body={(row: FinanceReceipt) =>
              operates && row.status === "PENDING" ? (
                <Button
                  aria-label={t("finance.receipts.validateFor", { amount: money(row.grossCents) })}
                  onClick={() => openValidation(row)}
                  size="small"
                  variant="outlined"
                >
                  {t("finance.receipts.validate")}
                </Button>
              ) : null
            }
            field="id"
            header={t("lifecycle.outbox.actions")}
            width="1%"
          />
        </Table>

        {data && data.totalPages > 1 && (
          <Pagination
            label={t("finance.receipts.filtersLabel")}
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
        description={t("finance.receipts.description")}
        icon="compare-outline"
        title={t("shell.nav.reconciliation")}
      />

      <Card elevated style={{ padding: spacing[32] }}>
        <ListContent>
          <FilterBar
            actions={operates ? newButton : undefined}
            clearLabel={t("userAccess.clearFilters")}
            collapseLabel={t("common.collapseFilters")}
            expandLabel={t("common.expandFilters")}
            hasActiveFilters={hasFilters}
            label={t("finance.receipts.filtersLabel")}
            onClear={() => {
              setUnitId("")
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
              title={t("finance.unit")}
              value={unitOptions.find((option) => option.value === unitId) ?? null}
            />
            <Select
              noOptionsMessage={t("common.noOptions")}
              onChange={(option) => changeFilter(setStatus)((option?.value as FinanceReceiptStatus | undefined) ?? "")}
              options={statusOptions}
              placeholder={t("finance.receipts.allStatuses")}
              size="small"
              title={t("finance.receipts.status")}
              value={statusOptions.find((option) => option.value === status) ?? null}
            />
          </FilterBar>

          {renderContent()}
        </ListContent>
      </Card>

      {isRegistering && (
        <ReceiptFormModal
          onClose={() => setIsRegistering(false)}
          onSaved={() => {
            setIsRegistering(false)
            reload()
          }}
        />
      )}
      {validating && (
        <ConfirmDialog
          cancelLabel={t("common.cancel")}
          confirmLabel={t("finance.receipts.validate")}
          description={t("finance.receipts.validateDescription")}
          loading={isValidating}
          onClose={() => setValidating(null)}
          onConfirm={() => void validate()}
          title={t("finance.receipts.validateTitle", { amount: money(validating.grossCents) })}
          open
        />
      )}
    </>
  )
}
