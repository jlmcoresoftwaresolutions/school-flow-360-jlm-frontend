import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, Button, Card, Text } from "@/ds-components/atoms"
import { PageHeader, StateMessage } from "@/ds-components/molecules"
import { ConfirmDialog, Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import type { SessionItem } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { endMySession, listMySessions } from "@/services/me"
import { summarizeUserAgent } from "@/utils/userAgent"

type LoadResult = { sessions: SessionItem[]; token: number } | { failed: true; token: number }

// The signed-in user's own open sessions (matrix ACC-M10, JLM-193): the device each was opened on (the
// browser and the system, from its user agent), when it started and until when it lasts, the current
// one marked. Any other one can be ended - for a device left signed in or not recognized; the current
// one ends with "Sair". At most 5 are open at a time: the sixth sign-in asks to end one (the login's
// own dialog). Never anyone else's sessions.
export const ActiveSessions = () => {
  const { i18n, t } = useTranslation()

  const [reloadToken, setReloadToken] = useState(0)
  const [result, setResult] = useState<LoadResult | null>(null)
  const [ending, setEnding] = useState<SessionItem | null>(null)
  const [isEnding, setIsEnding] = useState(false)

  useEffect(() => {
    let isStale = false

    const load = async () => {
      try {
        const sessions = await listMySessions({ showLoading: false })
        if (!isStale) setResult({ sessions, token: reloadToken })
      } catch {
        if (!isStale) setResult({ failed: true, token: reloadToken })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [reloadToken])

  const reload = useCallback(() => setReloadToken((current) => current + 1), [])

  const current = result?.token === reloadToken ? result : null
  const sessions = current && "sessions" in current ? current.sessions : []

  const describeDevice = (session: SessionItem) => {
    const { browser, system } = summarizeUserAgent(session.userAgent)
    if (browser && system) return t("activeSessions.device", { browser, system })

    return browser ?? system ?? t("activeSessions.unknownDevice")
  }

  const formatDate = (value: string) => {
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ""

    return new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" }).format(date)
  }

  const endSession = async () => {
    if (!ending) return
    setIsEnding(true)

    try {
      await endMySession(ending.id)
      toast.success(t("activeSessions.ended", { device: describeDevice(ending) }))
    } catch (error) {
      if (getErrorCode(error) === "SESSION_NOT_FOUND") toast.info(t("activeSessions.alreadyEnded"))
      else toast.error(t("activeSessions.endFailed"))
    } finally {
      setIsEnding(false)
      setEnding(null)
      reload()
    }
  }

  const renderContent = () => {
    if (current && "failed" in current) {
      return (
        <StateMessage
          action={<Button onClick={reload}>{t("common.tryAgain")}</Button>}
          description={t("activeSessions.errorDescription")}
          title={t("activeSessions.errorTitle")}
          variant="error"
        />
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("activeSessions.empty")}
        loading={!current}
        loadingMessage={t("activeSessions.loading")}
        value={sessions}
      >
        <Table.Column
          body={(session: SessionItem) => (
            <Text fontSize="sm" semibold>
              {describeDevice(session)}
            </Text>
          )}
          field="userAgent"
          header={t("activeSessions.deviceColumn")}
        />
        <Table.Column
          body={(session: SessionItem) => formatDate(session.createdAt)}
          field="createdAt"
          header={t("activeSessions.startedAt")}
        />
        <Table.Column
          body={(session: SessionItem) => formatDate(session.expiresAt)}
          field="expiresAt"
          header={t("activeSessions.expiresAt")}
        />
        <Table.Column
          align="right"
          body={(session: SessionItem) =>
            session.current ? (
              <Badge tone="info">{t("activeSessions.current")}</Badge>
            ) : (
              <Button
                aria-label={t("activeSessions.endLabel", { device: describeDevice(session) })}
                color="danger"
                onClick={() => setEnding(session)}
                size="small"
                variant="outlined"
                style={{ whiteSpace: "nowrap" }}
              >
                {t("activeSessions.end")}
              </Button>
            )
          }
          field="id"
          header={t("activeSessions.actions")}
          width="1%"
        />
      </Table>
    )
  }

  return (
    <>
      <PageHeader
        description={t("activeSessions.description")}
        icon="devices-outline"
        title={t("shell.nav.activeSessions")}
      />

      <Card elevated style={{ display: "flex", flexDirection: "column", gap: spacing[16], padding: spacing[32] }}>
        <Text color="secondary" fontSize="sm">
          {t("activeSessions.limitNotice")}
        </Text>
        {renderContent()}
      </Card>

      <ConfirmDialog
        cancelLabel={t("common.cancel")}
        closeLabel={t("common.close")}
        confirmLabel={t("activeSessions.end")}
        description={ending ? t("activeSessions.endDescription", { device: describeDevice(ending) }) : undefined}
        loading={isEnding}
        onClose={() => setEnding(null)}
        onConfirm={() => void endSession()}
        open={ending !== null}
        title={t("activeSessions.endTitle")}
        tone="danger"
      />
    </>
  )
}
