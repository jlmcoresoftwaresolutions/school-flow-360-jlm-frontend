import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link, useParams } from "react-router-dom"

import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import { DescriptionList, PageHeader, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { Enrollment, FinanceAllocation, FinanceTitle, FinanceTitleDetail } from "@/models"
import { pageRoles } from "@/routes/access"
import { paths } from "@/routes/paths"
import { getEnrollment } from "@/services/enrollments"
import { getFinanceTitle } from "@/services/financeLedger"
import { getErrorStatus } from "@/services/httpClient"
import { canOpenPage } from "@/utils/access"
import { formatDate } from "@/utils/dates"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useFinanceAccess } from "../shared/finance/useFinanceAccess"
import { useFinanceLabels } from "../shared/finance/useFinanceLabels"
import { PersonSections, ProfileBar, ProfileBarInfo } from "../shared/people/people.styles"
import { PersonBlock } from "../shared/people/PersonBlock"
import { PersonCell } from "../shared/userAccess/userAccess.styles"
import { AllocateReceiptDialog } from "./AllocateReceiptDialog"
import { ReverseAllocationDialog } from "./ReverseAllocationDialog"

type LoadResult = { detail: FinanceTitleDetail; key: string } | { error: "failed" | "gone"; key: string }

type Dialog = { allocation: FinanceAllocation; kind: "reverse" } | { kind: "allocate" } | null

// What an obligation's origin says: born with the enrollment's confirmation, regularized by hand, or an
// agreement's successor.
const originOf = (originRef: string) => {
  if (originRef.startsWith("AGREEMENT:")) return "AGREEMENT"
  if (originRef.endsWith(":REGULARIZATION")) return "REGULARIZATION"
  if (originRef.endsWith(":CONFIRMATION")) return "CONFIRMATION"
  return "OTHER"
}

// One installment (EPIC 8, Fatia 1): its amounts (value, paid, written off, residual: a write-off is not
// money), its due date and whether it is overdue (a condition of the date), the calculation memory, the
// obligation it belongs to with its other installments, and, for those who read the operations, the
// allocations that paid it. The student and the financial party are named from the enrollment, which the
// finance answers only by id. The Admin and the Financeiro allocate a confirmed receipt to it (with the
// version they reviewed) and compensate an allocation (kept and marked; never a refund).
export const TuitionTitle = () => {
  const { titleId } = useParams()

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { operates, readsOperations } = useFinanceAccess()
  const { competenceLabel, money, situationLabel, situationTone } = useFinanceLabels()
  const { formatMoment } = useEnrollmentLabels()

  const [result, setResult] = useState<LoadResult | null>(null)
  const [enrollment, setEnrollment] = useState<{ enrollment: Enrollment | null; id: number } | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [dialog, setDialog] = useState<Dialog>(null)

  const requestKey = `${titleId}#${reloadToken}`
  // While the same title is read again its last answer stays; another title's never shows.
  const current = result?.key.startsWith(`${titleId}#`) ? result : null
  const detail = current && "detail" in current ? current.detail : null
  const enrollmentId = detail?.obligation.enrollmentId ?? null
  const opensEnrollments = canOpenPage(signedIn, pageRoles.enrollmentProfile)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await getFinanceTitle(Number(titleId))
        if (!isStale) setResult({ detail: loaded, key: requestKey })
      } catch (error) {
        if (!isStale) setResult({ error: getErrorStatus(error) === 404 ? "gone" : "failed", key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [requestKey, titleId])

  // The enrollment names the student and the parties; not reaching it only leaves them as numbers.
  useEffect(() => {
    if (enrollmentId === null) return

    let isStale = false

    const load = async () => {
      try {
        const loaded = await getEnrollment(enrollmentId, { showLoading: false })
        if (!isStale) setEnrollment({ enrollment: loaded, id: enrollmentId })
      } catch {
        if (!isStale) setEnrollment({ enrollment: null, id: enrollmentId })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId])

  const reload = () => {
    setDialog(null)
    setReloadToken((value) => value + 1)
  }

  if (!detail) {
    return (
      <>
        <PageHeader icon="payments-outline" title={t("finance.title.pageTitle")} />
        {current && "error" in current && (
          <Card elevated style={{ padding: spacing[32] }}>
            {current.error === "gone" ? (
              <StateMessage
                action={
                  <Button as={Link} to={paths.tuition}>
                    {t("finance.title.backToList")}
                  </Button>
                }
                description={t("finance.title.goneDescription")}
                icon="payments-outline"
                title={t("finance.title.goneTitle")}
              />
            ) : (
              <StateMessage
                action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
                description={t("finance.title.errorDescription")}
                title={t("finance.title.errorTitle")}
                variant="error"
              />
            )}
          </Card>
        )}
      </>
    )
  }

  const { allocations, obligation, title } = detail
  const known = enrollment?.id === enrollmentId ? enrollment.enrollment : null
  const studentName = known?.student.name ?? t("finance.studentNumber", { id: title.studentId })
  const partyName = (() => {
    if (title.partyPersonId === null) return ""
    if (known?.student.id === title.partyPersonId)
      return t("finance.title.studentIsParty", { name: known.student.name })
    return (
      known?.parties.find((party) => party.guardianId === title.partyPersonId)?.guardianName ??
      t("finance.personNumber", { id: title.partyPersonId })
    )
  })()
  const isLive = title.situation === "OPEN" || title.situation === "PARTIAL"
  const canAllocate = operates && isLive && title.residualCents > 0

  const renderSibling = (row: FinanceTitle) =>
    row.id === title.id ? (
      <Text fontSize="sm" semibold>
        {t("finance.titles.installment", { number: row.installmentNo })}
      </Text>
    ) : (
      <Text as={Link} color="brand" fontSize="sm" to={generatePath(paths.tuitionTitle, { titleId: String(row.id) })}>
        {t("finance.titles.installment", { number: row.installmentNo })}
      </Text>
    )

  return (
    <>
      <PageHeader
        description={t("finance.title.description")}
        icon="payments-outline"
        title={t("finance.title.titleNamed", { name: studentName, number: title.installmentNo })}
      />

      <ProfileBar>
        <ProfileBarInfo>
          <Badge tone={situationTone(title.situation)}>{situationLabel(title.situation)}</Badge>
          {title.overdue && <Badge tone="danger">{t("finance.titles.overdue")}</Badge>}
          <Text color="secondary" fontSize="sm">
            {competenceLabel(title.competence)}
          </Text>
        </ProfileBarInfo>
        {canAllocate && <Button onClick={() => setDialog({ kind: "allocate" })}>{t("finance.allocate.action")}</Button>}
      </ProfileBar>

      <Card elevated style={{ padding: spacing[32] }}>
        <PersonSections>
          <PersonBlock title={t("finance.title.installmentBlock")}>
            <DescriptionList
              emptyValue={t("common.notInformed")}
              items={[
                { key: "due", label: t("finance.titles.dueDate"), value: formatDate(title.dueDate) },
                { key: "amount", label: t("finance.titles.amount"), value: money(title.amountCents) },
                { key: "paid", label: t("finance.title.paid"), value: money(title.allocatedCents) },
                ...(title.writtenOffCents > 0
                  ? [{ key: "writtenOff", label: t("finance.title.writtenOff"), value: money(title.writtenOffCents) }]
                  : []),
                { key: "residual", label: t("finance.title.residual"), value: money(title.residualCents) },
                { key: "party", label: t("finance.title.party"), value: partyName },
                ...(title.calculationMemory
                  ? [
                      {
                        fullWidth: true,
                        key: "memory",
                        label: t("finance.title.calculationMemory"),
                        value: title.calculationMemory,
                      },
                    ]
                  : []),
              ]}
            />
          </PersonBlock>

          <PersonBlock
            action={
              opensEnrollments && enrollmentId !== null ? (
                <Button
                  as={Link}
                  size="small"
                  to={generatePath(paths.enrollmentProfile, { enrollmentId: String(enrollmentId) })}
                  variant="outlined"
                >
                  {t("finance.title.openEnrollment")}
                </Button>
              ) : undefined
            }
            title={t("finance.title.obligationBlock")}
          >
            <DescriptionList
              emptyValue={t("common.notInformed")}
              items={[
                {
                  key: "origin",
                  label: t("finance.title.origin"),
                  value: t(`finance.origins.${originOf(obligation.originRef)}`),
                },
                { key: "total", label: t("finance.title.total"), value: money(obligation.totalCents) },
                ...(obligation.basis
                  ? [{ fullWidth: true, key: "basis", label: t("finance.title.basis"), value: obligation.basis }]
                  : []),
              ]}
            />
            <Table dataKey="id" value={obligation.titles}>
              <Table.Column body={renderSibling} field="installmentNo" header={t("finance.titles.title")} />
              <Table.Column
                body={(row: FinanceTitle) => formatDate(row.dueDate)}
                field="dueDate"
                header={t("finance.titles.dueDate")}
              />
              <Table.Column
                body={(row: FinanceTitle) => money(row.amountCents)}
                field="amountCents"
                header={t("finance.titles.amount")}
              />
              <Table.Column
                body={(row: FinanceTitle) => money(row.residualCents)}
                field="residualCents"
                header={t("finance.title.residual")}
              />
              <Table.Column
                body={(row: FinanceTitle) => (
                  <Badge tone={situationTone(row.situation)}>{situationLabel(row.situation)}</Badge>
                )}
                field="situation"
                header={t("finance.titles.situation")}
              />
            </Table>
          </PersonBlock>

          {readsOperations && (
            <PersonBlock title={t("finance.title.paymentsBlock")}>
              <Table dataKey="id" emptyMessage={t("finance.title.noPayments")} value={allocations}>
                <Table.Column
                  body={(row: FinanceAllocation) => (
                    <PersonCell>
                      <Text fontSize="sm">{money(row.amountCents)}</Text>
                      <Text color="secondary" fontSize="sm">
                        {t("finance.title.receiptNumber", { id: row.receiptId })}
                      </Text>
                    </PersonCell>
                  )}
                  field="amountCents"
                  header={t("finance.titles.amount")}
                />
                <Table.Column
                  body={(row: FinanceAllocation) => formatMoment(row.createdAt)}
                  field="createdAt"
                  header={t("finance.title.allocatedAt")}
                />
                <Table.Column
                  body={(row: FinanceAllocation) => (
                    <PersonCell>
                      <span>
                        <Badge tone={row.status === "APPLIED" ? "success" : "neutral"}>
                          {t(`finance.allocationStatuses.${row.status}`)}
                        </Badge>
                      </span>
                      {row.compensationReason && (
                        <Text color="secondary" fontSize="sm">
                          {row.compensationReason}
                        </Text>
                      )}
                    </PersonCell>
                  )}
                  field="status"
                  header={t("finance.titles.situation")}
                />
                <Table.Column
                  align="right"
                  body={(row: FinanceAllocation) =>
                    operates && row.status === "APPLIED" ? (
                      <Button
                        aria-label={t("finance.reverse.actionFor", { amount: money(row.amountCents) })}
                        onClick={() => setDialog({ allocation: row, kind: "reverse" })}
                        size="small"
                        variant="outlined"
                      >
                        {t("finance.reverse.action")}
                      </Button>
                    ) : null
                  }
                  field="id"
                  header={t("lifecycle.outbox.actions")}
                  width="1%"
                />
              </Table>
            </PersonBlock>
          )}
        </PersonSections>
      </Card>

      {dialog?.kind === "allocate" && (
        <AllocateReceiptDialog onChanged={reload} onClose={() => setDialog(null)} title={title} />
      )}
      {dialog?.kind === "reverse" && (
        <ReverseAllocationDialog allocation={dialog.allocation} onChanged={reload} onClose={() => setDialog(null)} />
      )}
    </>
  )
}
