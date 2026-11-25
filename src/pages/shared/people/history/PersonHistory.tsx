import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { Button, Text } from "@/ds-components/atoms"
import { Pagination, StateMessage } from "@/ds-components/molecules"
import { Table } from "@/ds-components/organisms"
import type { PersonHistoryItem, PersonHistoryPage } from "@/models"
import { getGuardianHistory } from "@/services/guardians"
import { getStudentHistory } from "@/services/students"

import { PersonCell } from "../../userAccess/userAccess.styles"
import { PersonBlock } from "../PersonBlock"
import { isHistoryAction, isHistoryEntity, isHistoryField, readHistoryChanges } from "./historyEvents"

export type PersonHistoryProps = {
  kind: "guardian" | "student"
  personId: number
  // Changes when the profile is read again (after an action), so the history is read again too.
  refreshKey: number
}

type LoadResult = { error: true; key: string } | { history: PersonHistoryPage; key: string }

const pageSize = 20

const hiddenAdminName = "Administracao"

// The registration history of a student or a guardian (P03, Histórico tab), read only: what happened
// (the registration, the changes, the status, the links and the invitations), when, by whom (an Admin
// shows as "Administração" to a Secretaria) and on what. A change names only the fields, never their
// values. It is the person's own history, kept for 5 years, not the security trail, which stays in
// the Auditoria. The page is kept with the person it was read for, so another person's history never
// shows while a new one loads.
export const PersonHistory = (props: PersonHistoryProps) => {
  const { kind, personId, refreshKey } = props

  const { i18n, t } = useTranslation()

  const [page, setPage] = useState(1)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const requestKey = `${kind}#${personId}#${page}#${refreshKey}#${reloadToken}`
  const current = result?.key === requestKey ? result : null
  const history = current && "history" in current ? current.history : null

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const loadHistory = kind === "student" ? getStudentHistory : getGuardianHistory
        const loaded = await loadHistory(personId, { page: page - 1, size: pageSize }, { showLoading: false })
        if (!isStale) setResult({ history: loaded, key: requestKey })
      } catch {
        if (!isStale) setResult({ error: true, key: requestKey })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [kind, page, personId, requestKey])

  const formatWhen = (value: string) =>
    new Intl.DateTimeFormat(i18n.language, { dateStyle: "short", timeStyle: "short" }).format(new Date(value))

  // The backend names an Admin "Administracao" to a Secretaria (who never learns which Admin it was), and no
  // one when the system did it.
  const actorLabel = (actorName: string | null) => {
    if (actorName === hiddenAdminName) return t("personHistory.administration")
    return actorName ?? t("personHistory.system")
  }

  const actionLabel = (action: string) => (isHistoryAction(action) ? t(`personHistory.actions.${action}`) : action)

  const renderEvent = (item: PersonHistoryItem) => {
    const entity = isHistoryEntity(item.entityType)
      ? t(`personHistory.entities.${item.entityType}`, { id: item.entityId ?? "" })
      : null

    return (
      <PersonCell>
        <Text fontSize="sm" semibold>
          {actionLabel(item.action)}
        </Text>
        {entity && (
          <Text color="secondary" fontSize="sm">
            {entity}
          </Text>
        )}
      </PersonCell>
    )
  }

  const renderChanges = (item: PersonHistoryItem) => {
    const changes = readHistoryChanges(item)
    if (changes.length === 0) {
      return (
        <Text color="secondary" fontSize="sm">
          —
        </Text>
      )
    }

    return (
      <Text fontSize="sm">
        {changes.map((field) => (isHistoryField(field) ? t(`personHistory.fields.${field}`) : field)).join(", ")}
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
          description={t("personHistory.errorDescription")}
          title={t("personHistory.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <>
        <Table
          dataKey="id"
          emptyMessage={t("personHistory.empty")}
          loading={!current}
          loadingMessage={t("personHistory.loading")}
          value={history?.items ?? []}
        >
          <Table.Column
            body={(item: PersonHistoryItem) => formatWhen(item.occurredAt)}
            field="occurredAt"
            header={t("personHistory.when")}
          />
          <Table.Column body={renderEvent} field="action" header={t("personHistory.event")} />
          <Table.Column
            body={(item: PersonHistoryItem) => actorLabel(item.actorName)}
            field="actorName"
            header={t("personHistory.actor")}
          />
          <Table.Column body={renderChanges} field="details" header={t("personHistory.changes")} />
        </Table>

        {history && history.totalPages > 1 && (
          <Pagination
            label={t("personHistory.pagesLabel")}
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
    <PersonBlock title={t("personHistory.title")}>
      <Text color="secondary" fontSize="sm">
        {t("personHistory.description")}
      </Text>
      {renderContent()}
    </PersonBlock>
  )
}
