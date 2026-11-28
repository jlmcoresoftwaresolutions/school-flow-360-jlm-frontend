import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Badge, type BadgeProps, Button, Text } from "@/ds-components/atoms"
import { DescriptionList } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type {
  FinanceCutClassification,
  FinanceCutItem,
  FinanceCutReview,
  FinanceLifecycleReview,
  LifecycleEvent,
} from "@/models"
import { getFinanceCancellationReview, getFinanceLifecycleReview } from "@/services/financeLifecycle"
import { hasAnyRole } from "@/utils/access"
import { formatDate } from "@/utils/dates"
import { formatCents } from "@/utils/money"

import { PersonBlock } from "../../shared/people/PersonBlock"
import { CutDecisionDialog } from "./CutDecisionDialog"
import { TransferReviewDialog } from "./TransferReviewDialog"

export type EventFinanceProps = {
  event: LifecycleEvent
  // A decision or a review was recorded: the event's blockers change, read it again.
  onChanged: () => void
  // Changes when the event is read again, so the financial side follows.
  refreshKey: string
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

type Loaded =
  | { cut: FinanceCutReview; key: string }
  | { key: string; review: FinanceLifecycleReview }
  | { key: string; unavailable: true }

const classificationTones: Record<FinanceCutClassification, BadgeTone> = {
  CANCEL: "neutral",
  CANCELLED: "neutral",
  DECISION_REQUIRED: "warning",
  PRESERVE: "info",
  SUBSTITUTED: "neutral",
}

// The financial side of a lifecycle event (EPIC 8, Fatias 2 and 4), for those who read the finance (Admin,
// Financeiro, Secretaria). A cancellation of an enrollment with an obligation shows its cut: what stays
// due, what is cancelled on the confirmation and the installments that cross the cut, each waiting for the
// Financeiro's decision (keep it due; cancelling it is a concession of the Admin, never with a payment on
// it). While one waits, the event is blocked by FINANCIAL_DECISION_PENDING. A transfer, a re-enrollment or a
// lock with an obligation shows what the financial side will do, and a transfer whose price, payer or
// condition changed waits for the Financeiro's review. With no obligation nothing shows: the published "no
// financial effect" rule answers, as the blockers say. A side that can't be read shows nothing assumed.
export const EventFinance = (props: EventFinanceProps) => {
  const { event, onChanged, refreshKey } = props

  const { i18n, t } = useTranslation()
  const signedIn = useSignedInUser()

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [deciding, setDeciding] = useState<FinanceCutItem | null>(null)
  const [isReviewing, setIsReviewing] = useState(false)

  const readsFinance = hasAnyRole(signedIn, ["SECRETARIA", "FINANCEIRO"])
  const operatesFinance = hasAnyRole(signedIn, ["ADMIN", "FINANCEIRO"])
  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const isCancellation = event.eventType === "CANCELLATION"
  const isPrepared = event.status === "PREPARED"
  const key = `${event.id}#${refreshKey}`
  const current = loaded?.key === key ? loaded : null

  useEffect(() => {
    if (!readsFinance) return

    let isStale = false

    const load = async () => {
      try {
        if (isCancellation) {
          const cut = await getFinanceCancellationReview(event.id, { showLoading: false })
          if (!isStale) setLoaded({ cut, key })
        } else {
          const review = await getFinanceLifecycleReview(event.id, { showLoading: false })
          if (!isStale) setLoaded({ key, review })
        }
      } catch {
        if (!isStale) setLoaded({ key, unavailable: true })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [event.id, isCancellation, key, readsFinance])

  if (!readsFinance || !current) return null

  const money = (cents: number) => formatCents(cents, i18n.language)

  const changed = () => {
    setDeciding(null)
    setIsReviewing(false)
    onChanged()
  }

  if ("unavailable" in current) {
    return (
      <PersonBlock title={t("financeLifecycle.title")}>
        <Text color="secondary" fontSize="sm" role="status">
          {t("financeLifecycle.unavailable")}
        </Text>
      </PersonBlock>
    )
  }

  if ("review" in current) {
    const { review } = current
    if (!review.handled) return null
    const canReview =
      isPrepared && operatesFinance && review.blockedCode === "DECISION_PENDING" && event.eventType === "TRANSFER"

    return (
      <PersonBlock
        action={
          canReview ? (
            <Button onClick={() => setIsReviewing(true)} size="small">
              {t("financeLifecycle.review.action")}
            </Button>
          ) : undefined
        }
        title={t("financeLifecycle.title")}
      >
        {review.mode && <Text fontSize="sm">{t(`financeLifecycle.modes.${review.mode}`)}</Text>}
        {review.ready ? (
          <Text color="secondary" fontSize="sm">
            {review.reviewRegistered ? t("financeLifecycle.review.registered") : t("financeLifecycle.ready")}
          </Text>
        ) : (
          <Text color="warning" fontSize="sm" role="note">
            {review.blockedCode === "PLAN_NOT_CHOSEN"
              ? t("financeLifecycle.review.planNotChosen")
              : t("financeLifecycle.review.decisionPending")}
          </Text>
        )}
        {isReviewing && (
          <TransferReviewDialog event={event} onChanged={changed} onClose={() => setIsReviewing(false)} />
        )}
      </PersonBlock>
    )
  }

  const { cut } = current
  if (cut.items.length === 0) return null

  const renderDecision = (item: FinanceCutItem) => {
    if (item.decision) {
      return (
        <span style={{ display: "flex", flexDirection: "column" }}>
          <Text fontSize="sm">{t(`financeLifecycle.cut.outcomes.${item.decision}`)}</Text>
          {item.decisionReason && (
            <Text color="secondary" fontSize="xs">
              {item.decisionReason}
            </Text>
          )}
        </span>
      )
    }
    return item.needsDecision ? (
      <Text color="warning" fontSize="sm">
        {t("financeLifecycle.cut.waiting")}
      </Text>
    ) : null
  }

  const renderActions = (item: FinanceCutItem) =>
    isPrepared && operatesFinance && item.classification === "DECISION_REQUIRED" ? (
      <Button
        aria-label={t("financeLifecycle.cut.decideFor", { number: item.installmentNo })}
        onClick={() => setDeciding(item)}
        size="small"
        variant={item.needsDecision ? "filled" : "outlined"}
      >
        {item.decision ? t("financeLifecycle.cut.redecide") : t("financeLifecycle.cut.decide")}
      </Button>
    ) : null

  return (
    <PersonBlock title={t("financeLifecycle.cut.title")}>
      <Text color="secondary" fontSize="sm">
        {t("financeLifecycle.cut.description")}
      </Text>
      <DescriptionList
        emptyValue={t("common.notInformed")}
        items={[
          { key: "cutDate", label: t("financeLifecycle.cut.cutDate"), value: formatDate(cut.cutDate) },
          {
            key: "preserved",
            label: t("financeLifecycle.cut.preserved"),
            value: t("financeLifecycle.cut.summary", { count: cut.preservedCount, total: money(cut.preservedCents) }),
          },
          {
            key: "toCancel",
            label: t("financeLifecycle.cut.toCancel"),
            value: t("financeLifecycle.cut.summary", { count: cut.toCancelCount, total: money(cut.toCancelCents) }),
          },
          {
            key: "pending",
            label: t("financeLifecycle.cut.pending"),
            value: String(cut.pendingDecisionCount),
          },
        ]}
      />
      {!cut.ready && (
        <Text color="warning" fontSize="sm" role="note">
          {operatesFinance ? t("financeLifecycle.cut.pendingForOperator") : t("financeLifecycle.cut.pendingForReader")}
        </Text>
      )}
      <Table dataKey="titleId" value={cut.items}>
        <Table.Column
          body={(item: FinanceCutItem) => (
            <span style={{ display: "flex", flexDirection: "column" }}>
              <Text fontSize="sm">{t("financeLifecycle.cut.installment", { number: item.installmentNo })}</Text>
              <Text color="secondary" fontSize="xs">
                {t("financeLifecycle.cut.dueOn", { date: formatDate(item.dueDate) })}
              </Text>
            </span>
          )}
          field="installmentNo"
          header={t("financeLifecycle.cut.installmentHeader")}
        />
        <Table.Column
          body={(item: FinanceCutItem) => (
            <span style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
              <Text fontSize="sm">{money(item.amountCents)}</Text>
              <Text color="secondary" fontSize="xs">
                {t("financeLifecycle.cut.paidAndResidual", {
                  paid: money(item.allocatedCents),
                  residual: money(item.residualCents),
                })}
              </Text>
            </span>
          )}
          field="amountCents"
          header={t("financeLifecycle.cut.amount")}
        />
        <Table.Column
          body={(item: FinanceCutItem) => (
            <Badge tone={classificationTones[item.classification] ?? "neutral"}>
              {t(`financeLifecycle.cut.classifications.${item.classification}`)}
            </Badge>
          )}
          field="classification"
          header={t("financeLifecycle.cut.classification")}
        />
        <Table.Column body={renderDecision} field="decision" header={t("financeLifecycle.cut.decision")} />
        <Table.Column
          align="right"
          body={renderActions}
          field="titleId"
          header={t("lifecycle.outbox.actions")}
          width="1%"
        />
      </Table>

      {deciding && (
        <CutDecisionDialog
          canCancel={isAdmin}
          event={event}
          item={deciding}
          onChanged={changed}
          onClose={() => setDeciding(null)}
        />
      )}
    </PersonBlock>
  )
}
