import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import { toast } from "@/components"
import { Badge, type BadgeProps, Button, Text } from "@/ds-components/atoms"
import { Table } from "@/ds-components/organisms"
import { spacing } from "@/foundation"
import { useSignedInUser } from "@/hooks"
import type { LifecycleEvent, LifecycleOutboxItem, LifecycleOutboxStatus } from "@/models"
import { getErrorCode } from "@/services/httpClient"
import { listLifecycleOutbox, reprocessLifecycleEvent, resendLifecycleNotification } from "@/services/lifecycleEvents"
import { hasAnyRole } from "@/utils/access"

import { useEnrollmentLabels } from "../shared/enrollments/useEnrollmentLabels"
import { useLifecycleLabels } from "../shared/enrollments/useLifecycleLabels"
import { PersonBlock } from "../shared/people/PersonBlock"
import { useFailureMessage } from "../shared/people/useFailureMessage"

export type EventFollowUpProps = {
  event: LifecycleEvent
  // A notification was sent again or the event reprocessed: its consequences changed, read it again.
  onChanged: () => void
  // Changes when the event is read again, so the outbox follows.
  refreshKey: string
}

type BadgeTone = NonNullable<BadgeProps["tone"]>

type Loaded = { error: true; key: string } | { items: LifecycleOutboxItem[]; key: string }

// The backend's limit of attempts for a notification sent again by the Secretaria or the Admin.
const resendAttempts = 3

const statusTones: Record<LifecycleOutboxStatus, BadgeTone> = {
  APPLIED: "success",
  FAILED: "danger",
  PENDING: "warning",
}

// What comes after a confirmed event (Fatia H): the projection in the class diary and one notification per
// signer or payer, each with its attempts and the last failure. A notification may be sent again by the
// Secretaria or the Admin (up to 3 attempts, 10 minutes apart; it creates no event), and the Admin
// reprocesses everything not applied, without a limit. The diary stays pending until its module exists,
// never shown as done. Only those who operate the event's units read it.
export const EventFollowUp = (props: EventFollowUpProps) => {
  const { event, onChanged, refreshKey } = props

  const { t } = useTranslation()
  const signedIn = useSignedInUser()
  const { formatMoment } = useEnrollmentLabels()
  const { consumerLabel, deliveryErrorLabel } = useLifecycleLabels()
  const toFailureMessage = useFailureMessage()

  const [loaded, setLoaded] = useState<Loaded | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [busyId, setBusyId] = useState<number | "all" | null>(null)

  const isAdmin = hasAnyRole(signedIn, ["ADMIN"])
  const operates = hasAnyRole(signedIn, ["SECRETARIA"])
  const shown = event.status === "CONFIRMED" && operates
  const key = `${event.id}#${refreshKey}#${reloadToken}`
  const current = loaded?.key === key ? loaded : null
  const items = current && "items" in current ? current.items : []
  const hasOpen = items.some((item) => item.status !== "APPLIED")

  useEffect(() => {
    if (!shown) return

    let isStale = false

    const load = async () => {
      try {
        const read = await listLifecycleOutbox(event.id, { showLoading: false })
        if (!isStale) setLoaded({ items: read, key })
      } catch {
        if (!isStale) setLoaded({ error: true, key })
      }
    }

    void load()

    return () => {
      isStale = true
    }
  }, [event.id, key, shown])

  if (!shown) return null

  const afterChange = () => {
    setReloadToken((value) => value + 1)
    onChanged()
  }

  const resend = async (item: LifecycleOutboxItem) => {
    setBusyId(item.id)
    try {
      await resendLifecycleNotification(event.id, item.id)
      toast.success(t("lifecycle.outbox.resent"))
      afterChange()
    } catch (error) {
      switch (getErrorCode(error)) {
        case "NOTIFICATION_RESEND_LIMIT":
          toast.error(t("lifecycle.outbox.limit"))
          break
        case "NOTIFICATION_RESEND_TOO_SOON":
          toast.error(t("lifecycle.outbox.tooSoon"))
          break
        default:
          toast.error(toFailureMessage(t("lifecycle.outbox.failed"), error))
      }
      setReloadToken((value) => value + 1)
    } finally {
      setBusyId(null)
    }
  }

  const reprocess = async () => {
    setBusyId("all")
    try {
      await reprocessLifecycleEvent(event.id)
      toast.success(t("lifecycle.outbox.reprocessed"))
      afterChange()
    } catch (error) {
      toast.error(toFailureMessage(t("lifecycle.outbox.failed"), error))
    } finally {
      setBusyId(null)
    }
  }

  const whatOf = (item: LifecycleOutboxItem) => (
    <span style={{ display: "flex", flexDirection: "column" }}>
      <Text fontSize="sm">{consumerLabel(item.consumer)}</Text>
      <Text color="secondary" fontSize="xs">
        {t(`lifecycle.outbox.kinds.${item.kind}`)}
      </Text>
    </span>
  )

  const statusOf = (item: LifecycleOutboxItem) => (
    <span style={{ display: "flex", flexDirection: "column", gap: spacing[4] }}>
      <span>
        <Badge tone={statusTones[item.status] ?? "neutral"}>{t(`lifecycle.outbox.statuses.${item.status}`)}</Badge>
      </span>
      {item.lastErrorCode && (
        <Text color="danger" fontSize="xs">
          {deliveryErrorLabel(item.lastErrorCode)}
        </Text>
      )}
      {item.consumer === "DIARY" && item.status === "PENDING" && (
        <Text color="secondary" fontSize="xs">
          {t("lifecycle.outbox.diaryPending")}
        </Text>
      )}
    </span>
  )

  const attemptsOf = (item: LifecycleOutboxItem) => (
    <span style={{ display: "flex", flexDirection: "column" }}>
      <Text fontSize="sm">{t("lifecycle.outbox.attemptsCount", { count: item.attempts })}</Text>
      {item.lastAttemptAt && (
        <Text color="secondary" fontSize="xs">
          {formatMoment(item.lastAttemptAt)}
        </Text>
      )}
    </span>
  )

  const actionsOf = (item: LifecycleOutboxItem) =>
    item.consumer === "NOTIFICATION" && item.attempts < resendAttempts ? (
      <Button disabled={busyId !== null} onClick={() => void resend(item)} size="small" variant="outlined">
        {t("lifecycle.outbox.resend")}
      </Button>
    ) : null

  const renderContent = () => {
    if (current && "error" in current) {
      return (
        <Text color="danger" fontSize="sm" role="alert">
          {t("lifecycle.outbox.loadFailed")}{" "}
          <Button onClick={() => setReloadToken((value) => value + 1)} size="small" variant="link">
            {t("common.tryAgain")}
          </Button>
        </Text>
      )
    }

    return (
      <Table
        dataKey="id"
        emptyMessage={t("lifecycle.outbox.empty")}
        loading={!current}
        loadingMessage={t("lifecycle.outbox.loading")}
        value={items}
      >
        <Table.Column body={whatOf} field="consumer" header={t("lifecycle.outbox.what")} />
        <Table.Column
          body={(item: LifecycleOutboxItem) =>
            item.consumer === "DIARY"
              ? t("lifecycle.outbox.diary")
              : (item.recipientEmail ?? t("lifecycle.outbox.noEmail"))
          }
          field="recipientEmail"
          header={t("lifecycle.outbox.to")}
        />
        <Table.Column body={statusOf} field="status" header={t("lifecycle.outbox.status")} />
        <Table.Column body={attemptsOf} field="attempts" header={t("lifecycle.outbox.attempts")} />
        <Table.Column align="right" body={actionsOf} field="id" header={t("lifecycle.outbox.actions")} width="1%" />
      </Table>
    )
  }

  return (
    <PersonBlock
      action={
        isAdmin && hasOpen ? (
          <Button disabled={busyId !== null} onClick={() => void reprocess()} size="small" variant="outlined">
            {t("lifecycle.outbox.reprocess")}
          </Button>
        ) : undefined
      }
      title={t("lifecycle.outbox.title")}
    >
      <Text color="secondary" fontSize="sm">
        {t("lifecycle.outbox.description")}
      </Text>
      {renderContent()}
    </PersonBlock>
  )
}
