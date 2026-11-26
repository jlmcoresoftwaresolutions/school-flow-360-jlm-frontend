import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { generatePath, Link } from "react-router-dom"

import { Button, Text } from "@/ds-components/atoms"
import { Pagination, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { EnrollmentHistoryEvent, EnrollmentHistoryPage, EnrollmentStatus } from "@/models"
import { paths } from "@/routes/paths"
import { listEnrollmentHistory } from "@/services/enrollments"

import { enrollmentStatuses, useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { eventTypeOfAction, useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PersonBlock } from "../shared/people/PersonBlock"
import { PersonCell } from "../shared/userAccess/userAccess.styles"

export type EnrollmentHistoryProps = {
  enrollmentId: number
  // Changes when the enrollment is read again, so the history follows it.
  refreshKey: number
}

type LoadResult = { error: true; key: string } | { history: EnrollmentHistoryPage; key: string }

const pageSize = 20

const knownFields = ["class", "financial", "guardians", "signatory", "status", "student"] as const
type KnownField = (typeof knownFields)[number]
const isKnownField = (field: string): field is KnownField => (knownFields as readonly string[]).includes(field)

const isEnrollmentStatus = (value: string | null): value is EnrollmentStatus =>
  value !== null && (enrollmentStatuses as string[]).includes(value)

// The enrollment's own history (JLM-381, CT13), newest first: when, what happened, who did it and what it
// touched - only the names of the fields, and the status before and after for a change of status, never
// personal values. It is kept for good, and it isn't the security trail (the Auditoria). The page is
// kept with the enrollment it was read for.
export const EnrollmentHistory = (props: EnrollmentHistoryProps) => {
  const { enrollmentId, refreshKey } = props

  const { t } = useTranslation()
  const { eventLabel, formatMoment, statusLabel } = useEnrollmentLabels()
  const { reasonLabel } = useLifecycleLabels()

  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${enrollmentId}#${page}#${refreshKey}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const history = current && "history" in current ? current.history : null

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loaded = await listEnrollmentHistory(
          enrollmentId,
          { direction: "desc", page: page - 1, size: pageSize },
          { showLoading: false },
        )
        if (!isStale) setResult({ history: loaded, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [enrollmentId, page, requestKey])

  const statusText = (value: string | null) => (isEnrollmentStatus(value) ? statusLabel(value) : (value ?? "—"))

  const renderDetail = (item: EnrollmentHistoryEvent) => {
    if (item.category === "STATUS") {
      return (
        <PersonCell>
          <Text fontSize="sm">
            {t("enrollments.history.statusChange", {
              after: statusText(item.afterValue),
              before: statusText(item.beforeValue),
            })}
          </Text>
          {item.reason && (
            <Text color="secondary" fontSize="sm">
              {t("enrollments.history.reason", { reason: item.reason })}
            </Text>
          )}
        </PersonCell>
      )
    }

    // A lifecycle event prepared or given up on this enrollment: its reason (a code, never free text) and
    // the way to the event (its id, in the after value).
    if (item.category === "LIFECYCLE") {
      const type = eventTypeOfAction(item.action)
      return (
        <PersonCell>
          {item.reason && (
            <Text fontSize="sm">
              {t("enrollments.history.reason", { reason: type ? reasonLabel(type, item.reason) : item.reason })}
            </Text>
          )}
          {item.afterValue && /^\d+$/.test(item.afterValue) && (
            <Text
              as={Link}
              color="brand"
              fontSize="sm"
              to={generatePath(paths.lifecycleEvent, { eventId: item.afterValue })}
              semibold
            >
              {t("lifecycle.openEvent")}
            </Text>
          )}
        </PersonCell>
      )
    }

    const fields = (item.changedFields ?? "").split(",").filter(Boolean)
    if (fields.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          —
        </Text>
      )
    }

    return (
      <Text fontSize="sm">
        {fields.map((field) => (isKnownField(field) ? t(`enrollments.history.fields.${field}`) : field)).join(", ")}
      </Text>
    )
  }

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <StateMessage
          action={
            <Button onClick={() => setReloadToken((value) => value + 1)} size="small">
              {t("common.tryAgain")}
            </Button>
          }
          description={t("enrollments.history.errorDescription")}
          title={t("enrollments.history.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={t("enrollments.history.empty")}
          loading={!current}
          loadingMessage={t("enrollments.history.loading")}
          value={history?.items ?? []}
        >
          <Table.Column
            body={(item: EnrollmentHistoryEvent) => formatMoment(item.occurredAt)}
            field="occurredAt"
            header={t("enrollments.history.when")}
          />
          <Table.Column
            body={(item: EnrollmentHistoryEvent) => (
              <Text fontSize="sm" semibold>
                {eventLabel(item.action)}
              </Text>
            )}
            field="action"
            header={t("enrollments.history.event")}
          />
          <Table.Column
            body={(item: EnrollmentHistoryEvent) => item.actorName ?? t("enrollments.history.system")}
            field="actorName"
            header={t("enrollments.history.actor")}
          />
          <Table.Column body={renderDetail} field="changedFields" header={t("enrollments.history.changes")} />
        </Table>

        {history && history.totalPages > 1 && (
          <Pagination
            label={t("enrollments.history.pagesLabel")}
            nextLabel={t("common.nextPage")}
            onChange={setPage}
            page={page}
            pageLabel={(number) => t("common.pageLabel", { page: number })}
            previousLabel={t("common.previousPage")}
            style={{ alignSelf: "flex-end" }}
            totalPages={history.totalPages}
          />
        )}
      </>
    )
  }

  return (
    <PersonBlock title={t("enrollments.history.title")}>
      <Text color="secondary" fontSize="sm">
        {t("enrollments.history.description")}
      </Text>
      {renderContent()}
    </PersonBlock>
  )
}
